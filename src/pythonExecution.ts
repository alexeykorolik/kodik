import { parseCourseProgram, type Expr, type Statement, type Value, type CourseRun, type Segment } from './pythonRuntime'
import { PyNative, PyObject, PyModule, PySlice, PyTuple, type Arg, type Ctx, type Keywords } from './python/values'
import { SceneBuilder } from './python/scene'
import { NdArray, arrayBinary, arrayGet, arraySet, arrayNegate } from './python/libNumpy'
import { builtinNatives } from './python/libBasic'
import { moduleLoader } from './python/modules'

export type PythonNode = Expr | Statement
type Tracked = { value: Value; trail: Set<PythonNode>; float?: boolean }
type Scope = Map<string, Tracked>
const fail = (message: string): never => { throw new Error(message) }
const number = (v: Value): number => typeof v === 'boolean' ? Number(v) : typeof v === 'number' && Number.isFinite(v) ? v : fail('Здесь нужно число. Проверь кавычки и преобразование ввода через int.')
const equal = (a: Value,b: Value): boolean => {
  if(a===b)return true
  if((typeof a==='number'||typeof a==='boolean')&&(typeof b==='number'||typeof b==='boolean'))return Number(a)===Number(b)
  if(a instanceof PyTuple&&b instanceof PyTuple&&!(a instanceof NdArray))return a.items.length===b.items.length&&a.items.every((v,i)=>equal(v,b.items[i]))
  return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]))
}
const list = (v: Value): Value[] => Array.isArray(v) ? v : fail('Здесь нужен список.')
class ReturnSignal { constructor(public result: Tracked) {} }
/** int, float, str and bool used as values (dtype=float, astype(int), print(int)). */
class PyType extends PyNative { constructor(name: string, fn: PyNative['fn'], public pythonType = name) { super(name, fn) } repr() { return `<class '${this.pythonType}'>` } }
const legacyBuiltins = new Set(['print', 'input', 'int', 'str', 'len', 'range', 'forward', 'right', 'left'])
const listMethods = new Set(['append', 'extend', 'insert', 'pop', 'remove', 'index', 'count', 'reverse', 'sort', 'copy', 'clear'])
const mutating = new Set(['append', 'extend', 'insert', 'pop', 'remove', 'reverse', 'sort', 'clear'])

export type RunOptions = { /** Robot field of the task (text, see python/robotWorld.ts). */ world?: string }
export type PythonRun = CourseRun & { observed: Set<PythonNode>; reassigned: Set<Statement> }
// Trails track dependencies reaching an observable result, including control
// flow and return values. Dead calculations and overwritten values give no evidence.
export function runPythonAst(program: Statement[], inputs: string[] = [], options: RunOptions = {}): PythonRun {
  const output: string[] = [], segments: Segment[] = [], observed = new Set<PythonNode>(), reassigned = new Set<Statement>()
  let operations = 0, inputCursor = 0, x = 0, y = 0, heading = 0
  // A program that imports libraries (graphics, arrays) gets a larger budget; older programs keep theirs.
  let operationLimit = 10000
  let pendingOutput = ''
  const clock = { now: 0, sleep(ms: number) { this.now += ms } }, outputTimes: number[] = []
  const write = (text: string) => {
    pendingOutput += text
    if(pendingOutput.length+output.reduce((n,line)=>n+line.length,0)>100000)fail('Слишком много вывода.')
    let newline: number
    while((newline=pendingOutput.indexOf('\n'))>=0){if(output.length>=500)fail('Слишком много строк вывода.');output.push(pendingOutput.slice(0,newline));outputTimes.push(clock.now);pendingOutput=pendingOutput.slice(newline+1)}
  }
  const flushOutput = () => {if(pendingOutput){output.push(pendingOutput);outputTimes.push(clock.now);pendingOutput=''}}
  const drawingTrail = new Set<PythonNode>()
  const globals: Scope = new Map(), functions = new Map<string, Extract<Statement, { kind: 'function' }>>()
  const floats = new WeakMap<Value[], Set<number>>()
  const localNames = new WeakMap<Scope, Set<string>>()
  globals.set('__name__', { value: '__main__', trail: new Set() })
  const display = (v: Value, floating = false, seen = new Set<Value[]>(), repr = false): string => {
    tick()
    if (Array.isArray(v)) {
      if (seen.has(v)) return '[...]'
      const nested = new Set([...seen, v])
      return `[${v.map((item, i) => display(item, floats.get(v)?.has(i), nested, true)).join(', ')}]`
    }
    if (v instanceof PyTuple && v.constructor === PyTuple) {
      const parts = v.items.map((item, i) => display(item, floats.get(v.items)?.has(i), seen, true))
      return parts.length === 1 ? `(${parts[0]},)` : `(${parts.join(', ')})`
    }
    if (v instanceof PyObject) return repr ? v.repr(ctx) : v.str(ctx)
    if (typeof v === 'string' && repr) {
      const quote = v.includes("'") && !v.includes('"') ? '"' : "'"
      return quote + Array.from(v).map(char=>{
        if(char==='\\'||char===quote)return '\\'+char
        if(char==='\n')return '\\n';if(char==='\r')return '\\r';if(char==='\t')return '\\t'
        if(char!==' '&&/[\p{C}\p{Z}]/u.test(char)){const point=char.codePointAt(0)!;return point<=255?'\\x'+point.toString(16).padStart(2,'0'):point<=65535?'\\u'+point.toString(16).padStart(4,'0'):'\\U'+point.toString(16).padStart(8,'0')}
        return char
      }).join('') + quote
    }
    if (typeof v === 'number' && floating) {
      if (Number.isNaN(v)) return 'nan'
      if (!Number.isFinite(v)) return v > 0 ? 'inf' : '-inf'
      if (Object.is(v, -0)) return '-0.0'
      if (v !== 0 && (Math.abs(v) < 1e-4 || Math.abs(v) >= 1e16)) return v.toExponential().replace(/e([+-])(\d)$/, 'e$10$2')
      return Number.isInteger(v) ? `${v}.0` : String(v)
    }
    return typeof v === 'boolean' ? v ? 'True' : 'False' : v === null ? 'None' : String(v)
  }
  const truth = (v: Value): boolean => Array.isArray(v) ? v.length > 0 : v instanceof PyObject ? v.truth(ctx) : Boolean(v)
  const compare = (a: Value, b: Value, operator: string): boolean => {
    if (a instanceof NdArray || b instanceof NdArray) fail('Сравнение массивов numpy в цепочке не поддерживается. Сравни по одному: a > 1.')
    if (operator === '==') return equal(a,b)
    if (operator === '!=') return !equal(a,b)
    let order: number
    if ((typeof a==='number'||typeof a==='boolean') && (typeof b==='number'||typeof b==='boolean')) order=Number(a)-Number(b)
    else if(typeof a==='string'&&typeof b==='string') {
      const lhs=Array.from(a),rhs=Array.from(b),index=lhs.findIndex((char,i)=>char!==rhs[i])
      order=index<0?lhs.length-rhs.length:index>=rhs.length?1:lhs[index].codePointAt(0)!-rhs[index].codePointAt(0)!
    } else return fail('Сравнивай два числа или две строки.')
    return operator==='<'?order<0:operator==='<='?order<=0:operator==='>'?order>0:order>=0
  }
  const tick = (count = 1) => { operations += count; if (operations > operationLimit) fail('Программа выполняется слишком долго. Проверь условие окончания цикла.') }
  const track = (value: Value, node: PythonNode, values: Tracked[] = [], control: Set<PythonNode> = new Set()): Tracked => ({ value, trail: new Set([node, ...control, ...values.flatMap(item => [...item.trail])]) })
  const observe = (result: Tracked) => { for (const node of result.trail) observed.add(node) }
  const lookup = (name: string, scope: Scope): Tracked | undefined => scope.get(name) || (!localNames.get(scope)?.has(name) ? globals.get(name) : undefined)
  /** Items of an iterable with their int/float distinction. */
  const items = (v: Value, what = 'Здесь'): Arg[] => {
    if (typeof v === 'string') return Array.from(v).map(value => ({ value }))
    if (Array.isArray(v)) return v.map((value, i) => ({ value, float: floats.get(v)?.has(i) }))
    if (v instanceof PyTuple && v.constructor === PyTuple) return v.items.map((value, i) => ({ value, float: floats.get(v.items)?.has(i) }))
    const result = v instanceof PyObject ? v.iterate(ctx) : undefined
    return result ?? fail(`${what} нужен список, кортеж, строка или массив.`)
  }
  const makeList = (args: Arg[]): Value[] => {
    if (args.length > 10000) fail('Список слишком длинный.')
    const values = args.map(a => a.value); floats.set(values, new Set(args.flatMap((a, i) => a.float ? [i] : []))); return values
  }
  const makeTuple = (args: Arg[]) => new PyTuple(makeList(args))
  const scene = new SceneBuilder()
  let current = { depth: 0, control: new Set<PythonNode>() }
  const ctx: Ctx = {
    fail, tick, truth, compare,
    str: a => display(a.value, a.float), repr: a => display(a.value, a.float, new Set(), true),
    items: (v, what) => items(v, what), list: makeList, tuple: makeTuple,
    replace: (target, values) => { target.splice(0, target.length, ...values.map(a => a.value)); floats.set(target, new Set(values.flatMap((a, i) => a.float ? [i] : []))) },
    clock, scene, world: options.world, state: new Map(),
    callUser: name => {
      const fn = functions.get(name) ?? fail(`Функция «${name}» не найдена.`)
      callFunction(fn, [], { kind: 'call', name, args: [] }, current.depth, current.control)
    },
  }
  const loadModule = moduleLoader(ctx)
  const natives = builtinNatives()
  const typeValue = (name: string): PyNative | undefined => {
    if (name === 'float' || name === 'bool') return new PyType(name, natives.get(name)!.fn)
    if (name === 'int' || name === 'str') return new PyType(name, (args, kw) => {
      if (kw.size) fail(`У ${name}() нет именованных аргументов.`)
      return callLegacy(name, args.map(a => ({ ...a, trail: new Set<PythonNode>() })), new Map(), { kind: 'call', name, args: [] }, new Set())
    })
    if (['print', 'input', 'len', 'range'].includes(name)) return new PyNative(name, (args, kw) => callLegacy(name, args.map(a => ({ ...a, trail: new Set<PythonNode>() })), new Map([...kw].map(([k, v]) => [k, { ...v, trail: new Set<PythonNode>() }])), { kind: 'call', name, args: [] }, new Set()))
    return natives.get(name)
  }
  natives.set('bool', new PyNative('bool', (args, kw) => { if (kw.size || args.length > 1) fail('bool() принимает одно значение.'); return { value: args.length ? truth(args[0].value) : false } }))
  const loaded = (name: string) => { operationLimit = 100000; return loadModule(name) }

  const sliceOf = (v: Value, s: PySlice): Arg => {
    if (typeof v === 'string') { const chars = Array.from(v); return { value: s.indices(chars.length, ctx).map(i => chars[i]).join('') } }
    const source = v instanceof PyTuple ? items(v) : items(list(v))
    const picked = s.indices(source.length, ctx).map(i => source[i])
    tick(Math.ceil(picked.length / 20))
    return { value: v instanceof PyTuple ? makeTuple(picked) : makeList(picked) }
  }
  const listMethod = (target: Value[], name: string): PyNative => new PyNative(name, (args, kw): Arg | void => {
    if (kw.size && !(name === 'sort' && [...kw.keys()].every(k => k === 'reverse'))) fail(`У ${name}() нет таких именованных аргументов.`)
    const meta = floats.get(target) || new Set<number>(), current = items(target)
    const arity = (min: number, max = min) => { if (args.length < min || args.length > max) fail(`${name}() принимает ${min === max ? min : `от ${min} до ${max}`} значений.`) }
    const set = (next: Arg[]) => { if (next.length > 1000) fail('Список слишком длинный.'); ctx.replace(target, next) }
    switch (name) {
      case 'append': arity(1); set([...current, args[0]]); return
      case 'extend': arity(1); set([...current, ...items(args[0].value, 'В extend')]); return
      case 'insert': { arity(2); const i = number(args[0].value), at = i < 0 ? Math.max(0, current.length + i) : Math.min(i, current.length); current.splice(at, 0, args[1]); set(current); return }
      case 'pop': { arity(0, 1); if (!current.length) fail('pop(): список пуст.'); const i = args.length ? number(args[0].value) : -1; if (i < -current.length || i >= current.length) fail('pop(): такого индекса в списке нет.'); const [removed] = current.splice(i < 0 ? current.length + i : i, 1); set(current); return removed }
      case 'remove': { arity(1); const i = current.findIndex(a => equal(a.value, args[0].value)); if (i < 0) fail('remove(): такого значения в списке нет.'); current.splice(i, 1); set(current); return }
      case 'index': { arity(1); const i = current.findIndex(a => equal(a.value, args[0].value)); if (i < 0) fail(`index(): значения ${display(args[0].value, args[0].float, new Set(), true)} нет в списке.`); return { value: i } }
      case 'count': arity(1); return { value: current.filter(a => equal(a.value, args[0].value)).length }
      case 'reverse': arity(0); set(current.reverse()); return
      case 'sort': { arity(0); const reverse = kw.get('reverse'); current.sort((a, b) => { tick(); return compare(a.value, b.value, '<') ? -1 : compare(b.value, a.value, '<') ? 1 : 0 }); if (reverse && truth(reverse.value)) current.reverse(); set(current); return }
      case 'copy': arity(0); return { value: makeList(current) }
      case 'clear': arity(0); set([]); return
    }
    void meta
  })
  const attribute = (v: Value, name: string): Arg => {
    const result = v instanceof PyObject ? v.getattr(name, ctx) : Array.isArray(v) && listMethods.has(name) ? { value: listMethod(v, name) } : undefined
    if (result) return result
    if (v instanceof PyModule) return fail(`В модуле «${v.name}» нет «${name}». Проверь название в справке по библиотекам.`)
    if (typeof v === 'string') return fail(`Методы строк (например, .${name}()) в Kodik пока не поддерживаются.`)
    if (Array.isArray(v)) return fail(`У списка нет метода «${name}». Доступны: ${[...listMethods].join(', ')}.`)
    return fail(`У значения ${v === null ? 'None' : v instanceof PyObject ? `типа ${v.typeName}` : typeof v === 'number' ? 'числа' : 'этого типа'} нет «${name}».`)
  }
  const invoke = (callee: Tracked, args: Tracked[], kw: Map<string, Tracked>, node: Extract<Expr, { kind: 'call' }>, depth: number, control: Set<PythonNode>): Tracked => {
    const target = callee.value
    if (!(target instanceof PyObject) || !target.callable()) return fail(`Значение «${node.name}» нельзя вызвать как функцию.`)
    const saved = current; current = { depth, control }
    let result: Arg | void
    try { result = target.call(args, kw as Keywords, ctx) } finally { current = saved }
    const out = result ?? { value: null }
    const tracked = { ...track(out.value, node, [callee, ...args, ...kw.values()], control), float: typeof out.value === 'number' && !!out.float }
    if (target instanceof PyNative && target.effect) { for (const part of tracked.trail) drawingTrail.add(part); observe({ value: null, trail: drawingTrail }) }
    return tracked
  }
  const callLegacy = (name: string, args: Tracked[], kw: Map<string, Tracked>, node: Extract<Expr, { kind: 'call' }>, control: Set<PythonNode>): Tracked => {
    const done = (value: Value, children: Tracked[] = [], floating = false): Tracked => ({...track(value, node, children, control), float:typeof value==='number'&&floating})
    const values = args.map(arg => arg.value)
    if (name === 'print') {
      for (const key of kw.keys()) if (!['sep', 'end', 'flush'].includes(key)) fail(`У print() нет аргумента «${key}»${key === 'file' ? ': вывод в файлы в Kodik не поддерживается' : ''}.`)
      const option = (key: string, fallback: string) => { const v = kw.get(key)?.value; if (v === undefined || v === null) return fallback; return typeof v === 'string' ? v : fail(`${key} в print() — строка в кавычках.`) }
      write(args.map(arg=>display(arg.value,arg.float)).join(option('sep', ' '))+option('end', '\n')); const all = [...args, ...kw.values()]; observe(done(null, all)); return done(null, all)
    }
    if (kw.size) fail(`У ${name}() нет именованных аргументов.`)
    if (name === 'input') { if (args.length > 1) fail('В input достаточно одной подсказки.'); if(args.length){write(display(values[0],args[0].float));observe(done(null,args))} if (inputCursor >= inputs.length) fail('Проверь количество команд input: для этого задания ввод уже закончился.'); return done(inputs[inputCursor++], args) }
    if (['int', 'str', 'len'].includes(name)) {
      if (args.length===0&&name!=='len')return done(name==='int'?0:'',args)
      if (args.length !== 1) fail(`${name} принимает одно значение.`)
      if (name === 'str') return done(display(values[0],args[0].float), args)
      if (name === 'len') { const v = values[0]; if (v instanceof PyObject) { const size = v.size(); if (size === undefined) fail(`У значения типа ${v.typeName} нет длины.`); return done(size!, args) } return done(typeof v==='string'?Array.from(v).length:list(v).length, args) }
      const source=values[0]
      if(typeof source==='string'&&!/^[+-]?\d(?:_?\d)*$/.test(source.trim()))fail('Не удалось превратить ввод в целое число. Проверь int(input()).')
      if(typeof source!=='number'&&typeof source!=='boolean'&&typeof source!=='string')fail('В int передай число или строку с целым числом.')
      const value = Math.trunc(typeof source==='string'?Number(source.trim().replace(/_/g,'')):Number(source)); if (!Number.isFinite(value)||!Number.isSafeInteger(value)) fail('Число выходит за пределы учебного диапазона.'); return done(value, args)
    }
    if (name === 'range') {
      if (args.length < 1 || args.length > 3) fail('У range нужны границы диапазона и, если нужно, шаг.')
      const numbers = values.map(number), start = numbers.length === 1 ? 0 : numbers[0], end = numbers.length === 1 ? numbers[0] : numbers[1], step = numbers[2] ?? 1
      if (args.some(arg=>arg.float) || ![start, end, step].every(Number.isInteger) || step === 0) fail('В range используй целые числа и ненулевой шаг.')
      const result: Value[] = []
      for (let current = start; step > 0 ? current < end : current > end; current += step) { if (result.length >= 1000) fail('Диапазон слишком длинный. Проверь границы range.'); result.push(current) }
      return done(result, args)
    }
    // forward / right / left without an import: the course's simple drawing (no turtle module).
    if (args.length !== 1) fail('Для движения или поворота укажи одно число.')
    const amount = number(values[0]); if (Math.abs(amount) > 10000) fail('Шаг или поворот слишком велик. Проверь число.')
    if (name === 'forward') { if (segments.length >= 500) fail('Слишком много линий. Проверь число повторений.'); const nextX = x + Math.cos(heading * Math.PI / 180) * amount, nextY = y + Math.sin(heading * Math.PI / 180) * amount; segments.push({ x1: x, y1: y, x2: nextX, y2: nextY }); x = nextX; y = nextY }
    else heading += name === 'left' ? amount : -amount
    const result = done(null, args); for (const part of result.trail) drawingTrail.add(part); if (name === "forward") observe({ value: null, trail: drawingTrail }); return result
  }
  const collectLocals = (fn: Extract<Statement, { kind: 'function' }>) => {
    const names = new Set(fn.params)
    const collect = (body: Statement[]) => { for (const item of body) {
      if (item.kind === 'assign' && !item.index || item.kind === 'for') names.add(item.name)
      if (item.kind === 'unpack') item.names.forEach(name => names.add(name))
      if (item.kind === 'import') item.modules.forEach(m => names.add(m.alias ?? m.name.split('.')[0]))
      if (item.kind === 'from' && !item.star) item.names.forEach(n => names.add(n.alias ?? n.name))
      if (item.kind === 'for' || item.kind === 'while') collect(item.body)
      if (item.kind === 'if') { item.branches.forEach(branch => collect(branch.body)); collect(item.otherwise) }
    } }
    collect(fn.body); return names
  }
  const callFunction = (fn: Extract<Statement, { kind: 'function' }>, args: Tracked[], node: Extract<Expr, { kind: 'call' }>, depth: number, control: Set<PythonNode>): Tracked => {
    if (fn.params.length !== args.length) fail(`Эта функция принимает ${fn.params.length} аргументов. Проверь вызов и строку def.`)
    if (depth >= 40) fail('Функция вызывает себя слишком много раз. Проверь условие остановки.')
    const local: Scope = new Map(fn.params.map((name, index) => [name, args[index]])), inside = new Set([...control, node, fn])
    localNames.set(local, collectLocals(fn))
    try { execute(fn.body, local, depth + 1, inside) } catch (signal) { if (signal instanceof ReturnSignal) return {...track(signal.result.value, node, [signal.result, ...args], control), float: typeof signal.result.value==='number'&&!!signal.result.float}; throw signal }
    return track(null, fn, args, inside)
  }
  const evaluate = (node: Expr, scope: Scope, depth: number, control: Set<PythonNode>): Tracked => {
    tick()
    const done = (value: Value, children: Tracked[] = [], floating = false): Tracked => ({...track(value, node, children, control), float:typeof value==='number'&&floating})
    if (node.kind === 'literal') return done(node.value, [], node.float)
    if (node.kind === 'name') {
      const value = lookup(node.name, scope)
      if (value) return done(value.value, [value], value.float)
      const builtin = typeValue(node.name)
      if (builtin) return done(builtin)
      return fail(`Сначала задай значение переменной «${node.name}».`)
    }
    if (node.kind === 'list') { if (node.items.length > 1000) fail('Список слишком длинный.'); const items = node.items.map(item => evaluate(item, scope, depth, control)), values=items.map(item=>item.value); floats.set(values,new Set(items.flatMap((item,i)=>item.float?[i]:[]))); return done(values, items) }
    if (node.kind === 'tuple') { const parts = node.items.map(item => evaluate(item, scope, depth, control)); return done(makeTuple(parts), parts) }
    if (node.kind === 'slice') {
      const parts = [node.start, node.stop, node.step].map(part => part ? evaluate(part, scope, depth, control) : undefined)
      const bound = (part: Tracked | undefined) => { if (!part || part.value === null) return null; const v = number(part.value); if (part.float || !Number.isInteger(v)) fail('Границы среза — целые числа.'); return v }
      return done(new PySlice(bound(parts[0]), bound(parts[1]), bound(parts[2])), parts.filter((p): p is Tracked => !!p))
    }
    if (node.kind === 'attribute') { const target = evaluate(node.target, scope, depth, control), result = attribute(target.value, node.name); return done(result.value, [target], result.float) }
    if (node.kind === 'unary') {
      const child = evaluate(node.value, scope, depth, control)
      if (child.value instanceof NdArray && node.operator !== 'not') { const r = node.operator === '-' ? arrayNegate(child.value, ctx) : { value: child.value }; return done(r.value, [child]) }
      return done(node.operator === 'not' ? !truth(child.value) : node.operator==='+'?number(child.value):-number(child.value), [child], child.float)
    }
    if (node.kind === 'compare') {
      const children=[evaluate(node.operands[0],scope,depth,control)]
      for(let i=0;i<node.operators.length;i++) {
        const right=evaluate(node.operands[i+1],scope,depth,control); children.push(right)
        if(!compare(children[i].value,right.value,node.operators[i]))return done(false,children)
      }
      return done(true,children)
    }
    if (node.kind === 'index') {
      const target = evaluate(node.target, scope, depth, control), position = evaluate(node.index, scope, depth, control)
      if (target.value instanceof NdArray) { const r = arrayGet(target.value, position, ctx); return done(r.value, [target, position], r.float) }
      if (position.value instanceof PySlice) { const r = sliceOf(target.value, position.value); return done(r.value, [target, position]) }
      if (position.value instanceof PyTuple) fail('Несколько индексов через запятую работают только у массивов numpy.')
      if (target.value instanceof PyTuple) {
        const parts = items(target.value), index = number(position.value)
        if (position.float || !Number.isInteger(index) || index < -parts.length || index >= parts.length) fail('Такого элемента нет. Проверь индекс: первый элемент имеет индекс 0.')
        const item = parts[index < 0 ? parts.length + index : index]; return done(item.value, [target, position], item.float)
      }
      if (target.value instanceof PyObject) fail(`Значение типа ${target.value.typeName} нельзя индексировать.`)
      const values = typeof target.value === 'string' ? Array.from(target.value) : list(target.value), index = number(position.value)
      if (position.float || !Number.isInteger(index) || index < -values.length || index >= values.length) fail('Такого элемента в списке нет. Проверь индекс: первый элемент имеет индекс 0.')
      const offset=index<0?values.length+index:index
      return done(values[offset], [target, position], floats.get(values)?.has(offset))
    }
    if (node.kind === 'binary') {
      const left = evaluate(node.left, scope, depth, control)
      if (node.operator === 'and' && !truth(left.value) || node.operator === 'or' && truth(left.value)) return done(left.value, [left], left.float)
      const right = evaluate(node.right, scope, depth, control), a = left.value, b = right.value, children = [left, right]
      if (node.operator === 'and' || node.operator === 'or') return done(b, children, right.float)
      if (a instanceof NdArray || b instanceof NdArray) { const r = arrayBinary(node.operator, left, right, ctx); return done(r.value, children, r.float) }
      if (node.operator === '==') return done(equal(a,b), children)
      if (node.operator === '!=') return done(!equal(a,b), children)
      if (['<', '<=', '>', '>='].includes(node.operator)) {
        return done(compare(a,b,node.operator),children)
      }
      if (node.operator === '+' && typeof a === 'string' && typeof b === 'string') {if(a.length+b.length>12000)fail('Строка слишком длинная.');return done(a + b, children)}
      if(node.operator==='+'&&Array.isArray(a)&&Array.isArray(b)) {
        if(a.length+b.length>1000)fail('Список слишком длинный.')
        const result=[...a,...b];floats.set(result,new Set([...floats.get(a)||[],...[...floats.get(b)||[]].map(i=>i+a.length)]));return done(result,children)
      }
      if (node.operator === '+' && a instanceof PyTuple && b instanceof PyTuple) return done(makeTuple([...items(a), ...items(b)]), children)
      if(node.operator==='*'&&(typeof a==='string'||Array.isArray(a)||typeof b==='string'||Array.isArray(b))) {
        const sequence=typeof a==='string'||Array.isArray(a)?left:right, count=sequence===left?right:left,n=number(count.value)
        if(count.float||!Number.isInteger(n))fail('Для повторения строки или списка нужно целое число.')
        const value=sequence.value as string|Value[], times=Math.max(0,n)
        if(times*value.length>(typeof value==='string'?12000:1000))fail('Результат повторения слишком длинный.')
        if(typeof value==='string')return done(value.repeat(times),children)
        if(!value.length)return done([],children)
        const result:Value[]=[],metadata=new Set<number>()
        for(let i=0;i<times;i++)for(let j=0;j<value.length;j++){if(floats.get(value)?.has(j))metadata.add(result.length);result.push(value[j])}
        floats.set(result,metadata);return done(result,children)
      }
      const lhs = number(a), rhs = number(b)
      if (['/', '//', '%'].includes(node.operator) && rhs === 0) fail('Делить на ноль нельзя. Проверь делитель.')
      let remainder=0,quotient=0
      if(node.operator==='//'||node.operator==='%'){
        remainder=lhs%rhs;quotient=(lhs-remainder)/rhs
        if(remainder!==0){if((remainder<0)!==(rhs<0)){remainder+=rhs;quotient--}}
        else remainder=rhs<0?-0:0
        if(quotient!==0){const floor=Math.floor(quotient);quotient=floor+(quotient-floor>0.5?1:0)}
        else quotient=lhs/rhs<0||Object.is(lhs/rhs,-0)?-0:0
      }
      const result = node.operator === '+' ? lhs + rhs : node.operator === '-' ? lhs - rhs : node.operator === '*' ? lhs * rhs : node.operator === '/' ? lhs / rhs : node.operator==='//'?quotient:node.operator === '%' ? remainder : lhs ** rhs
      if (!Number.isFinite(result) || Math.abs(result) > 1e12) fail('Результат слишком большой. Проверь вычисление.')
      return done(result, children, node.operator==='/'||left.float||right.float||node.operator==='**'&&rhs<0)
    }
    // ---------- calls ----------
    const callee = node.callee ? evaluate(node.callee, scope, depth, control) : undefined
    const args = node.args.map(arg => evaluate(arg, scope, depth, control))
    const kw = new Map<string, Tracked>((node.keywords || []).map(item => [item.name, evaluate(item.value, scope, depth, control)]))
    if (callee) {
      const result = invoke(callee, args, kw, node, depth, control)
      // A list changed by its method carries the change as its own history, like a[i] = v.
      if (node.callee!.kind === 'attribute' && node.callee!.target.kind === 'name' && mutating.has(node.name)) {
        const owner = lookup(node.callee!.target.name, scope)
        if (owner && Array.isArray(owner.value)) for (const part of result.trail) owner.trail.add(part)
      }
      return result
    }
    const bound = lookup(node.name, scope)
    if (bound && bound.value instanceof PyObject && bound.value.callable()) return invoke(bound, args, kw, node, depth, control)
    if (legacyBuiltins.has(node.name) && !bound) return callLegacy(node.name, args, kw, node, control)
    const fn = functions.get(node.name)
    if(localNames.get(scope)?.has(node.name)||scope.has(node.name)||globals.has(node.name))fail(`Значение «${node.name}» нельзя вызвать как функцию.`)
    if (!fn) { const builtin = typeValue(node.name); if (builtin) return invoke(done(builtin), args, kw, node, depth, control) }
    if (!fn) return fail(`Сначала опиши функцию «${node.name}» через def, затем вызови её.`)
    if (kw.size) {
      // f(a=1): keywords fill the parameters by name, as in Python.
      const named: (Tracked | undefined)[] = fn.params.map((name, i) => args[i])
      if (args.length > fn.params.length) fail(`Эта функция принимает ${fn.params.length} аргументов. Проверь вызов и строку def.`)
      for (const [name, value] of kw) {
        const at = fn.params.indexOf(name)
        if (at < 0) fail(`У функции «${node.name}» нет параметра «${name}».`)
        if (named[at]) fail(`Параметр «${name}» передан дважды.`)
        named[at] = value
      }
      const missing = fn.params.find((_, i) => !named[i])
      if (missing) fail(`В вызове «${node.name}» не хватает значения для параметра «${missing}».`)
      return callFunction(fn, named as Tracked[], node, depth, control)
    }
    return callFunction(fn, args, node, depth, control)
  }
  const bindName = (scope: Scope, name: string, value: Arg, item: Statement, control: Set<PythonNode>) => {
    if (scope.has(name) && item.kind === 'unpack') reassigned.add(item)
    scope.set(name, { ...track(value.value, item, [], control), float: typeof value.value === 'number' && !!value.float })
  }
  const execute = (items_: Statement[], scope: Scope, depth: number, control: Set<PythonNode>): void => {
    for (const item of items_) {
      tick()
      if (item.kind === 'pass') continue
      if (item.kind === 'import') {
        for (const m of item.modules) { const { root, leaf } = loaded(m.name); bindName(scope, m.alias ?? m.name.split('.')[0], { value: m.alias ? leaf : root }, item, control) }
        continue
      }
      if (item.kind === 'from') {
        const { leaf } = loaded(item.module)
        if (item.star) { for (const name of leaf.exports) bindName(scope, name, leaf.attrs.get(name)!, item, control); continue }
        for (const n of item.names) {
          let value = leaf.getattr(n.name)
          if (!value) { try { value = { value: loaded(`${item.module}.${n.name}`).leaf } } catch { /* reported below */ } }
          if (!value) fail(`В модуле «${item.module}» нет «${n.name}». Проверь название в справке по библиотекам.`)
          bindName(scope, n.alias ?? n.name, value!, item, control)
        }
        continue
      }
      if (item.kind === 'function') {
        scope.delete(item.name); functions.set(item.name, item)
        for (const decorator of item.decorators || []) {
          const head = decorator.kind === 'call' ? decorator.callee ?? { kind: 'name' as const, name: decorator.name } : decorator
          if (head.kind === 'name' && !lookup(head.name, scope)) fail('Декоратор @ в Kodik — только @task из pyrob.api.')
          const value = evaluate(decorator, scope, depth, control).value
          if (!(value instanceof PyNative) || !value.decorate) fail('Декоратор @ в Kodik — только @task из pyrob.api.')
          ;(value as PyNative).decorate!(item.name, ctx)
        }
        continue
      }
      if (item.kind === 'return') { if (!depth) fail('Помести return внутрь функции с отступом.'); const result = evaluate(item.value, scope, depth, control); throw new ReturnSignal({...track(result.value, item, [result], control),float:result.float}) }
      if (item.kind === 'expression') { evaluate(item.value, scope, depth, new Set([...control, item])); continue }
      if (item.kind === 'unpack') {
        const result = evaluate(item.value, scope, depth, control), parts = items(result.value, 'Справа от =')
        if (parts.length !== item.names.length) fail(`Слева ${item.names.length} имён, а значений ${parts.length}. Количество должно совпадать.`)
        item.names.forEach((name, i) => { if (scope.has(name)) reassigned.add(item); scope.set(name, { ...track(parts[i].value, item, [result], control), float: typeof parts[i].value === 'number' && !!parts[i].float }) })
        continue
      }
      if (item.kind === 'assign') {
        const result = evaluate(item.value, scope, depth, control), assigned = {...track(result.value, item, [result], control),float:result.float}
        if (item.index) {
          const owner = scope.get(item.name) || (!localNames.get(scope)?.has(item.name)?globals.get(item.name):undefined); if (!owner) fail('Сначала создай список, затем меняй его элемент.')
          const position = evaluate(item.index, scope, depth, control)
          if (owner!.value instanceof NdArray) { arraySet(owner!.value, position, result, ctx); for (const node of [...assigned.trail, ...position.trail]) owner!.trail.add(node); continue }
          if (owner!.value instanceof PyTuple) fail('Кортеж нельзя изменить. Используй список [ ].')
          if (position.value instanceof PySlice) fail('Замена части списка через срез в Kodik не поддерживается. Меняй элементы по одному.')
          const values = list(owner!.value), index = number(position.value)
          if (position.float || !Number.isInteger(index) || index < -values.length || index >= values.length) fail('Такого индекса в списке нет.')
          const offset=index<0?values.length+index:index, metadata=floats.get(values)||new Set<number>()
          values[offset] = result.value
          if(result.float)metadata.add(offset);else metadata.delete(offset)
          floats.set(values,metadata)
          for (const node of [...assigned.trail, ...position.trail]) owner!.trail.add(node)
        } else { if (scope.has(item.name)) reassigned.add(item); scope.set(item.name, assigned) }
        continue
      }
      if (item.kind === 'if') {
        const tests: Tracked[] = []; let body = item.otherwise
        for (const branch of item.branches) { const condition = evaluate(branch.condition, scope, depth, control); tests.push(condition); if (truth(condition.value)) { body = branch.body; break } }
        execute(body, scope, depth, track(null, item, tests, control).trail); continue
      }
      if (item.kind === 'for') {
        const source = evaluate(item.iterable, scope, depth, control), inside = track(null, item, [source], control).trail
        if (Array.isArray(source.value) || typeof source.value === 'string') {
          // Lists are walked live, as before: a change of a later element during the loop is seen.
          const values=typeof source.value==='string'?Array.from(source.value):list(source.value)
          for (const [index,value] of values.entries()) { tick(); scope.set(item.name, {...track(value, item, [source], control),float:floats.get(values)?.has(index)}); execute(item.body, scope, depth, inside) } continue
        }
        for (const part of items(source.value, 'В цикле for')) { tick(); scope.set(item.name, { ...track(part.value, item, [source], control), float: typeof part.value === 'number' && !!part.float }); execute(item.body, scope, depth, inside) }
        continue
      }
      while (true) { const condition = evaluate(item.condition, scope, depth, control); if (!truth(condition.value)) break; tick(); execute(item.body, scope, depth, track(null, item, [condition], control).trail) }
    }
  }
  const finish = (error?: string): PythonRun => {
    flushOutput()
    const shown = scene.finish(clock.now)
    return { output, segments, operations, observed, reassigned, ...(error !== undefined ? { error } : {}), ...(shown ? { scene: shown } : {}), ...(clock.now > 0 ? { outputTimes } : {}) }
  }
  try { execute(program, globals, 0, new Set()); return finish() }
  catch (error) { return finish(error instanceof Error ? error.message : 'Проверь команды программы.') }
}
export function runCourseProgram(source: string, inputs: string[] = [], options: RunOptions = {}): PythonRun {
  try { return runPythonAst(parseCourseProgram(source), inputs, options) }
  catch (error) { return { output: [], segments: [], operations: 0, observed: new Set(), reassigned: new Set(), error: error instanceof Error ? error.message : 'Проверь запись Python.' } }
}
