// turtle with the geometry of CPython's turtle.py (Vec2D rotation, circle approximation, heading
// rounding), so positions, headings and distances print the same numbers. Drawing goes to the
// scene timeline: each move lasts as long as at the turtle's speed, tracer(0)/update() hold frames.
import { cssColor } from './colors'
import type { Pose, TurtleItem, TurtleScene } from './scene'
import { PyModule, PyNative, PyObject, PyTuple, Vec2D, arg, bind, floatArg, int, none, num, pyRound, roundHalfEven, text, type Arg, type Ctx, type Keywords } from './values'

const LIMIT_ITEMS = 8000, LIMIT_FRAMES = 16000
const pyMod = (x: number, y: number) => { const r = x % y; if (r === 0) return y < 0 ? -0 : 0; return (r < 0) !== (y < 0) ? r + y : r }
const radians = (deg: number) => deg * (Math.PI / 180), degrees = (rad: number) => rad * (180 / Math.PI)
const speeds: Record<string, number> = { fastest: 0, fast: 10, normal: 6, slow: 3, slowest: 1 }
const shapes = ['classic', 'arrow', 'turtle', 'circle', 'square', 'triangle', 'blank']

class Screen {
  bg = 'white'; tracing = 1; delay = 10; colormode = 1.0
  turtles: TurtleObject[] = []; main?: TurtleObject
  held: { item?: TurtleItem; frame?: Scene['frames'][number] }[] = []
  constructor(public scene: TurtleScene, public ctx: Ctx) {}
  push(item: TurtleItem) {
    if (this.scene.items.length >= LIMIT_ITEMS) this.ctx.fail('Слишком много линий и фигур черепахи. Уменьши число повторений.')
    this.scene.items.push(item); if (!this.tracing) this.held.push({ item })
    return item
  }
  frame(id: number, from: Pose, to: Pose, duration: number) {
    if (this.scene.frames.length >= LIMIT_FRAMES) this.ctx.fail('Слишком много шагов черепахи. Уменьши число повторений.')
    const t0 = this.ctx.clock.now, frame = { id, t0, t1: t0 + duration, from, to }
    this.scene.frames.push(frame); if (!this.tracing) this.held.push({ frame })
    return frame
  }
  /** turtle.update(): everything drawn while tracer was off appears now. */
  flush() {
    const now = this.ctx.clock.now
    for (const { item, frame } of this.held) {
      if (item) { const span = item.kind === 'line' ? item.t1 - item.t0 : 0; item.t0 = now; if (item.kind === 'line') item.t1 = now + span }
      if (frame) { frame.t0 = now; frame.t1 = now }
    }
    this.held = []
  }
  color(args: Arg[], ctx: Ctx, fn: string): string {
    const value = args.length === 1 ? args[0].value : args.length === 3 ? ctx.tuple(args) : ctx.fail(`${fn}: укажи цвет строкой, например "red", или тремя числами.`)
    if (typeof value === 'string') { if (value === '' || cssColor(value)) return value; return ctx.fail(`${fn}: неизвестный цвет «${value}». Используй название, например "red", или код "#ff8800".`) }
    const parts = value instanceof PyTuple || Array.isArray(value) ? ctx.items(value) : []
    if (parts.length !== 3) ctx.fail(`${fn}: цвет — строка или три числа (r, g, b).`)
    let rgb = parts.map(p => num(p, ctx))
    if (this.colormode === 1.0) rgb = rgb.map(v => roundHalfEven(255 * v))
    if (rgb.some(v => v < 0 || v > 255 || !Number.isInteger(v))) ctx.fail(`${fn}: числа цвета должны быть от 0 до ${this.colormode === 1.0 ? '1.0' : '255'} (сейчас colormode ${this.colormode === 1.0 ? '1.0' : '255'}).`)
    return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')
  }
  /** What pencolor()/fillcolor() return: names as given, codes as numbers in the current colormode. */
  colorValue(color: string, ctx: Ctx): Arg {
    if (!color.startsWith('#')) return arg(color)
    const hex = cssColor(color)!, parts = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) * this.colormode / 255)
    return { value: ctx.tuple(parts.map(v => floatArg(v))) }
  }
}
type Scene = TurtleScene

class TurtleObject extends PyObject {
  readonly typeName = 'Turtle'
  x = 0; y = 0; xFloat = true; yFloat = true; ox = 1; oy = 0
  down = true; pen = 'black'; fill = 'black'; width = 1; speed = 3; visible = true; shape = 'classic'; stretch = 1
  fillPath: number[] | null = null; fillSlot = -1; stamps = 0
  constructor(public id: number, public screen: Screen) { super() }
  repr() { return '<turtle.Turtle object>' }
  pose(): Pose { return { x: this.x, y: this.y, heading: this.headingValue(), visible: this.visible, shape: this.shape, pen: this.pen, fill: this.fill, stretch: this.stretch, width: this.width } }
  headingValue() { return pyMod(pyRound(degrees(Math.atan2(this.oy, this.ox)), 10), 360) }
  animated() { return this.speed > 0 && this.screen.tracing === 1 }
  rotate(angle: number) {
    const from = this.pose(), a = radians(angle), c = Math.cos(a), s = Math.sin(a)
    const ox = this.ox * c + -this.oy * s, oy = this.oy * c + this.ox * s
    this.ox = ox; this.oy = oy
    const duration = this.animated() ? (1 + Math.floor(Math.abs(angle) / (3 * this.speed))) * this.screen.delay : 0
    this.screen.frame(this.id, from, this.pose(), duration); this.screen.ctx.clock.sleep(duration)
  }
  goto(x: number, y: number, xFloat: boolean, yFloat: boolean) {
    const ctx = this.screen.ctx
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) ctx.fail('Черепаха ушла слишком далеко. Проверь расстояния.')
    ctx.tick()
    const from = this.pose(), dx = x - this.x, dy = y - this.y, dist = Math.sqrt(dx * dx + dy * dy)
    const duration = this.animated() ? (1 + Math.floor(dist / (3 * 1.1 ** this.speed * this.speed))) * this.screen.delay : 0
    const t0 = ctx.clock.now
    if (this.down && dist > 0) this.screen.push({ kind: 'line', id: this.id, t0, t1: t0 + duration, x1: this.x, y1: this.y, x2: x, y2: y, color: this.pen, width: this.width })
    this.x = x; this.y = y; this.xFloat = xFloat; this.yFloat = yFloat
    if (this.fillPath) { this.fillPath.push(x, y); if (this.fillPath.length > 20000) ctx.fail('Заливка содержит слишком много точек.') }
    this.screen.frame(this.id, from, this.pose(), duration); ctx.clock.sleep(duration)
  }
  go(distance: number) { this.goto(this.x + this.ox * distance, this.y + this.oy * distance, true, true) }
  setheading(to: number) { const angle = pyMod(to - this.headingValue() + 180, 360) - 180; this.rotate(angle) }
  reset() {
    this.screen.push({ kind: 'clear', id: this.id, t0: this.screen.ctx.clock.now })
    const from = this.pose()
    Object.assign(this, { x: 0, y: 0, xFloat: true, yFloat: true, ox: 1, oy: 0, down: true, pen: 'black', fill: 'black', width: 1, speed: 3, visible: true, shape: 'classic', stretch: 1, fillPath: null })
    this.screen.frame(this.id, from, this.pose(), 0)
  }
  /** Pose change that is not a move (colour, visibility, shape). */
  touch() { const p = this.pose(); this.screen.frame(this.id, p, p, 0) }
  getattr(name: string, ctx: Ctx): Arg | undefined {
    const method = turtleMethods[name]
    void ctx
    return method ? { value: new PyNative(name, (args, kw, c) => method(this, args, kw, c), drawing.has(name)) } : undefined
  }
}

// ---------- methods ----------
type Method = (t: TurtleObject, args: Arg[], kw: Keywords, ctx: Ctx) => Arg | void
const point = (t: TurtleObject, args: Arg[], ctx: Ctx, fn: string): [number, number, boolean, boolean] => {
  if (args.length === 2) return [num(args[0], ctx), num(args[1], ctx), !!args[0].float, !!args[1].float]
  const v = args[0]?.value
  if (v instanceof TurtleObject) return [v.x, v.y, v.xFloat, v.yFloat]
  if (args.length === 1 && (v instanceof PyTuple || Array.isArray(v))) { const p = ctx.items(v); if (p.length === 2) return [num(p[0], ctx), num(p[1], ctx), !!p[0].float, !!p[1].float] }
  return ctx.fail(`${fn}: укажи координаты x и y.`)
}
const angleOf = (degreesValue: number) => degreesValue
const oneNumber = (fn: string, args: Arg[], kw: Keywords, ctx: Ctx, name = 'distance') => num(bind(fn, args, kw, [name], 1, ctx)[name], ctx)
const turtleMethods: Record<string, Method> = {
  forward: (t, a, kw, ctx) => { t.go(oneNumber('forward', a, kw, ctx)) },
  backward: (t, a, kw, ctx) => { t.go(-oneNumber('backward', a, kw, ctx)) },
  left: (t, a, kw, ctx) => { t.rotate(angleOf(oneNumber('left', a, kw, ctx, 'angle'))) },
  right: (t, a, kw, ctx) => { t.rotate(-angleOf(oneNumber('right', a, kw, ctx, 'angle'))) },
  goto: (t, a, kw, ctx) => { if (kw.size) ctx.fail('goto(x, y): координаты без имён.'); const [x, y, xf, yf] = point(t, a, ctx, 'goto'); t.goto(x, y, xf, yf) },
  setx: (t, a, kw, ctx) => { const v = bind('setx', a, kw, ['x'], 1, ctx).x!; t.goto(num(v, ctx), t.y, !!v.float, t.yFloat) },
  sety: (t, a, kw, ctx) => { const v = bind('sety', a, kw, ['y'], 1, ctx).y!; t.goto(t.x, num(v, ctx), t.xFloat, !!v.float) },
  setheading: (t, a, kw, ctx) => { t.setheading(oneNumber('setheading', a, kw, ctx, 'to_angle')) },
  home: t => { t.goto(0, 0, false, false); t.setheading(0) },
  circle: (t, a, kw, ctx) => {
    const p = bind('circle', a, kw, ['radius', 'extent', 'steps'], 1, ctx), radius = num(p.radius, ctx)
    const extent = p.extent && p.extent.value !== null ? num(p.extent, ctx) : 360
    let steps = p.steps && p.steps.value !== null ? int(p.steps, ctx, 'целое число шагов') : 1 + Math.trunc(Math.min(11 + Math.abs(radius) / 6, 59) * (Math.abs(extent) / 360))
    if (steps < 1) steps = 1
    if (steps > 720) ctx.fail('circle: слишком много шагов (steps).')
    let w = extent / steps, w2 = 0.5 * w, l = 2 * radius * Math.sin(radians(w2))
    if (radius < 0) { l = -l; w = -w; w2 = -w2 }
    const speed = t.speed
    // CPython turns at speed 0 inside circle and moves at the turtle's own speed.
    t.speed = 0; t.rotate(w2)
    for (let i = 0; i < steps; i++) { t.speed = speed; t.go(l); t.speed = 0; t.rotate(w) }
    t.rotate(-w2); t.speed = speed
  },
  dot: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail('dot(размер, цвет): аргументы без имён.')
    let size: number, color: string
    const def = t.width + Math.max(t.width, 4)
    if (a.length === 0) { size = def; color = t.pen }
    else if (typeof a[0].value === 'string' || a[0].value instanceof PyTuple) { color = t.screen.color(a, ctx, 'dot'); size = def }
    else { size = a[0].value === null ? def : num(a[0], ctx); color = a.length > 1 ? t.screen.color(a.slice(1), ctx, 'dot') : t.pen }
    t.screen.push({ kind: 'dot', id: t.id, t0: ctx.clock.now, x: t.x, y: t.y, size, color })
  },
  write: (t, a, kw, ctx) => {
    const p = bind('write', a, kw, ['arg', 'move', 'align', 'font'], 1, ctx), align = p.align ? text(p.align, ctx, 'строка "left", "center" или "right"') : 'left'
    if (!['left', 'center', 'right'].includes(align)) ctx.fail('write: align может быть "left", "center" или "right".')
    let size = 8, weight = 'normal'
    if (p.font) { const parts = ctx.items(p.font.value, 'font'); if (parts[1]) size = num(parts[1], ctx); if (parts[2] && typeof parts[2].value === 'string') weight = parts[2].value }
    if (size <= 0 || size > 200) ctx.fail('write: размер шрифта от 1 до 200.')
    t.screen.push({ kind: 'text', id: t.id, t0: ctx.clock.now, x: t.x, y: t.y, text: ctx.str(p.arg!).slice(0, 500), align: align as 'left', size, color: t.pen, weight })
  },
  stamp: (t, a, kw, ctx) => { t.screen.push({ kind: 'stamp', id: t.id, t0: ctx.clock.now, pose: t.pose() }); return arg(++t.stamps) },
  penup: t => { t.down = false }, pendown: t => { t.down = true }, isdown: t => arg(t.down),
  pensize: (t, a, kw, ctx) => { const { width } = bind('pensize', a, kw, ['width'], 0, ctx); if (!width) return arg(t.width); const w = num(width, ctx); if (w <= 0 || w > 500) ctx.fail('pensize: толщина от 1 до 500.'); t.width = w; t.touch() },
  pencolor: (t, a, kw, ctx) => { if (kw.size) ctx.fail('pencolor: цвет без имени аргумента.'); if (!a.length) return t.screen.colorValue(t.pen, ctx); t.pen = t.screen.color(a, ctx, 'pencolor'); t.touch() },
  fillcolor: (t, a, kw, ctx) => { if (kw.size) ctx.fail('fillcolor: цвет без имени аргумента.'); if (!a.length) return t.screen.colorValue(t.fill, ctx); t.fill = t.screen.color(a, ctx, 'fillcolor'); t.touch() },
  color: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail('color: цвета без имён аргументов.')
    if (!a.length) return { value: ctx.tuple([t.screen.colorValue(t.pen, ctx), t.screen.colorValue(t.fill, ctx)]) }
    if (a.length === 2) { t.pen = t.screen.color([a[0]], ctx, 'color'); t.fill = t.screen.color([a[1]], ctx, 'color') }
    else { t.pen = t.fill = t.screen.color(a, ctx, 'color') }
    t.touch()
  },
  begin_fill: (t, a, kw, ctx) => { t.fillPath = [t.x, t.y]; t.fillSlot = t.screen.scene.items.length; t.screen.push({ kind: 'fill', id: t.id, t0: Infinity, points: [], color: t.fill }); void ctx },
  end_fill: (t, a, kw, ctx) => {
    if (!t.fillPath) return
    const slot = t.screen.scene.items[t.fillSlot]
    if (slot?.kind === 'fill') { if (t.fillPath.length > 4) { slot.points = t.fillPath; slot.color = t.fill; slot.t0 = ctx.clock.now; if (!t.screen.tracing) t.screen.held.push({ item: slot }) } else slot.t0 = Infinity }
    t.fillPath = null
  },
  filling: t => arg(!!t.fillPath),
  position: t => ({ value: new Vec2D(t.x, t.y, t.xFloat, t.yFloat) }),
  xcor: t => arg(t.x, t.xFloat), ycor: t => arg(t.y, t.yFloat),
  heading: t => floatArg(t.headingValue()),
  distance: (t, a, kw, ctx) => { if (kw.size) ctx.fail('distance(x, y): без имён.'); const [x, y] = point(t, a, ctx, 'distance'); return floatArg(Math.hypot(x - t.x, y - t.y)) },
  towards: (t, a, kw, ctx) => { if (kw.size) ctx.fail('towards(x, y): без имён.'); const [x, y] = point(t, a, ctx, 'towards'); return floatArg(pyMod(pyRound(degrees(Math.atan2(y - t.y, x - t.x)), 10), 360)) },
  speed: (t, a, kw, ctx) => {
    const { speed } = bind('speed', a, kw, ['speed'], 0, ctx)
    if (!speed || speed.value === null) return arg(t.speed)
    if (typeof speed.value === 'string') { if (!(speed.value in speeds)) ctx.fail('speed: "fastest", "fast", "normal", "slow", "slowest" или число 0–10.'); t.speed = speeds[speed.value]; return }
    const s = num(speed, ctx); t.speed = s > 0.5 && s < 10.5 ? roundHalfEven(s) : 0
  },
  hideturtle: t => { t.visible = false; t.touch() }, showturtle: t => { t.visible = true; t.touch() }, isvisible: t => arg(t.visible),
  shape: (t, a, kw, ctx) => { const { name } = bind('shape', a, kw, ['name'], 0, ctx); if (!name) return arg(t.shape); const s = text(name, ctx, 'название формы'); if (!shapes.includes(s)) ctx.fail(`shape: доступны формы ${shapes.map(x => `"${x}"`).join(', ')}.`); t.shape = s; t.touch() },
  shapesize: (t, a, kw, ctx) => { const p = bind('shapesize', a, kw, ['stretch_wid', 'stretch_len', 'outline'], 0, ctx); if (!p.stretch_wid) return { value: ctx.tuple([arg(t.stretch), arg(t.stretch), arg(1)]) }; const s = num(p.stretch_wid, ctx); if (s <= 0 || s > 50) ctx.fail('shapesize: размер от 0.1 до 50.'); t.stretch = s; t.touch() },
  clear: (t, a, kw, ctx) => { t.screen.push({ kind: 'clear', id: t.id, t0: ctx.clock.now }) },
  reset: t => { t.reset() },
  getscreen: t => ({ value: screenObject(t.screen) }),
  onclick: (t, a, kw, ctx) => ctx.fail('События мыши и клавиатуры в Kodik не поддерживаются: программа выполняется целиком, затем показывается анимация.'),
}
const aliases: Record<string, string> = { fd: 'forward', bk: 'backward', back: 'backward', lt: 'left', rt: 'right', setpos: 'goto', setposition: 'goto', seth: 'setheading', pu: 'penup', up: 'penup', pd: 'pendown', down: 'pendown', width: 'pensize', pos: 'position', ht: 'hideturtle', st: 'showturtle', turtlesize: 'shapesize', ondrag: 'onclick', onrelease: 'onclick' }
for (const [alias, name] of Object.entries(aliases)) turtleMethods[alias] = turtleMethods[name]
const drawing = new Set(Object.keys(turtleMethods).filter(name => !['isdown', 'position', 'pos', 'xcor', 'ycor', 'heading', 'distance', 'towards', 'isvisible', 'filling', 'getscreen'].includes(name)))

// ---------- screen ----------
type ScreenMethod = (s: Screen, args: Arg[], kw: Keywords, ctx: Ctx) => Arg | void
const noop: ScreenMethod = () => undefined
const unsupportedEvents: ScreenMethod = (s, a, kw, ctx) => ctx.fail('События мыши, клавиатуры и таймеры в Kodik не поддерживаются: программа выполняется целиком, затем показывается анимация. Для анимации используй циклы и time.sleep.')
const screenMethods: Record<string, ScreenMethod> = {
  bgcolor: (s, a, kw, ctx) => { if (!a.length) return s.colorValue(s.bg, ctx); s.bg = s.color(a, ctx, 'bgcolor'); s.push({ kind: 'bg', t0: ctx.clock.now, color: s.bg }) },
  title: (s, a, kw, ctx) => { s.scene.title = text(bind('title', a, kw, ['titlestring'], 1, ctx).titlestring, ctx).slice(0, 120) },
  setup: (s, a, kw, ctx) => {
    const p = bind('setup', a, kw, ['width', 'height', 'startx', 'starty'], 0, ctx)
    const size = (v: Arg | undefined, base: number, fallback: number) => !v || v.value === null ? fallback : v.float && num(v, ctx) <= 1 ? num(v, ctx) * base : num(v, ctx)
    const w = size(p.width, 1600, 800), h = size(p.height, 900, 600)
    if (w < 50 || h < 50 || w > 4000 || h > 4000) ctx.fail('setup: ширина и высота окна от 50 до 4000.')
    s.scene.size = [Math.round(w), Math.round(h)]; if (!s.scene.view) s.scene.view = undefined
  },
  screensize: (s, a, kw, ctx) => { const p = bind('screensize', a, kw, ['canvwidth', 'canvheight', 'bg'], 0, ctx); if (!p.canvwidth) return { value: ctx.tuple([arg(400), arg(300)]) }; s.scene.size = [num(p.canvwidth, ctx), p.canvheight ? num(p.canvheight, ctx) : 300]; if (p.bg) screenMethods.bgcolor(s, [p.bg], new Map(), ctx) },
  setworldcoordinates: (s, a, kw, ctx) => { if (a.length !== 4) ctx.fail('setworldcoordinates(llx, lly, urx, ury).'); const [x0, y0, x1, y1] = a.map(v => num(v, ctx)); if (x1 <= x0 || y1 <= y0) ctx.fail('setworldcoordinates: правый верхний угол должен быть правее и выше левого нижнего.'); s.scene.view = [x0, y0, x1, y1] },
  tracer: (s, a, kw, ctx) => { const p = bind('tracer', a, kw, ['n', 'delay'], 0, ctx); if (!p.n || p.n.value === null) return arg(s.tracing); s.tracing = int(p.n, ctx) ? 1 : 0; if (p.delay && p.delay.value !== null) s.delay = Math.max(0, num(p.delay, ctx)); if (s.tracing) s.flush() },
  update: s => { s.flush() },
  delay: (s, a, kw, ctx) => { const { delay } = bind('delay', a, kw, ['delay'], 0, ctx); if (!delay || delay.value === null) return arg(s.delay); s.delay = Math.max(0, Math.min(1000, num(delay, ctx))) },
  colormode: (s, a, kw, ctx) => { const { cmode } = bind('colormode', a, kw, ['cmode'], 0, ctx); if (!cmode || cmode.value === null) return s.colormode === 1.0 ? floatArg(1) : arg(255); const m = num(cmode, ctx); if (m !== 1 && m !== 255) ctx.fail('colormode: 1.0 или 255.'); s.colormode = m === 255 ? 255 : 1.0 },
  clearscreen: (s, a, kw, ctx) => { s.push({ kind: 'clear', id: null, t0: ctx.clock.now }); s.bg = 'white'; s.push({ kind: 'bg', t0: ctx.clock.now, color: 'white' }); for (const t of s.turtles) { t.visible = false; t.touch() } s.turtles = []; s.main = undefined; s.tracing = 1 },
  resetscreen: s => { for (const t of s.turtles) t.reset() },
  turtles: (s, a, kw, ctx) => ({ value: ctx.list(s.turtles.map(t => ({ value: t }))) }),
  window_width: s => arg(s.scene.size?.[0] ?? 800), window_height: s => arg(s.scene.size?.[1] ?? 600),
  mainloop: noop, done: noop, exitonclick: noop, bye: noop, listen: noop,
  onkey: unsupportedEvents, onkeypress: unsupportedEvents, onkeyrelease: unsupportedEvents, onscreenclick: unsupportedEvents, onclick: unsupportedEvents, ontimer: unsupportedEvents,
  textinput: (s, a, kw, ctx) => ctx.fail('textinput и numinput в Kodik не поддерживаются: для ввода используй input().'),
  numinput: (s, a, kw, ctx) => ctx.fail('textinput и numinput в Kodik не поддерживаются: для ввода используй input().'),
  mode: (s, a, kw, ctx) => { const { mode } = bind('mode', a, kw, ['mode'], 0, ctx); if (!mode || mode.value === null) return arg('standard'); if (mode.value !== 'standard') ctx.fail('В Kodik доступен только режим "standard": 0° — вправо, углы против часовой стрелки.') },
}
screenMethods.clear = screenMethods.clearscreen; screenMethods.reset = screenMethods.resetscreen
class ScreenObject extends PyObject {
  readonly typeName = '_Screen'
  constructor(public screen: Screen) { super() }
  repr() { return '<turtle._Screen object>' }
  getattr(name: string): Arg | undefined { const m = screenMethods[name]; return m ? { value: new PyNative(name, (a, kw, ctx) => m(this.screen, a, kw, ctx), true) } : undefined }
}
const screenObjects = new WeakMap<Screen, ScreenObject>()
const screenObject = (s: Screen) => { let o = screenObjects.get(s); if (!o) { o = new ScreenObject(s); screenObjects.set(s, o) } return o }

export function turtleModule(ctx: Ctx): PyModule {
  const scene: TurtleScene = ctx.scene.turtle ?? (ctx.scene.turtle = { items: [], frames: [] })
  const screen = new Screen(scene, ctx)
  ctx.scene.onFinish(() => { screen.flush(); scene.items = scene.items.filter(item => item.kind !== 'fill' || item.t0 !== Infinity && item.points.length > 4) })
  let next = 0
  const create = () => {
    if (screen.turtles.length >= 50) ctx.fail('Слишком много черепах (больше 50).')
    const t = new TurtleObject(++next, screen); screen.turtles.push(t); t.touch(); return t
  }
  const main = () => screen.main ?? (screen.main = create())
  const attrs = new Map<string, Arg>()
  for (const name of Object.keys(turtleMethods)) attrs.set(name, { value: new PyNative(name, (a, kw, c) => turtleMethods[name](main(), a, kw, c), drawing.has(name)) })
  for (const name of Object.keys(screenMethods)) if (!['clear', 'reset', 'onclick'].includes(name)) attrs.set(name, { value: new PyNative(name, (a, kw, c) => screenMethods[name](screen, a, kw, c), true) })
  const turtleClass = new PyNative('Turtle', (a, kw, c) => { if (a.length || kw.size) c.fail('Turtle() создают без аргументов.'); return { value: create() } }, true)
  attrs.set('Turtle', { value: turtleClass }); attrs.set('Pen', { value: turtleClass }); attrs.set('RawTurtle', { value: turtleClass })
  attrs.set('Screen', { value: new PyNative('Screen', () => ({ value: screenObject(screen) })) })
  attrs.set('getturtle', { value: new PyNative('getturtle', () => ({ value: main() })) }); attrs.set('getpen', attrs.get('getturtle')!)
  attrs.set('getscreen', attrs.get('Screen')!)
  attrs.set('Vec2D', { value: new PyNative('Vec2D', (a, kw, c) => { if (a.length !== 2) c.fail('Vec2D(x, y) принимает два числа.'); return { value: new Vec2D(num(a[0], c), num(a[1], c), !!a[0].float, !!a[1].float) } }) })
  return new PyModule('turtle', attrs, [...attrs.keys()])
}
void none
