// math, random and time, and the builtins float, abs, round, pow, min, max, sum.
// random reproduces CPython 3.11 exactly (Mersenne Twister, seeding and the integer algorithms),
// so random.seed(n) gives the same numbers as on a school computer.
import type { Value } from '../pythonRuntime'
import { PyModule, PyNative, arg, bind, floatArg, int, noKeywords, none, num, pyRound, roundHalfEven, typeLabel, type Arg, type Ctx, type Keywords, type NativeFn } from './values'

const native = (name: string, fn: NativeFn, effect = false) => new PyNative(name, fn, effect)
const finite = (value: number, ctx: Ctx, fn: string): number => Number.isFinite(value) ? value : ctx.fail(`${fn}: результат слишком большой (math range error).`)
const safeInt = (value: number, ctx: Ctx): number => Number.isSafeInteger(value) ? value : ctx.fail('Целое число выходит за пределы учебного диапазона.')
const one = (fn: string, args: Arg[], kw: Keywords, ctx: Ctx) => { noKeywords(fn, kw, ctx); if (args.length !== 1) ctx.fail(`${fn}() принимает одно значение.`); return args[0] }

// ---------- builtins ----------
function parseFloat(source: string, ctx: Ctx): number {
  const s = source.trim().toLowerCase()
  if (/^[+-]?(inf|infinity)$/.test(s)) return s.startsWith('-') ? -Infinity : Infinity
  if (/^[+-]?nan$/.test(s)) return NaN
  if (!/^[+-]?(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:e[+-]?\d(?:_?\d)*)?$/.test(s)) ctx.fail(`Не удалось превратить «${source}» в число. Проверь float(...).`)
  return Number(s.replace(/_/g, ''))
}
function extremum(name: 'min' | 'max', args: Arg[], kw: Keywords, ctx: Ctx): Arg {
  for (const key of kw.keys()) if (key !== 'default') ctx.fail(`У ${name}() в Kodik есть только аргумент default.`)
  const items = args.length === 1 ? ctx.items(args[0].value, `${name}() от одного значения`) : args
  if (args.length === 0) ctx.fail(`${name}() нужны значения.`)
  if (!items.length) return kw.get('default') ?? ctx.fail(`${name}() получил пустую последовательность.`)
  if (args.length > 1 && kw.has('default')) ctx.fail(`default в ${name}() пишут только с одной последовательностью.`)
  let best = items[0]
  for (const item of items.slice(1)) { ctx.tick(); if (ctx.compare(item.value, best.value, name === 'min' ? '<' : '>')) best = item }
  return best
}
export function builtinNatives(): Map<string, PyNative> {
  const items: [string, NativeFn][] = [
    ['float', (args, kw, ctx) => {
      noKeywords('float', kw, ctx)
      if (!args.length) return floatArg(0)
      if (args.length > 1) ctx.fail('float() принимает одно значение.')
      const v = args[0].value
      if (typeof v === 'string') return floatArg(parseFloat(v, ctx))
      if (typeof v === 'number' || typeof v === 'boolean') return floatArg(Number(v))
      return ctx.fail(`В float передай число или строку с числом, а не ${typeLabel(v)}.`)
    }],
    ['abs', (args, kw, ctx) => {
      const a = one('abs', args, kw, ctx)
      if (a.value instanceof Object && 'abs' in a.value) return (a.value as unknown as { abs(ctx: Ctx): Arg }).abs(ctx)
      return arg(Math.abs(num(a, ctx)), a.float)
    }],
    ['round', (args, kw, ctx) => {
      const { number, ndigits } = bind('round', args, kw, ['number', 'ndigits'], 1, ctx)
      const x = num(number, ctx), digits = ndigits && ndigits.value !== null ? int(ndigits, ctx, 'целое число знаков') : undefined
      if (number!.float) {
        if (!Number.isFinite(x)) ctx.fail('round(): нельзя округлить бесконечность или nan.')
        return digits === undefined ? arg(safeInt(roundHalfEven(x), ctx)) : floatArg(pyRound(x, digits))
      }
      if (digits === undefined || digits >= 0) return arg(x)
      return arg(roundHalfEven(x / 10 ** -digits) * 10 ** -digits)
    }],
    ['pow', (args, kw, ctx) => {
      const { base, exp, mod } = bind('pow', args, kw, ['base', 'exp', 'mod'], 2, ctx)
      const a = num(base, ctx), b = num(exp, ctx)
      if (mod && mod.value !== null) {
        const m = int(mod, ctx); int(base, ctx); if (b < 0 || !Number.isInteger(b) || exp!.float) ctx.fail('pow с тремя аргументами работает с неотрицательной целой степенью.')
        if (m === 0) ctx.fail('pow(): третий аргумент не может быть нулём.')
        let result = 1n, square = ((BigInt(a) % BigInt(m)) + BigInt(m)) % BigInt(m), power = BigInt(b)
        while (power > 0n) { if (power & 1n) result = result * square % BigInt(m); square = square * square % BigInt(m); power >>= 1n; ctx.tick() }
        const r = Number(result); return arg(m < 0 && r > 0 ? r + m : r)
      }
      if (a === 0 && b < 0) ctx.fail('Ноль нельзя возводить в отрицательную степень.')
      const value = a ** b, isFloat = !!base!.float || !!exp!.float || b < 0
      if (!Number.isFinite(value) || Math.abs(value) > 1e12 && !isFloat) ctx.fail('Результат слишком большой. Проверь вычисление.')
      return arg(value, isFloat)
    }],
    ['min', (args, kw, ctx) => extremum('min', args, kw, ctx)],
    ['max', (args, kw, ctx) => extremum('max', args, kw, ctx)],
    ['sum', (args, kw, ctx) => {
      const { iterable, start } = bind('sum', args, kw, ['iterable', 'start'], 1, ctx)
      if (typeof start?.value === 'string') ctx.fail('Строки складывай через +, а не через sum().')
      let total = start ? num(start, ctx) : 0, floating = !!start?.float
      for (const item of ctx.items(iterable!.value, 'sum() от одного значения')) {
        ctx.tick()
        if (typeof item.value === 'string') ctx.fail('sum() складывает числа, а в последовательности есть строка.')
        total += num(item, ctx); floating ||= !!item.float
      }
      if (!Number.isFinite(total) && !floating) ctx.fail('Результат слишком большой. Проверь вычисление.')
      return arg(total, floating)
    }],
  ]
  return new Map(items.map(([name, fn]) => [name, native(name, fn)]))
}

// ---------- math ----------
export function mathModule(): PyModule {
  const attrs = new Map<string, Arg>()
  const real = (name: string, fn: (x: number, ctx: Ctx) => number) => attrs.set(name, { value: native(name, (args, kw, ctx) => floatArg(finite(fn(num(one(`math.${name}`, args, kw, ctx), ctx), ctx), ctx, `math.${name}`))) })
  const domain = (fn: string): never => { throw new Error(`math.${fn}: значение вне допустимой области (math domain error).`) }
  real('sqrt', x => x < 0 ? domain('sqrt') : Math.sqrt(x))
  real('fabs', Math.abs); real('exp', Math.exp)
  real('sin', Math.sin); real('cos', Math.cos); real('tan', Math.tan)
  real('asin', x => Math.abs(x) > 1 ? domain('asin') : Math.asin(x)); real('acos', x => Math.abs(x) > 1 ? domain('acos') : Math.acos(x)); real('atan', Math.atan)
  real('degrees', x => x * (180 / Math.PI)); real('radians', x => x * (Math.PI / 180))
  real('log2', x => x <= 0 ? domain('log2') : Math.log2(x)); real('log10', x => x <= 0 ? domain('log10') : Math.log10(x))
  const integral = (name: string, fn: (x: number) => number) => attrs.set(name, { value: native(name, (args, kw, ctx) => {
    const a = one(`math.${name}`, args, kw, ctx), x = num(a, ctx)
    if (!a.float) return arg(x)
    if (!Number.isFinite(x)) ctx.fail(`math.${name}: нельзя превратить бесконечность или nan в целое число.`)
    return arg(safeInt(fn(x), ctx))
  }) })
  integral('ceil', Math.ceil); integral('floor', Math.floor); integral('trunc', Math.trunc)
  attrs.set('pow', { value: native('pow', (args, kw, ctx) => { noKeywords('math.pow', kw, ctx); if (args.length !== 2) ctx.fail('math.pow() принимает два числа.'); const a = num(args[0], ctx), b = num(args[1], ctx); if (a === 0 && b < 0) domain('pow'); if (a < 0 && !Number.isInteger(b)) domain('pow'); return floatArg(finite(a ** b, ctx, 'math.pow')) }) })
  attrs.set('atan2', { value: native('atan2', (args, kw, ctx) => { noKeywords('math.atan2', kw, ctx); if (args.length !== 2) ctx.fail('math.atan2(y, x) принимает два числа.'); return floatArg(Math.atan2(num(args[0], ctx), num(args[1], ctx))) }) })
  attrs.set('hypot', { value: native('hypot', (args, kw, ctx) => { noKeywords('math.hypot', kw, ctx); return floatArg(Math.hypot(...args.map(a => num(a, ctx)))) }) })
  attrs.set('log', { value: native('log', (args, kw, ctx) => {
    noKeywords('math.log', kw, ctx); if (args.length < 1 || args.length > 2) ctx.fail('math.log(x) или math.log(x, основание).')
    const x = num(args[0], ctx); if (x <= 0) domain('log')
    if (args.length === 1) return floatArg(Math.log(x))
    const base = num(args[1], ctx); if (base <= 0 || base === 1) domain('log')
    return floatArg(Math.log(x) / Math.log(base))
  }) })
  attrs.set('isqrt', { value: native('isqrt', (args, kw, ctx) => { const n = int(one('math.isqrt', args, kw, ctx), ctx); if (n < 0) domain('isqrt'); let r = Math.floor(Math.sqrt(n)); while (r * r > n) r--; while ((r + 1) * (r + 1) <= n) r++; return arg(r) }) })
  attrs.set('factorial', { value: native('factorial', (args, kw, ctx) => { const n = int(one('math.factorial', args, kw, ctx), ctx); if (n < 0) ctx.fail('math.factorial: нужно неотрицательное целое число.'); let r = 1; for (let i = 2; i <= n; i++) { r *= i; ctx.tick(); if (r > Number.MAX_SAFE_INTEGER) ctx.fail('Результат слишком большой. Проверь вычисление.') } return arg(r) }) })
  attrs.set('gcd', { value: native('gcd', (args, kw, ctx) => { noKeywords('math.gcd', kw, ctx); let g = 0; for (const a of args) { let b = Math.abs(int(a, ctx)); while (b) { [g, b] = [b, g % b]; ctx.tick() } } return arg(g) }) })
  attrs.set('isclose', { value: native('isclose', (args, kw, ctx) => {
    const { a, b, rel_tol, abs_tol } = bind('math.isclose', args, kw, ['a', 'b', 'rel_tol', 'abs_tol'], 2, ctx)
    const x = num(a, ctx), y = num(b, ctx), rel = rel_tol ? num(rel_tol, ctx) : 1e-9, abs = abs_tol ? num(abs_tol, ctx) : 0
    if (x === y) return arg(true)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return arg(false)
    const diff = Math.abs(y - x); return arg(diff <= Math.abs(rel * y) || diff <= Math.abs(rel * x) || diff <= abs)
  }) })
  attrs.set('pi', floatArg(Math.PI)); attrs.set('e', floatArg(Math.E)); attrs.set('tau', floatArg(2 * Math.PI)); attrs.set('inf', floatArg(Infinity)); attrs.set('nan', floatArg(NaN))
  return new PyModule('math', wrapDomain(attrs))
}
// Domain errors are thrown before ctx is at hand inside the one-line definitions above.
function wrapDomain(attrs: Map<string, Arg>) {
  for (const [key, value] of attrs) if (value.value instanceof PyNative) {
    const inner = value.value
    attrs.set(key, { value: native(inner.name, (args, kw, ctx) => { try { return inner.fn(args, kw, ctx) } catch (e) { if (e instanceof Error && e.message.startsWith('math.')) ctx.fail(e.message); throw e } }) })
  }
  return attrs
}

// ---------- random: CPython's Mersenne Twister ----------
class Twister {
  private mt = new Uint32Array(624); private index = 625
  seedInt(n: number) {
    n = Math.abs(n)
    const key = n === 0 ? [0] : [n % 2 ** 32, Math.floor(n / 2 ** 32)].filter((word, i) => i === 0 || word > 0)
    this.seedArray(key)
  }
  seedArray(key: number[]) {
    const mt = this.mt
    mt[0] = 19650218
    for (let i = 1; i < 624; i++) mt[i] = (Math.imul(1812433253, mt[i - 1] ^ (mt[i - 1] >>> 30)) + i) >>> 0
    let i = 1, j = 0
    for (let k = Math.max(624, key.length); k; k--) {
      mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j) >>> 0
      i++; j++
      if (i >= 624) { mt[0] = mt[623]; i = 1 }
      if (j >= key.length) j = 0
    }
    for (let k = 623; k; k--) {
      mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i) >>> 0
      i++
      if (i >= 624) { mt[0] = mt[623]; i = 1 }
    }
    mt[0] = 0x80000000; this.index = 624
  }
  next(): number {
    const mt = this.mt
    if (this.index >= 624) {
      if (this.index === 625) this.seedInt(5489)
      for (let k = 0; k < 624; k++) {
        const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff)
        mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0)
      }
      this.index = 0
    }
    let y = mt[this.index++]
    y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18
    return y >>> 0
  }
  random() { const a = this.next() >>> 5, b = this.next() >>> 6; return (a * 67108864 + b) * (1 / 9007199254740992) }
  bits(k: number) {
    if (k <= 32) return k === 0 ? 0 : this.next() >>> (32 - k)
    let result = 0, factor = 1
    for (; k > 0; k -= 32) { let r = this.next(); if (k < 32) r >>>= 32 - k; result += r * factor; factor *= 2 ** 32 }
    return result
  }
  below(n: number) { if (n <= 0) return 0; const k = n.toString(2).length; let r = this.bits(k); while (r >= n) r = this.bits(k); return r }
}
export function randomModule(): PyModule {
  const twister = new Twister()
  const fresh = () => { const words = new Uint32Array(624); try { globalThis.crypto.getRandomValues(words) } catch { for (let i = 0; i < 624; i++) words[i] = Math.floor(Math.random() * 2 ** 32) } twister.seedArray([...words]) }
  fresh()
  const attrs = new Map<string, Arg>()
  const def = (name: string, fn: NativeFn) => attrs.set(name, { value: native(name, fn) })
  const range = (fn: string, start: number, stop: number | undefined, step: number, ctx: Ctx) => {
    if (stop === undefined) { if (start > 0) return twister.below(start); return ctx.fail(`random.${fn}: пустой диапазон.`) }
    const width = stop - start
    if (step === 1) { if (width > 0) return start + twister.below(width); return ctx.fail(`random.${fn}: пустой диапазон (${start}, ${stop}).`) }
    const n = step > 0 ? Math.floor((width + step - 1) / step) : step < 0 ? Math.floor((width + step + 1) / step) : ctx.fail('random.randrange: шаг не может быть нулём.')
    if (n <= 0) ctx.fail('random.randrange: пустой диапазон.')
    return start + step * twister.below(n)
  }
  def('seed', (args, kw, ctx) => {
    const { a } = bind('random.seed', args, kw, ['a', 'version'], 0, ctx)
    if (!a || a.value === null) { fresh(); return }
    const v = a.value
    if (typeof v === 'number' || typeof v === 'boolean') {
      const n = Number(v)
      if (a.float && !Number.isInteger(n)) ctx.fail('В random.seed в Kodik передай целое число.')
      twister.seedInt(safeInt(n, ctx)); return
    }
    ctx.fail('В random.seed в Kodik передай целое число, например random.seed(42).')
  })
  def('random', (args, kw, ctx) => { noKeywords('random.random', kw, ctx); if (args.length) ctx.fail('random.random() вызывают без аргументов.'); return floatArg(twister.random()) })
  def('uniform', (args, kw, ctx) => { const { a, b } = bind('random.uniform', args, kw, ['a', 'b'], 2, ctx); const x = num(a, ctx), y = num(b, ctx); return floatArg(x + (y - x) * twister.random()) })
  def('randint', (args, kw, ctx) => { const { a, b } = bind('random.randint', args, kw, ['a', 'b'], 2, ctx); return arg(range('randint', int(a, ctx), int(b, ctx) + 1, 1, ctx)) })
  def('randrange', (args, kw, ctx) => {
    const { start, stop, step } = bind('random.randrange', args, kw, ['start', 'stop', 'step'], 1, ctx)
    if (stop?.value === null && step) ctx.fail('random.randrange: без stop шаг указывать нельзя.')
    return arg(range('randrange', int(start, ctx), stop && stop.value !== null ? int(stop, ctx) : undefined, step ? int(step, ctx) : 1, ctx))
  })
  def('choice', (args, kw, ctx) => { const seq = one('random.choice', args, kw, ctx), items = ctx.items(seq.value, 'random.choice'); if (!items.length) ctx.fail('random.choice: последовательность пуста.'); return items[twister.below(items.length)] })
  def('shuffle', (args, kw, ctx) => {
    const seq = one('random.shuffle', args, kw, ctx)
    if (!Array.isArray(seq.value)) ctx.fail('random.shuffle перемешивает список.')
    const items = ctx.items(seq.value)
    for (let i = items.length - 1; i > 0; i--) { const j = twister.below(i + 1); [items[i], items[j]] = [items[j], items[i]]; ctx.tick() }
    ctx.replace(seq.value as Value[], items)
    return none
  })
  return new PyModule('random', attrs)
}

// ---------- time: a virtual clock; pauses become pauses of the replayed animation ----------
export const SLEEP_LIMIT_MS = 60000
/** time.sleep and plt.pause together may pause a run for at most 60 seconds. */
export function pause(ctx: Ctx, ms: number, fn: string) {
  if (!Number.isFinite(ms) || ms < 0) ctx.fail(`${fn}: время паузы должно быть конечным неотрицательным числом.`)
  const total = (ctx.state.get('paused') as number | undefined ?? 0) + ms
  if (total > SLEEP_LIMIT_MS) ctx.fail(`Паузы программы длятся больше 60 секунд. Уменьши ${fn} или число кадров.`)
  ctx.state.set('paused', total)
  ctx.clock.sleep(ms)
}
export function timeModule(ctx0: Ctx): PyModule {
  const epoch = Date.now() / 1000
  const attrs = new Map<string, Arg>()
  attrs.set('sleep', { value: native('sleep', (args, kw, ctx) => {
    const seconds = num(one('time.sleep', args, kw, ctx), ctx, 'число секунд')
    if (!Number.isFinite(seconds) || seconds < 0) ctx.fail('time.sleep: время паузы должно быть неотрицательным числом.')
    pause(ctx, seconds * 1000, 'time.sleep')
  }, true) })
  attrs.set('time', { value: native('time', (args, kw, ctx) => { noKeywords('time.time', kw, ctx); return floatArg(epoch + ctx.clock.now / 1000) }) })
  attrs.set('monotonic', { value: native('monotonic', (args, kw, ctx) => floatArg(ctx.clock.now / 1000)) })
  attrs.set('perf_counter', { value: native('perf_counter', (args, kw, ctx) => floatArg(ctx.clock.now / 1000)) })
  void ctx0
  return new PyModule('time', attrs)
}
