// A teaching subset of NumPy: n-dimensional arrays of int64, float64 or bool with broadcasting,
// indexing, slices, boolean masks, element-wise arithmetic, ufuncs and reductions. Arrays print
// exactly like NumPy 2 (width padding, 75-character lines, scientific mode).
import type { Value } from '../pythonRuntime'
import { PyModule, PyNative, PyObject, PySlice, PyTuple, arg, bind, floatArg, int, noKeywords, num, pyRound, roundHalfEven, typeLabel, type Arg, type Ctx, type Keywords, type NativeFn } from './values'

export type DType = 'int' | 'float' | 'bool'
const MAX_SIZE = 10000
const dtypeName: Record<DType, string> = { int: 'int64', float: 'float64', bool: 'bool' }

class PyDType extends PyObject {
  readonly typeName = 'numpy.dtype'
  constructor(public dtype: DType) { super() }
  repr() { return `dtype('${dtypeName[this.dtype]}')` }
  str() { return dtypeName[this.dtype] }
}
/** np.int64 / np.float64 / np.bool_ used as dtype= or astype(...) and as converters. */
class PyScalarType extends PyObject {
  readonly typeName = 'type'
  constructor(public dtype: DType) { super() }
  repr() { return `<class 'numpy.${dtypeName[this.dtype]}'>` }
  callable() { return true }
  call(args: Arg[], kw: Keywords, ctx: Ctx): Arg { noKeywords(dtypeName[this.dtype], kw, ctx); const v = num(args[0] ?? arg(0), ctx); return this.dtype === 'float' ? floatArg(v) : this.dtype === 'bool' ? arg(v !== 0) : arg(Math.trunc(v)) }
}

export class NdArray extends PyObject {
  readonly typeName = 'numpy.ndarray'
  constructor(public data: number[], public shape: number[], public dtype: DType) { super() }
  get count() { return this.data.length }
  element(i: number): Arg { const v = this.data[i]; return this.dtype === 'bool' ? arg(v !== 0) : this.dtype === 'float' ? floatArg(v) : arg(v) }
  strides() { const s: number[] = []; let k = 1; for (let i = this.shape.length - 1; i >= 0; i--) { s[i] = k; k *= this.shape[i] } return s }
  /** Sub-array along the first axis (or an element of a 1-D array). */
  row(i: number): Arg {
    if (this.shape.length === 1) return this.element(i)
    const inner = this.shape.slice(1), size = inner.reduce((a, b) => a * b, 1)
    return { value: new NdArray(this.data.slice(i * size, (i + 1) * size), inner, this.dtype) }
  }
  iterate(ctx: Ctx) { if (!this.shape.length) ctx.fail('Нельзя перебрать массив без измерений.'); ctx.tick(Math.ceil(this.shape[0] / 10)); return Array.from({ length: this.shape[0] }, (_, i) => this.row(i)) }
  size() { return this.shape[0] ?? 0 }
  truth(ctx: Ctx) {
    if (this.count === 1) return this.data[0] !== 0
    if (this.count === 0) return false
    return ctx.fail('Нельзя проверить массив из нескольких элементов как одно условие. Используй a.any() или a.all().')
  }
  str(ctx: Ctx) { return formatArray(this, ' ', '', ctx) }
  repr(ctx: Ctx) { return this.count === 0 ? `array([], dtype=${dtypeName[this.dtype]})` : `array(${formatArray(this, ', ', 'array(', ctx)})` }
  abs(ctx: Ctx): Arg { return unary(this, Math.abs, ctx, this.dtype === 'bool' ? 'bool' : this.dtype) }
  getattr(name: string, ctx: Ctx): Arg | undefined {
    if (name === 'shape') return { value: ctx.tuple(this.shape.map(n => arg(n))) }
    if (name === 'size') return arg(this.count)
    if (name === 'ndim') return arg(this.shape.length)
    if (name === 'dtype') return { value: new PyDType(this.dtype) }
    if (name === 'T') return { value: transpose(this, ctx) }
    const method = arrayMethods[name]
    return method ? { value: new PyNative(name, (args, kw, c) => method(this, args, kw, c)) } : undefined
  }
}

// ---------- conversion ----------
const scalarDType = (a: Arg): DType => typeof a.value === 'boolean' ? 'bool' : a.float ? 'float' : 'int'
function promote(a: DType, b: DType): DType { return a === 'float' || b === 'float' ? 'float' : a === 'int' || b === 'int' ? 'int' : 'bool' }
function cast(data: number[], dtype: DType): number[] { return dtype === 'int' ? data.map(Math.trunc) : dtype === 'bool' ? data.map(v => v !== 0 ? 1 : 0) : data }
function parseDType(a: Arg | undefined, ctx: Ctx): DType | undefined {
  if (!a || a.value === null) return undefined
  const v = a.value
  if (v instanceof PyScalarType || v instanceof PyDType) return v.dtype
  if (v instanceof PyObject && 'pythonType' in v) { const t = (v as unknown as { pythonType: string }).pythonType; if (t === 'int' || t === 'float' || t === 'bool') return t }
  if (typeof v === 'string') { const map: Record<string, DType> = { int: 'int', int64: 'int', int32: 'int', float: 'float', float64: 'float', float32: 'float', bool: 'bool' }; if (map[v]) return map[v] }
  return ctx.fail('Тип элементов: int, float или bool (например, dtype=float).')
}
/** np.array(...) from numbers, lists, tuples and arrays (nested lists give more dimensions). */
export function toArray(a: Arg, ctx: Ctx, dtype?: DType): NdArray {
  if (a.value instanceof NdArray) return dtype && dtype !== a.value.dtype ? new NdArray(cast(a.value.data, dtype), a.value.shape, dtype) : a.value
  const data: number[] = []; let shape: number[] | undefined, found: DType = 'bool', empty = true
  const walk = (item: Arg, depth: number, dims: number[]) => {
    ctx.tick()
    const v = item.value
    if (Array.isArray(v) || v instanceof PyTuple || v instanceof NdArray) {
      const items = v instanceof NdArray ? v.iterate(ctx) : ctx.items(v)
      dims = [...dims, items.length]
      if (!items.length) { if (!shape) shape = dims; else if (shape.length !== dims.length) ragged(); return }
      for (const child of items) walk(child, depth + 1, dims)
      return
    }
    if (typeof v !== 'number' && typeof v !== 'boolean') ctx.fail(`Массив numpy в Kodik хранит числа и логические значения, а здесь ${typeLabel(v)}.`)
    if (!shape) shape = dims
    else if (shape.length !== dims.length || shape.some((n, i) => n !== dims[i])) ragged()
    empty = false; found = promote(found, scalarDType(item)); data.push(Number(v))
    if (data.length > MAX_SIZE) ctx.fail(`Массив больше ${MAX_SIZE} элементов.`)
  }
  const ragged = () => ctx.fail('Все вложенные списки массива должны быть одной длины.')
  walk(a, 0, [])
  const type = dtype ?? (empty ? 'float' : found)
  return new NdArray(cast(data, type), shape ?? [], type)
}
const isArrayLike = (v: Value) => v instanceof NdArray || Array.isArray(v) || v instanceof PyTuple
const shapeOf = (a: Arg | undefined, ctx: Ctx): number[] => {
  if (!a) return ctx.fail('Укажи размер массива.')
  const dims = a.value instanceof PyTuple || Array.isArray(a.value) ? ctx.items(a.value).map(item => int(item, ctx, 'размер')) : [int(a, ctx, 'размер')]
  if (dims.some(n => n < 0)) ctx.fail('Размер массива не может быть отрицательным.')
  if (dims.reduce((x, y) => x * y, 1) > MAX_SIZE) ctx.fail(`Массив больше ${MAX_SIZE} элементов.`)
  return dims
}

// ---------- element-wise ----------
function broadcast(a: NdArray, b: NdArray, ctx: Ctx): { shape: number[]; ia: number[]; ib: number[] } {
  const n = Math.max(a.shape.length, b.shape.length), sa = [...Array(n - a.shape.length).fill(1), ...a.shape], sb = [...Array(n - b.shape.length).fill(1), ...b.shape]
  const shape = sa.map((x, i) => x === sb[i] ? x : x === 1 ? sb[i] : sb[i] === 1 ? x : ctx.fail(`Размеры массивов не согласуются: (${a.shape.join(', ')}) и (${b.shape.join(', ')}).`))
  const size = shape.reduce((x, y) => x * y, 1)
  if (size > MAX_SIZE) ctx.fail(`Массив больше ${MAX_SIZE} элементов.`)
  ctx.tick(Math.ceil(size / 20))
  const stride = (s: number[]) => { const r: number[] = []; let k = 1; for (let i = s.length - 1; i >= 0; i--) { r[i] = s[i] === 1 ? 0 : k; k *= s[i] } return r }
  const ta = stride(sa), tb = stride(sb), ia: number[] = [], ib: number[] = []
  for (let flat = 0; flat < size; flat++) {
    let rest = flat, pa = 0, pb = 0
    for (let d = n - 1; d >= 0; d--) { const coord = rest % shape[d]; rest = Math.floor(rest / shape[d]); pa += coord * ta[d]; pb += coord * tb[d] }
    ia.push(pa); ib.push(pb)
  }
  return { shape, ia, ib }
}
const floorDiv = (x: number, y: number) => Math.floor(x / y)
const pyMod = (x: number, y: number) => { const r = x % y; return r !== 0 && (r < 0) !== (y < 0) ? r + y : r }
/** a <op> b where at least one side is an array. Returns an array (comparisons give bool arrays). */
export function arrayBinary(op: string, left: Arg, right: Arg, ctx: Ctx): Arg {
  const a = toArray(left, ctx), b = toArray(right, ctx), { shape, ia, ib } = broadcast(a, b, ctx)
  const compare: Record<string, (x: number, y: number) => boolean> = { '==': (x, y) => x === y, '!=': (x, y) => x !== y, '<': (x, y) => x < y, '<=': (x, y) => x <= y, '>': (x, y) => x > y, '>=': (x, y) => x >= y }
  if (compare[op]) return { value: new NdArray(ia.map((p, i) => compare[op](a.data[p], b.data[ib[i]]) ? 1 : 0), shape, 'bool') }
  let type = promote(a.dtype, b.dtype)
  if (type === 'bool' && (op === '+' || op === '*')) return { value: new NdArray(ia.map((p, i) => op === '+' ? (a.data[p] || b.data[ib[i]] ? 1 : 0) : (a.data[p] && b.data[ib[i]] ? 1 : 0)), shape, 'bool') }
  if (type === 'bool') type = 'int'
  if (op === '/') type = 'float'
  const f: Record<string, (x: number, y: number) => number> = {
    '+': (x, y) => x + y, '-': (x, y) => x - y, '*': (x, y) => x * y, '/': (x, y) => x / y,
    '//': (x, y) => type === 'int' ? (y === 0 ? 0 : floorDiv(x, y)) : floorDiv(x, y),
    '%': (x, y) => type === 'int' ? (y === 0 ? 0 : pyMod(x, y)) : y === 0 ? NaN : pyMod(x, y),
    '**': (x, y) => { if (type === 'int' && y < 0) ctx.fail('Целые числа массива нельзя возводить в отрицательную степень. Сделай массив дробным: a.astype(float).'); return x ** y },
  }
  if (!f[op]) return ctx.fail(`Операция ${op} не поддерживается для массивов.`)
  const data = ia.map((p, i) => f[op](a.data[p], b.data[ib[i]]))
  if (type === 'int' && data.some(v => !Number.isSafeInteger(v))) ctx.fail('Целое число в массиве вышло за пределы учебного диапазона.')
  return { value: new NdArray(data, shape, type) }
}
function unary(a: NdArray, fn: (x: number) => number, ctx: Ctx, type: DType = 'float'): Arg {
  ctx.tick(Math.ceil(a.count / 20))
  return { value: new NdArray(a.data.map(fn), a.shape, type) }
}
export function arrayNegate(a: NdArray, ctx: Ctx): Arg { if (a.dtype === 'bool') ctx.fail('Минус перед логическим массивом не поддерживается.'); return unary(a, x => -x, ctx, a.dtype) }

/** A ufunc: works on arrays, lists and plain numbers (a number gives a number). */
function ufunc(name: string, fn: (x: number) => number, keepInt = false): PyNative {
  return new PyNative(name, (args, kw, ctx) => {
    noKeywords(`numpy.${name}`, kw, ctx)
    if (args.length !== 1) ctx.fail(`numpy.${name}() принимает одно значение.`)
    const a = args[0]
    if (!isArrayLike(a.value)) { const x = num(a, ctx); return keepInt && !a.float ? arg(fn(x)) : floatArg(fn(x)) }
    const array = toArray(a, ctx)
    return unary(array, fn, ctx, keepInt && array.dtype !== 'float' ? (array.dtype === 'bool' ? 'int' : array.dtype) : 'float')
  })
}

// ---------- indexing ----------
type Axis = { kind: 'int'; index: number } | { kind: 'range'; indices: number[] }
function positions(a: NdArray, index: Arg, ctx: Ctx): { flat: number[]; shape: number[] } {
  const v = index.value
  if (v instanceof NdArray && v.dtype === 'bool' || Array.isArray(v) && v.length && v.every(x => typeof x === 'boolean')) {
    const mask = toArray(index, ctx)
    if (mask.shape.length !== a.shape.length || mask.shape.some((n, i) => n !== a.shape[i])) ctx.fail('Маска должна быть того же размера, что и массив.')
    const flat = mask.data.flatMap((m, i) => m ? [i] : []); return { flat, shape: [flat.length] }
  }
  if (v instanceof NdArray || Array.isArray(v)) {
    const picks = toArray(index, ctx)
    if (picks.dtype === 'float') ctx.fail('Индексы массива — целые числа.')
    const rows = picks.data.map(i => normalize(i, a.shape[0], ctx)), inner = a.shape.slice(1), size = inner.reduce((x, y) => x * y, 1)
    return { flat: rows.flatMap(r => Array.from({ length: size }, (_, k) => r * size + k)), shape: [...picks.shape, ...inner] }
  }
  const parts = v instanceof PyTuple ? ctx.items(v) : [index]
  if (parts.length > a.shape.length) ctx.fail(`У массива ${a.shape.length} измерений, а индексов ${parts.length}.`)
  const axes: Axis[] = a.shape.map((length, d) => {
    const part = parts[d]
    if (!part) return { kind: 'range', indices: Array.from({ length }, (_, i) => i) }
    if (part.value instanceof PySlice) return { kind: 'range', indices: part.value.indices(length, ctx) }
    if (typeof part.value === 'number' || typeof part.value === 'boolean') return { kind: 'int', index: normalize(int(part, ctx, 'целый индекс'), length, ctx) }
    return ctx.fail('Индекс массива — целое число, срез start:stop:step или маска.')
  })
  const strides = a.strides(); let flat = [0]
  axes.forEach((axis, d) => { const picks = axis.kind === 'int' ? [axis.index] : axis.indices; flat = flat.flatMap(base => picks.map(i => base + i * strides[d])) })
  return { flat, shape: axes.flatMap(axis => axis.kind === 'range' ? [axis.indices.length] : []) }
}
function normalize(i: number, length: number, ctx: Ctx) { if (i < -length || i >= length) ctx.fail(`Индекс ${i} выходит за границы массива длины ${length}.`); return i < 0 ? i + length : i }
export function arrayGet(a: NdArray, index: Arg, ctx: Ctx): Arg {
  const { flat, shape } = positions(a, index, ctx)
  ctx.tick(Math.ceil(flat.length / 20))
  if (!shape.length) return a.element(flat[0])
  return { value: new NdArray(flat.map(i => a.data[i]), shape, a.dtype) }
}
export function arraySet(a: NdArray, index: Arg, value: Arg, ctx: Ctx) {
  const { flat } = positions(a, index, ctx)
  const source = isArrayLike(value.value) ? toArray(value, ctx).data : [num(value, ctx)]
  if (source.length !== 1 && source.length !== flat.length) ctx.fail(`Нельзя записать ${source.length} значений в ${flat.length} мест массива.`)
  const converted = cast(source, a.dtype)
  flat.forEach((p, i) => { a.data[p] = converted[source.length === 1 ? 0 : i] })
  ctx.tick(Math.ceil(flat.length / 20))
}

// ---------- reductions and methods ----------
function reduce(a: NdArray, axisArg: Arg | undefined, ctx: Ctx, fn: (values: number[]) => number, type: DType): Arg {
  if (!a.count && ['min', 'max'].includes(fn.name)) ctx.fail('Минимум и максимум пустого массива не определены.')
  ctx.tick(Math.ceil(a.count / 20))
  if (!axisArg || axisArg.value === null) { const r = fn(a.data); return type === 'float' ? floatArg(r) : type === 'bool' ? arg(r !== 0) : arg(r) }
  let axis = int(axisArg, ctx, 'номер оси')
  if (axis < 0) axis += a.shape.length
  if (axis < 0 || axis >= a.shape.length) ctx.fail(`У массива нет оси ${axis}.`)
  const strides = a.strides(), outShape = a.shape.filter((_, d) => d !== axis), out: number[] = []
  const outSize = outShape.reduce((x, y) => x * y, 1)
  for (let k = 0; k < outSize; k++) {
    let rest = k, base = 0
    for (let d = a.shape.length - 1; d >= 0; d--) { if (d === axis) continue; const n = a.shape[d], coord = rest % n; rest = Math.floor(rest / n); base += coord * strides[d] }
    out.push(fn(Array.from({ length: a.shape[axis] }, (_, i) => a.data[base + i * strides[axis]])))
  }
  return { value: new NdArray(out, outShape, type) }
}
const sum = (v: number[]) => v.reduce((x, y) => x + y, 0)
const mean = (v: number[]) => v.length ? sum(v) / v.length : NaN
const reducers: Record<string, { fn: (v: number[]) => number; type: (d: DType) => DType }> = {
  sum: { fn: sum, type: d => d === 'float' ? 'float' : 'int' },
  prod: { fn: v => v.reduce((x, y) => x * y, 1), type: d => d === 'float' ? 'float' : 'int' },
  mean: { fn: mean, type: () => 'float' },
  min: { fn: function min(v) { return Math.min(...v) }, type: d => d },
  max: { fn: function max(v) { return Math.max(...v) }, type: d => d },
  std: { fn: v => { const m = mean(v); return Math.sqrt(mean(v.map(x => (x - m) ** 2))) }, type: () => 'float' },
  median: { fn: v => { const s = [...v].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }, type: () => 'float' },
  argmin: { fn: v => v.indexOf(Math.min(...v)), type: () => 'int' },
  argmax: { fn: v => v.indexOf(Math.max(...v)), type: () => 'int' },
  any: { fn: v => v.some(x => x !== 0) ? 1 : 0, type: () => 'bool' },
  all: { fn: v => v.every(x => x !== 0) ? 1 : 0, type: () => 'bool' },
}
const dimsOf = (a: Arg, ctx: Ctx) => a.value instanceof PyTuple || Array.isArray(a.value) ? ctx.items(a.value).map(x => int(x, ctx, 'размер')) : [int(a, ctx, 'размер')]
function reshape(a: NdArray, dims: number[], ctx: Ctx): NdArray {
  const unknown = dims.indexOf(-1), known = dims.filter(n => n !== -1).reduce((x, y) => x * y, 1)
  if (unknown >= 0) dims = dims.map(n => n === -1 ? (known ? a.count / known : 0) : n)
  if (dims.some(n => !Number.isInteger(n) || n < 0) || dims.reduce((x, y) => x * y, 1) !== a.count) ctx.fail(`Нельзя разложить ${a.count} элементов в форму (${dims.join(', ')}).`)
  return new NdArray([...a.data], dims, a.dtype)
}
function transpose(a: NdArray, ctx: Ctx): NdArray {
  if (a.shape.length < 2) return a
  if (a.shape.length > 2) ctx.fail('Транспонирование в Kodik — для двумерных массивов.')
  const [r, c] = a.shape, data: number[] = []
  for (let j = 0; j < c; j++) for (let i = 0; i < r; i++) data.push(a.data[i * c + j])
  return new NdArray(data, [c, r], a.dtype)
}
function toList(a: NdArray, ctx: Ctx): Value[] { return ctx.list(a.iterate(ctx).map(item => item.value instanceof NdArray ? { value: toList(item.value, ctx) } : item)) }
type Method = (a: NdArray, args: Arg[], kw: Keywords, ctx: Ctx) => Arg | void
const reducerMethod = (name: string): Method => (a, args, kw, ctx) => { const { axis } = bind(`${name}`, args, kw, ['axis'], 0, ctx); const r = reducers[name]; return reduce(a, axis, ctx, r.fn, r.type(a.dtype)) }
const arrayMethods: Record<string, Method> = {
  ...Object.fromEntries(Object.keys(reducers).filter(name => name !== 'median').map(name => [name, reducerMethod(name)])),
  reshape: (a, args, kw, ctx) => { noKeywords('reshape', kw, ctx); return { value: reshape(a, args.length === 1 ? dimsOf(args[0], ctx) : args.map(x => int(x, ctx)), ctx) } },
  tolist: (a, args, kw, ctx) => { noKeywords('tolist', kw, ctx); return a.shape.length ? { value: toList(a, ctx) } : a.element(0) },
  copy: a => ({ value: new NdArray([...a.data], [...a.shape], a.dtype) }),
  flatten: a => ({ value: new NdArray([...a.data], [a.count], a.dtype) }),
  astype: (a, args, kw, ctx) => { const { dtype } = bind('astype', args, kw, ['dtype'], 1, ctx); const t = parseDType(dtype, ctx)!; return { value: new NdArray(cast(a.data, t), [...a.shape], t) } },
  round: (a, args, kw, ctx) => { const { decimals } = bind('round', args, kw, ['decimals'], 0, ctx); return roundArray(a, decimals ? int(decimals, ctx) : 0, ctx) },
  sort: (a, args, kw, ctx) => { noKeywords('sort', kw, ctx); if (a.shape.length !== 1) ctx.fail('sort() в Kodik сортирует одномерный массив.'); a.data.sort((x, y) => x - y); ctx.tick(Math.ceil(a.count / 10)) },
  cumsum: (a, args, kw, ctx) => { noKeywords('cumsum', kw, ctx); let s = 0; return { value: new NdArray(a.data.map(v => (s += v)), [a.count], a.dtype === 'float' ? 'float' : 'int') } },
  fill: (a, args, kw, ctx) => { noKeywords('fill', kw, ctx); const v = cast([num(args[0], ctx)], a.dtype)[0]; a.data.fill(v) },
}
function roundArray(a: NdArray, decimals: number, ctx: Ctx): Arg {
  if (a.dtype !== 'float') return { value: decimals >= 0 ? a : new NdArray(a.data.map(v => roundHalfEven(v / 10 ** -decimals) * 10 ** -decimals), a.shape, a.dtype) }
  return unary(a, x => decimals === 0 ? roundHalfEven(x) : pyRound(x, decimals), ctx, 'float')
}

// ---------- printing (numpy.array2string with default options) ----------
function positional(x: number, precision: number): string {
  if (Object.is(x, -0)) return '-0.'
  // Positional mode only holds values in [1e-4, 1e8), where String() gives the shortest digits without an exponent.
  const [whole, frac = ''] = String(x).split('.')
  if (frac.length <= precision) return `${whole}.${frac}`
  const [w, f = ''] = x.toFixed(precision).replace(/0+$/, '').split('.')
  return `${w}.${f}`
}
function scientific(x: number, precision: number): { mantissa: string; exp: string } {
  let s = x.toExponential()
  let [m, e] = s.split('e')
  if ((m.split('.')[1] ?? '').length > precision) { s = x.toExponential(precision); [m, e] = s.split('e'); m = m.replace(/0+$/, '') }
  if (!m.includes('.')) m += '.'
  return { mantissa: m, exp: e }
}
function floatFormatter(values: number[]): (x: number) => string {
  const finite = values.filter(Number.isFinite), nonzero = finite.filter(v => v !== 0).map(Math.abs)
  let exp = false
  if (nonzero.length) { const max = Math.max(...nonzero), min = Math.min(...nonzero); exp = max >= 1e8 || min < 0.0001 || max / min > 1000 }
  let padLeft = 0, padRight = 0, precision = 8, expSize = -1
  if (finite.length && exp) {
    const parts = finite.map(v => scientific(v, 8))
    precision = Math.max(...parts.map(p => p.mantissa.split('.')[1].length))
    expSize = Math.max(...parts.map(p => p.exp.replace(/^[+-]/, '').length), 2)
    padLeft = Math.max(...parts.map(p => p.mantissa.split('.')[0].length))
    padRight = expSize + 2 + precision
  } else if (finite.length) {
    const parts = finite.map(v => positional(v, 8).split('.'))
    padLeft = Math.max(...parts.map(p => p[0].length)); padRight = Math.max(...parts.map(p => p[1].length))
  }
  if (finite.length !== values.length) {
    const neg = values.some(v => v === -Infinity) ? 1 : 0
    padLeft = Math.max(padLeft, 3 - (padRight + 1), 3 + neg - (padRight + 1))
  }
  return x => {
    if (!Number.isFinite(x)) { const s = Number.isNaN(x) ? 'nan' : x > 0 ? 'inf' : '-inf'; return ' '.repeat(Math.max(0, padLeft + padRight + 1 - s.length)) + s }
    if (exp) {
      const { mantissa, exp: e } = scientific(x, precision), [whole, frac] = mantissa.split('.'), sign = e.startsWith('-') ? '-' : '+'
      return whole.padStart(padLeft) + '.' + frac.padEnd(precision, '0') + 'e' + sign + e.replace(/^[+-]/, '').padStart(expSize, '0')
    }
    const [whole, frac] = positional(x, 8).split('.')
    return whole.padStart(padLeft) + '.' + frac.padEnd(padRight)
  }
}
function formatArray(a: NdArray, separator: string, prefix: string, ctx: Ctx): string {
  ctx.tick(Math.ceil(a.count / 10))
  if (!a.shape.length) return a.count ? elementFormatter(a)(a.data[0]) : '[]'
  if (!a.count) return '[]'
  const format = elementFormatter(a), lineWidth = prefix ? 74 : 75, nextPrefix = ' ' + ' '.repeat(prefix.length)
  const recurse = (offset: number, axis: number, hanging: string, width: number): string => {
    const length = a.shape[axis], inner = a.shape.slice(axis + 1).reduce((x, y) => x * y, 1), nextHanging = hanging + ' ', nextWidth = width - 1
    let s = ''
    if (axis === a.shape.length - 1) {
      const elemWidth = width - Math.max(separator.trimEnd().length, 1)
      let line = hanging
      const extend = (word: string) => { if (line.length + word.length > elemWidth && line.length > hanging.length) { s += line.trimEnd() + '\n'; line = hanging } line += word }
      for (let i = 0; i < length; i++) { extend(format(a.data[offset + i])); if (i < length - 1) line += separator }
      s += line
    } else {
      const lineSep = separator.trimEnd() + '\n'.repeat(a.shape.length - axis - 1)
      for (let i = 0; i < length; i++) s += hanging + recurse(offset + i * inner, axis + 1, nextHanging, nextWidth) + (i < length - 1 ? lineSep : '')
    }
    return '[' + s.slice(hanging.length) + ']'
  }
  return recurse(0, 0, nextPrefix, lineWidth)
}
function elementFormatter(a: NdArray): (x: number) => string {
  if (a.dtype === 'bool') return x => x ? ' True' : 'False'
  if (a.dtype === 'int') { const width = Math.max(...a.data.map(v => String(v).length)); return x => String(x).padStart(width) }
  return floatFormatter(a.data)
}

// ---------- module ----------
export function numpyModule(): PyModule {
  const attrs = new Map<string, Arg>()
  const def = (name: string, fn: NativeFn) => attrs.set(name, { value: new PyNative(name, fn) })
  def('array', (args, kw, ctx) => { const { object, dtype } = bind('numpy.array', args, kw, ['object', 'dtype'], 1, ctx); return { value: toArray(object!, ctx, parseDType(dtype, ctx)) } })
  def('asarray', (args, kw, ctx) => { const { a, dtype } = bind('numpy.asarray', args, kw, ['a', 'dtype'], 1, ctx); return { value: toArray(a!, ctx, parseDType(dtype, ctx)) } })
  const filled = (name: string, value: number | null) => def(name, (args, kw, ctx) => {
    const names = value === null ? ['shape', 'fill_value', 'dtype'] : ['shape', 'dtype'], p = bind(`numpy.${name}`, args, kw, names, value === null ? 2 : 1, ctx)
    const dims = shapeOf(p.shape, ctx), fill = value === null ? p.fill_value! : floatArg(value), type = parseDType(p.dtype, ctx) ?? (value === null ? scalarDType(fill) : 'float')
    return { value: new NdArray(cast(Array(dims.reduce((x, y) => x * y, 1)).fill(num(fill, ctx)), type), dims, type) }
  })
  filled('zeros', 0); filled('ones', 1); filled('full', null)
  def('arange', (args, kw, ctx) => {
    const p = bind('numpy.arange', args, kw, ['start', 'stop', 'step', 'dtype'], 1, ctx)
    const hasStop = p.stop && p.stop.value !== null, start = hasStop ? num(p.start, ctx) : 0, stop = hasStop ? num(p.stop, ctx) : num(p.start, ctx), step = p.step ? num(p.step, ctx) : 1
    if (step === 0) ctx.fail('numpy.arange: шаг не может быть нулём.')
    const length = Math.max(0, Math.ceil((stop - start) / step))
    if (length > MAX_SIZE) ctx.fail(`Массив больше ${MAX_SIZE} элементов.`)
    const type = parseDType(p.dtype, ctx) ?? ([p.start, p.stop, p.step].some(x => x?.float) ? 'float' : 'int')
    ctx.tick(Math.ceil(length / 20))
    return { value: new NdArray(cast(Array.from({ length }, (_, i) => start + i * step), type), [length], type) }
  })
  def('linspace', (args, kw, ctx) => {
    const p = bind('numpy.linspace', args, kw, ['start', 'stop', 'num', 'endpoint'], 2, ctx)
    const start = num(p.start, ctx), stop = num(p.stop, ctx), count = p.num ? int(p.num, ctx, 'количество точек') : 50, endpoint = p.endpoint ? ctx.truth(p.endpoint.value) : true
    if (count < 0) ctx.fail('numpy.linspace: количество точек не может быть отрицательным.')
    if (count > MAX_SIZE) ctx.fail(`Массив больше ${MAX_SIZE} элементов.`)
    const div = endpoint ? count - 1 : count, step = div > 0 ? (stop - start) / div : 0
    const data = Array.from({ length: count }, (_, i) => i * step + start)
    if (endpoint && count > 1) data[count - 1] = stop
    ctx.tick(Math.ceil(count / 20))
    return { value: new NdArray(data, [count], 'float') }
  })
  def('reshape', (args, kw, ctx) => { const { a, newshape } = bind('numpy.reshape', args, kw, ['a', 'newshape'], 2, ctx); return { value: reshape(toArray(a!, ctx), dimsOf(newshape!, ctx), ctx) } })
  def('transpose', (args, kw, ctx) => { noKeywords('numpy.transpose', kw, ctx); return { value: transpose(toArray(args[0], ctx), ctx) } })
  def('copy', (args, kw, ctx) => { noKeywords('numpy.copy', kw, ctx); const a = toArray(args[0], ctx); return { value: new NdArray([...a.data], [...a.shape], a.dtype) } })
  def('concatenate', (args, kw, ctx) => {
    noKeywords('numpy.concatenate', kw, ctx)
    const parts = ctx.items(args[0]?.value ?? null, 'numpy.concatenate').map(p => toArray(p, ctx))
    if (parts.some(p => p.shape.length !== 1)) ctx.fail('numpy.concatenate в Kodik соединяет одномерные массивы.')
    const type = parts.reduce<DType>((t, p) => promote(t, p.dtype), 'bool'), data = cast(parts.flatMap(p => p.data), type)
    if (data.length > MAX_SIZE) ctx.fail(`Массив больше ${MAX_SIZE} элементов.`)
    return { value: new NdArray(data, [data.length], type) }
  })
  for (const name of Object.keys(reducers)) def(name, (args, kw, ctx) => { const { a, axis } = bind(`numpy.${name}`, args, kw, ['a', 'axis'], 1, ctx); const array = toArray(a!, ctx), r = reducers[name]; return reduce(array, axis, ctx, r.fn, r.type(array.dtype)) })
  attrs.set('amin', attrs.get('min')!); attrs.set('amax', attrs.get('max')!)
  def('cumsum', (args, kw, ctx) => arrayMethods.cumsum(toArray(args[0], ctx), [], kw, ctx)!)
  def('sort', (args, kw, ctx) => { noKeywords('numpy.sort', kw, ctx); const a = toArray(args[0], ctx), copy = new NdArray([...a.data], [...a.shape], a.dtype); arrayMethods.sort(copy, [], kw, ctx); return { value: copy } })
  def('round', (args, kw, ctx) => { const { a, decimals } = bind('numpy.round', args, kw, ['a', 'decimals'], 1, ctx); if (!isArrayLike(a!.value)) { const x = num(a, ctx), d = decimals ? int(decimals, ctx) : 0; return a!.float ? floatArg(d ? pyRound(x, d) : roundHalfEven(x)) : arg(x) } return roundArray(toArray(a!, ctx), decimals ? int(decimals, ctx) : 0, ctx) })
  attrs.set('around', attrs.get('round')!)
  const ufuncs: [string, (x: number) => number, boolean?][] = [
    ['sqrt', Math.sqrt], ['sin', Math.sin], ['cos', Math.cos], ['tan', Math.tan], ['arcsin', Math.asin], ['arccos', Math.acos], ['arctan', Math.atan],
    ['exp', Math.exp], ['log', Math.log], ['log2', Math.log2], ['log10', Math.log10],
    ['abs', Math.abs, true], ['absolute', Math.abs, true], ['floor', Math.floor, true], ['ceil', Math.ceil, true], ['trunc', Math.trunc, true],
    ['sign', Math.sign, true], ['square', x => x * x, true],
    ['degrees', x => x * (180 / Math.PI)], ['radians', x => x * (Math.PI / 180)], ['rad2deg', x => x * (180 / Math.PI)], ['deg2rad', x => x * (Math.PI / 180)],
  ]
  for (const [name, fn, keep] of ufuncs) attrs.set(name, { value: ufunc(name, fn, keep) })
  const binaryFn = (name: string, op: string) => def(name, (args, kw, ctx) => { noKeywords(`numpy.${name}`, kw, ctx); if (args.length !== 2) ctx.fail(`numpy.${name}() принимает два значения.`); return arrayBinary(op, args[0], args[1], ctx) })
  binaryFn('add', '+'); binaryFn('subtract', '-'); binaryFn('multiply', '*'); binaryFn('divide', '/'); binaryFn('power', '**'); binaryFn('mod', '%')
  attrs.set('pow', attrs.get('power')!)
  def('dot', (args, kw, ctx) => {
    noKeywords('numpy.dot', kw, ctx); const a = toArray(args[0], ctx), b = toArray(args[1], ctx)
    if (a.shape.length !== 1 || b.shape.length !== 1 || a.count !== b.count) ctx.fail('numpy.dot в Kodik — скалярное произведение двух одномерных массивов одной длины.')
    const r = a.data.reduce((s, v, i) => s + v * b.data[i], 0); return promote(a.dtype, b.dtype) === 'float' ? floatArg(r) : arg(r)
  })
  attrs.set('pi', floatArg(Math.PI)); attrs.set('e', floatArg(Math.E)); attrs.set('inf', floatArg(Infinity)); attrs.set('nan', floatArg(NaN))
  attrs.set('int64', { value: new PyScalarType('int') }); attrs.set('float64', { value: new PyScalarType('float') }); attrs.set('bool_', { value: new PyScalarType('bool') })
  attrs.set('ndarray', { value: new PyNative('ndarray', (args, kw, ctx) => ctx.fail('Создавай массивы через numpy.array(...), numpy.zeros(...) или numpy.arange(...).')) })
  attrs.set('random', { value: new PyModule('numpy.random', new Map(['rand', 'randint', 'random', 'seed', 'choice', 'normal'].map(name => [name, { value: new PyNative(name, (args, kw, ctx) => ctx.fail('numpy.random в Kodik не поддерживается. Для случайных чисел используй модуль random.')) }]))) })
  // `from numpy import *` brings these names, as in NumPy (it also replaces sum, min, max, abs, round, pow).
  const exports = [...attrs.keys()].filter(name => !['random', 'ndarray'].includes(name))
  return new PyModule('numpy', attrs, exports)
}
export const numpyValue = (v: Value): v is NdArray => v instanceof NdArray
