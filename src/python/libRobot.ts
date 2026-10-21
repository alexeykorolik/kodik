// pyrob.api: the Robot on a grid with walls. The field comes from the task (teacher's text field) or
// is set up by the program before the first step. Crashing into a wall stops the program, as in pyrob.
import { cellOf, emptyWorld, key, parseWorld, MAX_SIDE, type World } from './robotWorld'
import type { RobotScene, RobotStep } from './scene'
import { PyModule, PyNative, arg, bind, int, none, num, text, type Arg, type Ctx, type Keywords } from './values'

const STEP_LIMIT = 5000
type Dir = 'left' | 'right' | 'up' | 'down'
const delta: Record<Dir, [number, number]> = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }
const sideName: Record<Dir, string> = { left: 'слева', right: 'справа', up: 'сверху', down: 'снизу' }

class Robot {
  world: World; r: number; c: number; started = false; crashed = false; delay = 300
  steps: RobotStep[] = []; tasks: string[] = []
  constructor(public ctx: Ctx) {
    this.world = emptyWorld()
    if (ctx.world) { try { this.world = parseWorld(ctx.world) } catch (e) { ctx.fail(`Поле Робота в задании записано с ошибкой: ${(e as Error).message}`) } }
    ;[this.r, this.c] = this.world.start
  }
  blocked(dir: Dir, r = this.r, c = this.c): boolean {
    const w = this.world
    if (dir === 'left') return c === 0 || w.walls.has(`v:${r}:${c}`)
    if (dir === 'right') return c === w.cols - 1 || w.walls.has(`v:${r}:${c + 1}`)
    if (dir === 'up') return r === 0 || w.walls.has(`h:${r}:${c}`)
    return r === w.rows - 1 || w.walls.has(`h:${r + 1}:${c}`)
  }
  step(kind: RobotStep['kind'], dir?: Dir) {
    if (this.steps.length >= STEP_LIMIT) this.ctx.fail(`Робот сделал больше ${STEP_LIMIT} шагов. Проверь условие окончания цикла.`)
    this.ctx.tick()
    this.started = true
    this.steps.push({ t: this.ctx.clock.now, kind, r: this.r, c: this.c, ...(dir ? { dir } : {}) })
  }
  move(dir: Dir, n: number) {
    if (n < 0) this.ctx.fail('Число шагов Робота не может быть отрицательным.')
    for (let i = 0; i < n; i++) {
      if (this.blocked(dir)) {
        this.crashed = true; this.step('crash', dir)
        this.ctx.fail(`Робот врезался в стену ${sideName[dir]} (строка ${this.r + 1}, столбец ${this.c + 1}). Перед шагом проверь стену: wall_is_${dir === 'left' ? 'on_the_left' : dir === 'right' ? 'on_the_right' : dir === 'up' ? 'above' : 'beneath'}().`)
      }
      this.r += delta[dir][0]; this.c += delta[dir][1]
      this.ctx.clock.sleep(this.delay)
      this.step('move', dir)
    }
  }
  setup(fn: string) {
    if (this.ctx.world !== undefined) this.ctx.fail(`${fn}: поле задано преподавателем. Нельзя менять его размер, стены, клетки или начальное положение Робота.`)
    if (this.started) this.ctx.fail(`${fn}: поле настраивают до первого шага Робота.`)
  }
  inside(r: number, c: number, fn: string) { if (r < 0 || c < 0 || r >= this.world.rows || c >= this.world.cols) this.ctx.fail(`${fn}: клетки (${r}, ${c}) нет на поле ${this.world.rows}×${this.world.cols}. Строки и столбцы считаются с нуля.`) }
  scene(): RobotScene {
    const w = this.world, cells = (s: Set<string>) => [...s].map(cellOf)
    const filled = new Set(w.filled)
    for (const s of this.steps) if (s.kind === 'fill') filled.add(key(s.r, s.c))
    const problems: string[] = []
    if (this.crashed) problems.push('Робот врезался в стену.')
    const missing = [...w.targets].filter(k => !filled.has(k)).length, extra = [...filled].filter(k => !w.targets.has(k) && !w.filled.has(k)).length
    if (missing) problems.push(`Не закрашено нужных клеток: ${missing}.`)
    if (extra) problems.push(`Закрашены лишние клетки: ${extra}.`)
    if (w.parking.size && !w.parking.has(key(this.r, this.c))) problems.push('Робот должен закончить путь на парковке (P).')
    return { rows: w.rows, cols: w.cols, walls: [...w.walls], targets: cells(w.targets), parking: cells(w.parking), filled: cells(w.filled), start: [...w.start], steps: this.steps, final: { r: this.r, c: this.c, filled: cells(filled), crashed: this.crashed }, result: { solved: !problems.length, problems } }
  }
}

export function pyrobModules(ctx: Ctx): { api: PyModule; package: PyModule } {
  const robot = new Robot(ctx)
  ctx.scene.onFinish(() => { ctx.scene.robot = robot.scene() })
  ctx.scene.robot = robot.scene()
  const attrs = new Map<string, Arg>()
  const def = (name: string, fn: (args: Arg[], kw: Keywords, ctx: Ctx) => Arg | void, effect = true) => attrs.set(name, { value: new PyNative(name, fn, effect) })
  for (const dir of ['left', 'right', 'up', 'down'] as Dir[]) def(`move_${dir}`, (a, kw, c) => { const { n } = bind(`move_${dir}`, a, kw, ['n'], 0, c); robot.move(dir, n ? int(n, c, 'целое число шагов') : 1) })
  const sensor = (name: string, dir: Dir) => def(name, (a, kw, c) => { bind(name, a, kw, [], 0, c); return arg(robot.blocked(dir)) }, false)
  sensor('wall_is_above', 'up'); sensor('wall_is_beneath', 'down'); sensor('wall_is_on_the_left', 'left'); sensor('wall_is_on_the_right', 'right')
  def('fill_cell', (a, kw, c) => { bind('fill_cell', a, kw, [], 0, c); c.clock.sleep(robot.delay / 2); robot.step('fill') })
  def('cell_is_filled', (a, kw, c) => {
    bind('cell_is_filled', a, kw, [], 0, c)
    const k = key(robot.r, robot.c)
    return arg(robot.world.filled.has(k) || robot.steps.some(s => s.kind === 'fill' && key(s.r, s.c) === k))
  }, false)
  def('cell_should_be_filled', (a, kw, c) => { bind('cell_should_be_filled', a, kw, [], 0, c); return arg(robot.world.targets.has(key(robot.r, robot.c))) }, false)
  def('is_parking_point', (a, kw, c) => { bind('is_parking_point', a, kw, [], 0, c); return arg(robot.world.parking.has(key(robot.r, robot.c))) }, false)
  def('get_pos', (a, kw, c) => { bind('get_pos', a, kw, [], 0, c); return { value: c.tuple([arg(robot.r), arg(robot.c)]) } }, false)
  def('get_field_size', (a, kw, c) => { bind('get_field_size', a, kw, [], 0, c); return { value: c.tuple([arg(robot.world.rows), arg(robot.world.cols)]) } }, false)
  // ----- field set-up (before the first step) -----
  def('set_field_size', (a, kw, c) => {
    robot.setup('set_field_size'); const p = bind('set_field_size', a, kw, ['rows', 'cols'], 2, c), rows = int(p.rows, c), cols = int(p.cols, c)
    if (rows < 1 || cols < 1 || rows > MAX_SIDE || cols > MAX_SIDE) c.fail(`set_field_size: поле от 1×1 до ${MAX_SIDE}×${MAX_SIDE}.`)
    robot.world = emptyWorld(rows, cols); robot.r = 0; robot.c = 0; ctx.scene.robot = robot.scene()
  })
  def('goto', (a, kw, c) => { robot.setup('goto'); const p = bind('goto', a, kw, ['row', 'col'], 2, c), r = int(p.row, c), col = int(p.col, c); robot.inside(r, col, 'goto'); robot.r = r; robot.c = col; robot.world.start = [r, col]; ctx.scene.robot = robot.scene() })
  def('put_wall', (a, kw, c) => {
    robot.setup('put_wall'); const p = bind('put_wall', a, kw, ['left', 'right', 'top', 'bottom'], 0, c), w = robot.world, r = robot.r, col = robot.c
    const on = (v: Arg | undefined) => !!v && c.truth(v.value)
    if (on(p.left) && col > 0) w.walls.add(`v:${r}:${col}`)
    if (on(p.right) && col < w.cols - 1) w.walls.add(`v:${r}:${col + 1}`)
    if (on(p.top) && r > 0) w.walls.add(`h:${r}:${col}`)
    if (on(p.bottom) && r < w.rows - 1) w.walls.add(`h:${r + 1}:${col}`)
    ctx.scene.robot = robot.scene()
  })
  def('set_cell_type', (a, kw, c) => {
    robot.setup('set_cell_type'); const p = bind('set_cell_type', a, kw, ['row', 'col', 'cell_type'], 3, c), r = int(p.row, c), col = int(p.col, c), type = text(p.cell_type, c, 'тип клетки')
    robot.inside(r, col, 'set_cell_type'); const k = key(r, col), w = robot.world
    w.targets.delete(k); w.filled.delete(k)
    if (type === 'to_be_filled') w.targets.add(k)
    else if (type === 'filled') w.filled.add(k)
    else if (type !== 'empty') c.fail('set_cell_type: тип CELL_EMPTY, CELL_TO_BE_FILLED или CELL_FILLED.')
    ctx.scene.robot = robot.scene()
  })
  def('set_parking_cell', (a, kw, c) => { robot.setup('set_parking_cell'); const p = bind('set_parking_cell', a, kw, ['row', 'col'], 2, c), r = int(p.row, c), col = int(p.col, c); robot.inside(r, col, 'set_parking_cell'); robot.world.parking.add(key(r, col)); ctx.scene.robot = robot.scene() })
  attrs.set('CELL_EMPTY', arg('empty')); attrs.set('CELL_TO_BE_FILLED', arg('to_be_filled')); attrs.set('CELL_FILLED', arg('filled'))
  // ----- @task and run_tasks -----
  const register = (delay?: number) => (fn: string) => { robot.tasks.push(fn); if (delay !== undefined) robot.delay = delay }
  const task = new PyNative('task', (a, kw, c) => {
    const p = bind('task', a, kw, ['delay'], 0, c)
    const delay = p.delay ? num(p.delay, c, 'число секунд') : undefined
    if (delay !== undefined && (delay < 0 || delay > 5)) c.fail('task(delay=...) — пауза от 0 до 5 секунд.')
    return { value: new PyNative('task', (_a, _kw, c2) => c2.fail('Пиши @task(...) строкой над def.'), false, register(delay === undefined ? undefined : delay * 1000)) }
  }, false, register())
  attrs.set('task', { value: task })
  def('run_tasks', (a, kw, c) => {
    for (const name of kw.keys()) if (!['verbose', 'headless', 'tasks'].includes(name)) c.fail(`У run_tasks() нет аргумента «${name}».`)
    if (!robot.tasks.length) c.fail('run_tasks(): отметь функцию с решением строкой @task над def.')
    for (const name of robot.tasks) c.callUser(name)
  })
  void none
  const api = new PyModule('pyrob.api', attrs)
  return { api, package: new PyModule('pyrob', new Map()) }
}
