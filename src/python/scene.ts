// What a program shows besides text: the turtle canvas, the Robot field and matplotlib figures.
// Every visible change carries the virtual time (ms) at which it happens, so the page can replay a
// run as an animation (turtle speed, time.sleep, plt.pause) without blocking, stop it at any moment
// and start a new run from a clean scene. The same data is checked by the grader.

export type Pose = { x: number; y: number; heading: number; visible: boolean; shape: string; pen: string; fill: string; stretch: number; width: number }
export type TurtleItem =
  | { kind: 'line'; id: number; t0: number; t1: number; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { kind: 'fill'; id: number; t0: number; points: number[]; color: string }
  | { kind: 'dot'; id: number; t0: number; x: number; y: number; size: number; color: string }
  | { kind: 'text'; id: number; t0: number; x: number; y: number; text: string; align: 'left' | 'center' | 'right'; size: number; color: string; weight: string }
  | { kind: 'stamp'; id: number; t0: number; pose: Pose }
  | { kind: 'clear'; id: number | null; t0: number }
  | { kind: 'bg'; t0: number; color: string }
/** Where a turtle is between t0 and t1 (moves and turns are interpolated during playback). */
export type PoseFrame = { id: number; t0: number; t1: number; from: Pose; to: Pose }
export type TurtleScene = { items: TurtleItem[]; frames: PoseFrame[]; view?: [number, number, number, number]; size?: [number, number]; title?: string }

export type Cell = [number, number]
export type RobotStep = { t: number; kind: 'move' | 'fill' | 'crash'; r: number; c: number; dir?: 'left' | 'right' | 'up' | 'down' }
export type RobotScene = {
  rows: number; cols: number
  /** 'h:r:c' — wall on the top edge of cell (r, c), r = rows is the bottom border; 'v:r:c' — wall on the left edge, c = cols is the right border. Outer borders are always walls and are not listed. */
  walls: string[]
  targets: Cell[]; parking: Cell[]; filled: Cell[]; start: Cell
  steps: RobotStep[]
  final: { r: number; c: number; filled: Cell[]; crashed: boolean }
  result: { solved: boolean; problems: string[] }
}

export type Series =
  | { type: 'line'; x: number[]; y: number[]; color: string; label?: string; linestyle: string; marker?: string; linewidth: number }
  | { type: 'scatter'; x: number[]; y: number[]; color: string; label?: string; marker: string; size: number }
  | { type: 'bar'; x: (number | string)[]; height: number[]; color: string; label?: string; width: number; horizontal?: boolean }
  | { type: 'hist'; edges: number[]; counts: number[]; color: string; label?: string; edgecolor?: string }
export type Figure = {
  id: number; title?: string; xlabel?: string; ylabel?: string; grid: boolean; legend: boolean
  xlim?: [number, number]; ylim?: [number, number]; series: Series[]
}
/** A figure as it was shown at time t (plt.show, plt.pause, or the end of the program). */
export type FigureShot = { t: number; figure: Figure; auto?: boolean }

export type Scene = { turtle?: TurtleScene; robot?: RobotScene; plots?: FigureShot[]; duration: number }

/** Collects the scene of one run. Libraries register what to finish when the program ends. */
export class SceneBuilder {
  turtle?: TurtleScene
  robot?: RobotScene
  plots?: FigureShot[]
  private finishers: (() => void)[] = []
  onFinish(fn: () => void) { this.finishers.push(fn) }
  finish(duration: number): Scene | undefined {
    for (const fn of this.finishers.splice(0)) { try { fn() } catch { /* the run already reports its own error */ } }
    if (!this.turtle && !this.robot && !this.plots) return undefined
    return { ...(this.turtle ? { turtle: this.turtle } : {}), ...(this.robot ? { robot: this.robot } : {}), ...(this.plots ? { plots: this.plots } : {}), duration: Math.round(duration) }
  }
}

// ---------- turtle scene at a moment ----------
export type TurtleState = { items: Exclude<TurtleItem, { kind: 'clear' } | { kind: 'bg' }>[]; bg: string; poses: Map<number, Pose> }
/** Everything visible at virtual time t (t = Infinity: the final picture). Lines in progress are cut. */
export function turtleAt(scene: TurtleScene, t = Infinity): TurtleState {
  let items: TurtleState['items'] = [], bg = 'white'
  for (const item of scene.items) {
    if (item.t0 > t) continue
    if (item.kind === 'clear') { items = item.id === null ? [] : items.filter(other => other.id !== item.id); continue }
    if (item.kind === 'bg') { bg = item.color; continue }
    if (item.kind === 'line' && item.t1 > t) {
      const k = item.t1 === item.t0 ? 1 : (t - item.t0) / (item.t1 - item.t0)
      items.push({ ...item, x2: item.x1 + (item.x2 - item.x1) * k, y2: item.y1 + (item.y2 - item.y1) * k }); continue
    }
    items.push(item)
  }
  const poses = new Map<number, Pose>()
  for (const frame of scene.frames) {
    if (frame.t0 > t) continue
    if (frame.t1 <= t || frame.t1 === frame.t0) { poses.set(frame.id, frame.to); continue }
    const k = (t - frame.t0) / (frame.t1 - frame.t0), turn = ((frame.to.heading - frame.from.heading + 540) % 360) - 180
    poses.set(frame.id, { ...frame.to, x: frame.from.x + (frame.to.x - frame.from.x) * k, y: frame.from.y + (frame.to.y - frame.from.y) * k, heading: frame.from.heading + turn * k })
  }
  return { items, bg, poses }
}

/** The Robot at virtual time t: position, filled cells and whether it has crashed. */
export function robotAt(scene: RobotScene, t = Infinity) {
  let r = scene.start[0], c = scene.start[1], crashed = false
  const filled = new Set(scene.filled.map(cell => cell.join(':')))
  for (const step of scene.steps) {
    if (step.t > t) break
    if (step.kind === 'move') { r = step.r; c = step.c }
    if (step.kind === 'fill') filled.add(`${step.r}:${step.c}`)
    if (step.kind === 'crash') crashed = true
  }
  return { r, c, filled, crashed }
}

/** The latest shot of every figure shown by time t, in the order they first appeared. */
export function figuresAt(shots: FigureShot[], t = Infinity): FigureShot[] {
  const latest = new Map<number, FigureShot>()
  for (const shot of shots) if (shot.t <= t) { latest.delete(shot.figure.id); latest.set(shot.figure.id, shot) }
  return [...latest.values()]
}
