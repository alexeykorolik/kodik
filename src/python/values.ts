// Objects of the learning interpreter that are not plain JSON-like values: library modules and
// functions, tuples, slices, numpy arrays, turtles. Plain numbers, strings, booleans, lists and None
// stay what they were, so older programs and their evidence keep exactly the same values.
import type { Value } from '../pythonRuntime'
import type { SceneBuilder } from './scene'

/** A value together with Python's int/float distinction (numbers are JavaScript numbers). */
export type Arg = { value: Value; float?: boolean }
export type Keywords = Map<string, Arg>

export abstract class PyObject {
  abstract readonly typeName: string
  /** Attribute lookup; undefined means "no such attribute". */
  getattr(_name: string, _ctx: Ctx): Arg | undefined { return undefined }
  repr(_ctx: Ctx): string { return `<${this.typeName} object>` }
  str(ctx: Ctx): string { return this.repr(ctx) }
  callable(): boolean { return false }
  call(_args: Arg[], _kw: Keywords, ctx: Ctx): Arg | void { ctx.fail(`Значение типа ${this.typeName} нельзя вызвать как функцию.`) }
  /** Items of a `for` loop, unpacking, list(...)-like use; undefined: not iterable. */
  iterate(_ctx: Ctx): Arg[] | undefined { return undefined }
  size(): number | undefined { return undefined }
  truth(_ctx: Ctx): boolean { return true }
}

export type NativeFn = (args: Arg[], kw: Keywords, ctx: Ctx) => Arg | void
/** A library function. `effect` marks calls whose result is visible on the scene (turtle, Robot, plot). */
export class PyNative extends PyObject {
  readonly typeName = 'builtin_function_or_method'
  constructor(public name: string, public fn: NativeFn, public effect = false, public decorate?: (fn: string, ctx: Ctx) => void) { super() }
  callable() { return true }
  call(args: Arg[], kw: Keywords, ctx: Ctx) { return this.fn(args, kw, ctx) }
  repr() { return `<built-in function ${this.name}>` }
}

export class PyModule extends PyObject {
  readonly typeName = 'module'
  constructor(public name: string, public attrs: Map<string, Arg>, public exports: string[] = [...attrs.keys()].filter(key => !key.startsWith('_'))) { super() }
  getattr(name: string) { return this.attrs.get(name) }
  repr() { return `<module '${this.name}'>` }
}

export class PyTuple extends PyObject {
  readonly typeName: string = 'tuple'
  constructor(public items: Value[]) { super() }
  iterate(ctx: Ctx) { return ctx.items(this.items) }
  size() { return this.items.length }
  truth() { return this.items.length > 0 }
}

/** turtle.Vec2D: a pair printed with two decimals, as CPython's turtle does. */
export class Vec2D extends PyTuple {
  readonly typeName = 'Vec2D'
  constructor(public x: number, public y: number, public xFloat = true, public yFloat = true) { super([x, y]) }
  repr() { return `(${fixed2(this.x)},${fixed2(this.y)})` }
  iterate() { return [arg(this.x, this.xFloat), arg(this.y, this.yFloat)] }
}
// Python's '%.2f' (round-half-even on the exact binary value), not JavaScript's toFixed tie rule.
export function fixed2(value: number) { const rounded = pyRound(value, 2); return (Object.is(rounded, -0) || rounded === 0) && value < 0 ? '-0.00' : rounded.toFixed(2) }

export class PySlice extends PyObject {
  readonly typeName = 'slice'
  constructor(public start: number | null, public stop: number | null, public step: number | null) { super() }
  /** Python's slice.indices(length). */
  indices(length: number, ctx: Ctx): number[] {
    const step = this.step ?? 1
    if (step === 0) ctx.fail('Шаг среза не может быть нулём.')
    const lower = step > 0 ? 0 : -1, upper = step > 0 ? length : length - 1
    const clamp = (value: number | null, fallback: number) => {
      if (value === null) return fallback
      if (value < 0) { value += length; return value < lower ? lower : value }
      return value > upper ? upper : value
    }
    const start = clamp(this.start, step > 0 ? lower : upper), stop = clamp(this.stop, step > 0 ? upper : lower), result: number[] = []
    for (let i = start; step > 0 ? i < stop : i > stop; i += step) result.push(i)
    return result
  }
}

export interface Clock { now: number; sleep(ms: number): void }
export interface Ctx {
  fail(message: string): never
  /** Counts work towards the operation limit (one unit by default). */
  tick(count?: number): void
  str(arg: Arg): string
  repr(arg: Arg): string
  /** Items of any iterable: list, tuple, string, numpy array. */
  items(value: Value, what?: string): Arg[]
  list(items: Arg[]): Value[]
  tuple(items: Arg[]): PyTuple
  truth(value: Value): boolean
  compare(a: Value, b: Value, operator: string): boolean
  /** Replaces the contents of a list in place, keeping the int/float distinction of each item. */
  replace(target: Value[], items: Arg[]): void
  clock: Clock
  scene: SceneBuilder
  world?: string
  /** Calls a function of the learner's program (pyrob.run_tasks). */
  callUser(name: string): void
  state: Map<string, unknown>
}

// ---------- argument helpers shared by the libraries ----------
export const arg = (value: Value, float = false): Arg => float && typeof value === 'number' ? { value, float: true } : { value }
export const floatArg = (value: number): Arg => ({ value, float: true })
export const none: Arg = { value: null }
export const isNumber = (a: Arg | undefined): a is Arg => !!a && (typeof a.value === 'number' || typeof a.value === 'boolean')
export function num(a: Arg | undefined, ctx: Ctx, what = 'число'): number {
  if (!a) return ctx.fail(`Не хватает значения: нужно ${what}.`)
  if (typeof a.value === 'boolean') return Number(a.value)
  if (typeof a.value === 'number') return a.value
  return ctx.fail(`Здесь нужно ${what}, а передано ${typeLabel(a.value)}.`)
}
export function int(a: Arg | undefined, ctx: Ctx, what = 'целое число'): number {
  const value = num(a, ctx, what)
  if (a!.float || !Number.isInteger(value)) ctx.fail(`Здесь нужно ${what}, а передано дробное число.`)
  return value
}
export function text(a: Arg | undefined, ctx: Ctx, what = 'строка'): string {
  if (!a || typeof a.value !== 'string') return ctx.fail(`Здесь нужна ${what} в кавычках.`)
  return a.value
}
export function typeLabel(value: Value): string {
  if (value === null) return 'None'
  if (typeof value === 'string') return 'строка'
  if (typeof value === 'boolean') return 'логическое значение'
  if (typeof value === 'number') return 'число'
  if (Array.isArray(value)) return 'список'
  return value.typeName
}
/**
 * Binds call arguments to parameter names. `names` lists parameters in order; the first `required`
 * of them are mandatory. Unknown keywords and extra arguments are errors with the function's name.
 */
export function bind(fn: string, args: Arg[], kw: Keywords, names: string[], required = names.length, ctx: Ctx): Record<string, Arg | undefined> {
  if (args.length > names.length) ctx.fail(`${fn}() принимает не больше ${names.length} аргументов.`)
  const result: Record<string, Arg | undefined> = {}
  names.forEach((name, i) => { if (i < args.length) result[name] = args[i] })
  for (const [name, value] of kw) {
    if (!names.includes(name)) ctx.fail(`У ${fn}() нет аргумента «${name}».`)
    if (result[name]) ctx.fail(`Аргумент «${name}» в ${fn}() указан дважды.`)
    result[name] = value
  }
  const missing = names.slice(0, required).find(name => !result[name])
  if (missing) ctx.fail(`${fn}() не хватает аргумента «${missing}».`)
  return result
}
export const noKeywords = (fn: string, kw: Keywords, ctx: Ctx) => { if (kw.size) ctx.fail(`У ${fn}() нет именованных аргументов.`) }

/**
 * Python's round(x, ndigits) for floats: the exact binary value is rounded half-to-even, as CPython
 * does through its correctly rounded dtoa; JavaScript's toFixed breaks exact ties away from zero.
 */
export function pyRound(x: number, digits = 0): number {
  if (!Number.isFinite(x)) return x
  if (digits > 22 || Math.abs(x) >= 2 ** 52 && digits >= 0) return x
  if (digits < 0) { const scale = 10 ** -digits; return roundHalfEven(x / scale) * scale }
  const exact = Math.abs(x).toFixed(Math.min(100, digits + 25)), cut = exact.indexOf('.') + 1 + digits
  const tail = exact.slice(cut)
  let result = Number(Math.abs(x).toFixed(digits))
  if (/^50*$/.test(tail)) {
    // An exact tie: keep the even last digit.
    const kept = exact.slice(0, cut).replace(/\.$/, ''), last = Number(kept.replace('.', '').slice(-1))
    if (last % 2 === 0) result = Number(kept)
  }
  return x < 0 ? -result : result
}
export function roundHalfEven(x: number): number {
  const floor = Math.floor(x), diff = x - floor
  if (diff > 0.5) return floor + 1
  if (diff < 0.5) return floor
  return floor % 2 === 0 ? floor : floor + 1
}
