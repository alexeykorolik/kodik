// The picture part of a run: turtle canvas, Robot field and matplotlib figures, replayed on the
// virtual timeline of the run. Playback never blocks the page: it can be stopped, skipped to the end
// or replayed, and a new run replaces it with a clean scene.
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { figuresAt, robotAt, turtleAt, type Figure, type FigureShot, type Pose, type RobotScene, type Scene, type Series, type TurtleScene } from '../python/scene'
import { parseWorld, type World } from '../python/robotWorld'
import { cssColor } from '../python/colors'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
export type Playback = { t: number; state: 'playing' | 'stopped' | 'done'; duration: number; stop(): void; finish(): void; replay(): void }
/** Virtual time of a run's animation. `runKey` changes with every new run and restarts from a clean scene. */
export function usePlayback(duration: number, runKey: unknown): Playback {
  const animate = duration > 0 && !reducedMotion()
  const [t, setT] = useState(animate ? 0 : Infinity), [state, setState] = useState<Playback['state']>(animate ? 'playing' : 'done')
  const frame = useRef(0)
  const cancel = () => { clearTimeout(frame.current); frame.current = 0 }
  const start = useCallback((from: number) => {
    cancel()
    if (duration <= 0) { setT(Infinity); setState('done'); return }
    const origin = performance.now() - from
    setState('playing'); setT(from)
    const step = () => {
      const now = performance.now() - origin
      if (now >= duration) { setT(Infinity); setState('done'); frame.current = 0; return }
      setT(now); frame.current = window.setTimeout(step, 33)
    }
    frame.current = window.setTimeout(step, 33)
  }, [duration])
  useEffect(() => { if (animate) start(0); else { cancel(); setT(Infinity); setState('done') } return cancel }, [runKey, duration]) // eslint-disable-line react-hooks/exhaustive-deps
  return { t, state, duration, stop: () => { cancel(); setState('stopped') }, finish: () => { cancel(); setT(Infinity); setState('done') }, replay: () => start(0) }
}
const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} с`

export function PlaybackBar({ playback, label = 'Анимация' }: { playback: Playback; label?: string }) {
  if (playback.duration <= 0) return null
  const shown = Math.min(playback.t, playback.duration)
  return <div className="playback-bar" role="group" aria-label={label}>
    <span className="playback-state" role="status">{playback.state === 'playing' ? `Идёт анимация · ${seconds(shown)} из ${seconds(playback.duration)}` : playback.state === 'stopped' ? `Остановлено на ${seconds(shown)}` : `Анимация · ${seconds(playback.duration)}`}</span>
    {playback.state === 'playing' && <button type="button" className="small" onClick={playback.stop}>■ Остановить</button>}
    {playback.state !== 'done' && <button type="button" className="small" onClick={playback.finish}>⏭ Сразу результат</button>}
    {playback.state !== 'playing' && <button type="button" className="small" onClick={playback.replay}>↻ Показать анимацию снова</button>}
  </div>
}

/** Scene of a run with its own playback (lesson examples, the help page, the teacher's journal). */
export function RunScene({ scene, runKey, title }: { scene: Scene; runKey: unknown; title?: string }) {
  const playback = usePlayback(scene.duration, runKey)
  return <div className="run-scene"><PlaybackBar playback={playback} /><SceneView scene={scene} t={playback.t} title={title} /></div>
}

export function SceneView({ scene, t = Infinity, title }: { scene: Scene; t?: number; title?: string }) {
  return <div className="scene-view">
    {title && <h4 className="scene-title">{title}</h4>}
    {scene.robot && <RobotView scene={scene.robot} t={t} />}
    {scene.turtle && <TurtleView scene={scene.turtle} t={t} />}
    {scene.plots && figuresAt(scene.plots, t).map(shot => <PlotView key={shot.figure.id} shot={shot} />)}
  </div>
}

// ---------- turtle ----------
const shapes: Record<string, number[][]> = {
  classic: [[0, 0], [-5, -9], [0, -7], [5, -9]],
  arrow: [[-10, 0], [10, 0], [0, 10]],
  turtle: [[0, 16], [-2, 14], [-1, 10], [-4, 7], [-7, 9], [-9, 8], [-6, 5], [-7, 1], [-5, -3], [-8, -6], [-6, -8], [-4, -5], [0, -7], [4, -5], [6, -8], [8, -6], [5, -3], [7, 1], [6, 5], [9, 8], [7, 9], [4, 7], [1, 10], [2, 14]],
  circle: Array.from({ length: 10 }, (_, i) => [10 * Math.sin(i * Math.PI / 5), 10 * Math.cos(i * Math.PI / 5)]),
  square: [[10, -10], [10, 10], [-10, 10], [-10, -10]],
  triangle: [[10, -5.77], [0, 11.55], [-10, -5.77]],
  blank: [],
}
const paint = (c: string) => c === '' ? 'none' : cssColor(c) ?? c
function shapePoints(p: Pose, unit: number) {
  const a = (p.heading - 90) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a), k = p.stretch * unit
  return (shapes[p.shape] ?? shapes.classic).map(([sx, sy]) => `${p.x + (sx * cos - sy * sin) * k},${-(p.y + (sx * sin + sy * cos) * k)}`).join(' ')
}
export function TurtleView({ scene, t }: { scene: TurtleScene; t: number }) {
  const state = turtleAt(scene, t), final = turtleAt(scene)
  // A fixed frame for the whole run (from the final picture) so the view does not jump while drawing.
  let [x0, y0, x1, y1] = scene.view ?? (scene.size ? [-scene.size[0] / 2, -scene.size[1] / 2, scene.size[0] / 2, scene.size[1] / 2] : [-400, -300, 400, 300])
  if (!scene.view) {
    const xs: number[] = [], ys: number[] = []
    for (const item of final.items) {
      if (item.kind === 'line') { xs.push(item.x1, item.x2); ys.push(item.y1, item.y2) }
      else if (item.kind === 'fill') item.points.forEach((v, i) => (i % 2 ? ys : xs).push(v))
      else if (item.kind !== 'stamp') { xs.push(item.x); ys.push(item.y) }
    }
    for (const f of scene.frames) { xs.push(f.to.x); ys.push(f.to.y) }
    if (xs.length) { x0 = Math.min(x0, Math.min(...xs) - 20); x1 = Math.max(x1, Math.max(...xs) + 20); y0 = Math.min(y0, Math.min(...ys) - 20); y1 = Math.max(y1, Math.max(...ys) + 20) }
  }
  const width = x1 - x0, height = y1 - y0, unit = width / (scene.size?.[0] ?? Math.max(800, width))
  const lines = final.items.filter(i => i.kind === 'line').length
  return <figure className="turtle-view">
    <svg role="img" aria-label={`Рисунок черепахи: ${lines} линий${scene.title ? `, окно «${scene.title}»` : ''}`} viewBox={`${x0} ${-y1} ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <rect x={x0} y={-y1} width={width} height={height} fill={paint(state.bg)} />
      {state.items.map((item, i) => {
        if (item.kind === 'line') return <line key={i} x1={item.x1} y1={-item.y1} x2={item.x2} y2={-item.y2} stroke={paint(item.color)} strokeWidth={item.width} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        if (item.kind === 'fill') return <polygon key={i} points={item.points.reduce<string[]>((acc, v, k) => { if (k % 2 === 0) acc.push(`${v},${-item.points[k + 1]}`); return acc }, []).join(' ')} fill={paint(item.color)} fillRule="evenodd" />
        if (item.kind === 'dot') return <circle key={i} cx={item.x} cy={-item.y} r={item.size / 2 * unit} fill={paint(item.color)} />
        if (item.kind === 'text') return <text key={i} x={item.x} y={-item.y} fontSize={item.size * 1.33 * unit} fontWeight={item.weight === 'bold' ? 700 : 400} fontStyle={item.weight === 'italic' ? 'italic' : undefined} textAnchor={item.align === 'center' ? 'middle' : item.align === 'right' ? 'end' : 'start'} fill={paint(item.color)}>{item.text}</text>
        return <polygon key={i} points={shapePoints(item.pose, unit)} fill={paint(item.pose.fill)} stroke={paint(item.pose.pen)} vectorEffect="non-scaling-stroke" />
      })}
      {[...state.poses].map(([id, pose]) => pose.visible && <polygon key={`t${id}`} className="turtle-cursor" points={shapePoints(pose, unit)} fill={paint(pose.fill)} stroke={paint(pose.pen)} strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
    </svg>
    {scene.title && <figcaption>{scene.title}</figcaption>}
  </figure>
}

// ---------- Robot ----------
const CELL = 36
export function RobotField({ world, r, c, filled, crashed = false, trail = [], label }: { world: { rows: number; cols: number; walls: Iterable<string>; targets: Iterable<string>; parking: Iterable<string> }; r: number; c: number; filled: Set<string>; crashed?: boolean; trail?: [number, number][]; label?: string }) {
  const W = world.cols * CELL, H = world.rows * CELL, targets = new Set(world.targets), parking = new Set(world.parking)
  const cells: ReactElement[] = []
  for (let i = 0; i < world.rows; i++) for (let j = 0; j < world.cols; j++) {
    const key = `${i}:${j}`, isFilled = filled.has(key), isTarget = targets.has(key)
    cells.push(<g key={key}>
      <rect x={j * CELL} y={i * CELL} width={CELL} height={CELL} className={`robot-cell${isFilled ? ' filled' : ''}${isTarget && !isFilled ? ' target' : ''}${isFilled && !isTarget && targets.size ? ' extra' : ''}`} />
      {isTarget && !isFilled && <circle cx={j * CELL + CELL / 2} cy={i * CELL + CELL / 2} r={4} className="robot-target-dot" />}
      {parking.has(key) && <text x={j * CELL + CELL / 2} y={i * CELL + CELL / 2 + 5} textAnchor="middle" className="robot-parking">P</text>}
    </g>)
  }
  const walls = [...world.walls].map(w => { const [kind, a, b] = w.split(':'), i = Number(a), j = Number(b); return kind === 'h' ? <line key={w} x1={j * CELL} y1={i * CELL} x2={(j + 1) * CELL} y2={i * CELL} className="robot-wall" /> : <line key={w} x1={j * CELL} y1={i * CELL} x2={j * CELL} y2={(i + 1) * CELL} className="robot-wall" /> })
  const done = [...targets].filter(k => filled.has(k)).length
  return <figure className="robot-view">
    <svg role="img" aria-label={label ?? `Поле Робота ${world.rows}×${world.cols}: Робот в строке ${r + 1}, столбце ${c + 1}; закрашено нужных клеток ${done} из ${targets.size}${crashed ? '; Робот врезался в стену' : ''}`} viewBox={`-3 -3 ${W + 6} ${H + 6}`} style={{ maxWidth: Math.max(160, W + 6) }}>
      {cells}
      {trail.length > 1 && <polyline points={trail.map(([i, j]) => `${j * CELL + CELL / 2},${i * CELL + CELL / 2}`).join(' ')} className="robot-trail" />}
      {walls}
      <rect x={0} y={0} width={W} height={H} className="robot-border" />
      <g className={`robot-body${crashed ? ' crashed' : ''}`} transform={`translate(${c * CELL + CELL / 2} ${r * CELL + CELL / 2})`}>
        <circle r={CELL * 0.32} />
        {crashed ? <text y={5} textAnchor="middle">!</text> : <><circle className="robot-eye" cx={-4} cy={-2} r={2.2} /><circle className="robot-eye" cx={4} cy={-2} r={2.2} /></>}
      </g>
    </svg>
  </figure>
}
export function RobotView({ scene, t }: { scene: RobotScene; t: number }) {
  const at = robotAt(scene, t), trail: [number, number][] = [scene.start, ...scene.steps.filter(s => s.kind === 'move' && s.t <= t).map(s => [s.r, s.c] as [number, number])]
  const finished = t === Infinity
  return <div className="robot-scene">
    <RobotField world={{ rows: scene.rows, cols: scene.cols, walls: scene.walls, targets: scene.targets.map(cell => cell.join(':')), parking: scene.parking.map(cell => cell.join(':')) }} r={at.r} c={at.c} filled={at.filled} crashed={at.crashed} trail={trail} />
    {finished && (scene.targets.length > 0 || scene.parking.length > 0) && <p className={`robot-verdict ${scene.result.solved ? 'ok' : 'bad'}`} role="status">{scene.result.solved ? '✓ Поле выполнено: все нужные клетки закрашены' + (scene.parking.length ? ', Робот на парковке.' : '.') : scene.result.problems.join(' ')}</p>}
  </div>
}
/** A task's field written as text, drawn for the learner and for the teacher's preview. */
export function WorldPreview({ text }: { text: string }) {
  let world: World
  try { world = parseWorld(text) } catch (e) { return <p className="error" role="alert">Поле Робота: {(e as Error).message}</p> }
  return <RobotField world={world} r={world.start[0]} c={world.start[1]} filled={new Set(world.filled)} label={`Поле Робота ${world.rows}×${world.cols}: Робот в строке ${world.start[0] + 1}, столбце ${world.start[1] + 1}; нужно закрасить клеток: ${world.targets.size}${world.parking.size ? '; есть парковка' : ''}`} />
}

// ---------- plots ----------
function niceTicks(lo: number, hi: number, count = 6): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
  if (lo === hi) { lo -= 1; hi += 1 }
  const raw = (hi - lo) / count, power = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * power).find(s => s >= raw)!
  const ticks: number[] = []
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v)
  return ticks
}
const label = (v: number) => { const s = Number(v.toPrecision(10)); return Math.abs(s) >= 1e6 || Math.abs(s) > 0 && Math.abs(s) < 1e-4 ? s.toExponential(1) : String(s).replace('-', '−') }
const dash: Record<string, string | undefined> = { '-': undefined, '--': '6 4', ':': '1.5 3', '-.': '6 3 1.5 3' }
function Marker({ x, y, marker, color, size }: { x: number; y: number; marker: string; color: string; size: number }) {
  const r = size / 2
  if (marker === 's') return <rect x={x - r} y={y - r} width={size} height={size} fill={color} />
  if (marker === '^' || marker === 'v') { const d = marker === '^' ? -1 : 1; return <polygon points={`${x},${y + d * r} ${x - r},${y - d * r} ${x + r},${y - d * r}`} fill={color} /> }
  if (marker === '+' || marker === 'x' || marker === '|' || marker === '_') { const k = marker === 'x' ? r * 0.7 : r; return <g stroke={color} strokeWidth={1.5}>{marker !== '_' && <line x1={marker === 'x' ? x - k : x} y1={y - k} x2={marker === 'x' ? x + k : x} y2={y + k} />}{marker !== '|' && <line x1={x - k} y1={marker === 'x' ? y + k : y} x2={x + k} y2={marker === 'x' ? y - k : y} />}</g> }
  if (marker === 'D' || marker === 'd') return <polygon points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`} fill={color} />
  if (marker === '*') return <text x={x} y={y + r * 0.8} fontSize={size * 1.6} textAnchor="middle" fill={color}>★</text>
  return <circle cx={x} cy={y} r={marker === '.' ? Math.max(1.5, r / 2) : marker === ',' ? 1 : r} fill={color} />
}
export function PlotView({ shot }: { shot: FigureShot }) {
  const f: Figure = shot.figure, W = 640, H = 420, m = { l: 64, r: 20, t: f.title ? 40 : 18, b: f.xlabel ? 56 : 36 }
  // Categories of bar charts become positions 0, 1, 2… with their labels on the axis.
  const categories: string[] = []
  const pos = (v: number | string) => { if (typeof v === 'number') return v; let i = categories.indexOf(v); if (i < 0) { categories.push(v); i = categories.length - 1 } return i }
  const xs: number[] = [], ys: number[] = []
  let stickyY = false
  for (const s of f.series) {
    if (s.type === 'line' || s.type === 'scatter') { xs.push(...s.x); ys.push(...s.y) }
    else if (s.type === 'bar') { const p = s.x.map(pos); if (s.horizontal) { ys.push(...p.map(v => v - s.width / 2), ...p.map(v => v + s.width / 2)); xs.push(0, ...s.height) } else { xs.push(...p.map(v => v - s.width / 2), ...p.map(v => v + s.width / 2)); ys.push(0, ...s.height); stickyY = true } }
    else { xs.push(s.edges[0], s.edges[s.edges.length - 1]); ys.push(0, ...s.counts); stickyY = true }
  }
  const finite = (a: number[]) => a.filter(Number.isFinite)
  const span = (a: number[], sticky: boolean): [number, number] => { const v = finite(a); if (!v.length) return [0, 1]; let lo = Math.min(...v), hi = Math.max(...v); if (lo === hi) { lo -= 0.5; hi += 0.5 } const pad = (hi - lo) * 0.05; return [sticky && lo >= 0 ? lo : lo - pad, hi + pad] }
  const [xa, xb] = f.xlim ?? span(xs, false), [ya, yb] = f.ylim ?? span(ys, stickyY)
  const X = (v: number) => m.l + (v - xa) / (xb - xa) * (W - m.l - m.r), Y = (v: number) => H - m.b - (v - ya) / (yb - ya) * (H - m.t - m.b)
  const horizontalBars = f.series.some(s => s.type === 'bar' && s.horizontal)
  const xticks = categories.length && !horizontalBars ? categories.map((_, i) => i) : niceTicks(Math.min(xa, xb), Math.max(xa, xb)), yticks = categories.length && horizontalBars ? categories.map((_, i) => i) : niceTicks(Math.min(ya, yb), Math.max(ya, yb))
  const legend = f.legend ? f.series.filter(s => s.label && !s.label.startsWith('_')) : []
  const describe = f.series.map(s => s.type === 'line' ? 'линия' : s.type === 'scatter' ? 'точки' : s.type === 'bar' ? 'столбцы' : 'гистограмма').join(', ')
  return <figure className="plot-view">
    <svg role="img" aria-label={`График${f.title ? ` «${f.title}»` : ''}: ${describe || 'пустой'}${f.xlabel ? `; ось X — ${f.xlabel}` : ''}${f.ylabel ? `; ось Y — ${f.ylabel}` : ''}`} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      <defs><clipPath id={`clip-${f.id}`}><rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} /></clipPath></defs>
      {f.grid && <g className="plot-grid">{xticks.map(v => <line key={`gx${v}`} x1={X(v)} x2={X(v)} y1={m.t} y2={H - m.b} />)}{yticks.map(v => <line key={`gy${v}`} x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} />)}</g>}
      <g clipPath={`url(#clip-${f.id})`}>
        {f.series.map((s: Series, i) => {
          if (s.type === 'hist') return <g key={i}>{s.counts.map((n, k) => <rect key={k} x={X(s.edges[k])} y={Y(n)} width={Math.max(0, X(s.edges[k + 1]) - X(s.edges[k]))} height={Math.max(0, Y(0) - Y(n))} fill={s.color} stroke={s.edgecolor} strokeWidth={s.edgecolor ? 1 : 0} />)}</g>
          if (s.type === 'bar') return <g key={i}>{s.x.map((v, k) => { const p = pos(v), h = s.height[k]; return s.horizontal ? <rect key={k} x={X(Math.min(0, h))} y={Y(p + s.width / 2)} width={Math.abs(X(h) - X(0))} height={Math.abs(Y(p - s.width / 2) - Y(p + s.width / 2))} fill={s.color} /> : <rect key={k} x={X(p - s.width / 2)} y={Y(Math.max(0, h))} width={Math.abs(X(p + s.width / 2) - X(p - s.width / 2))} height={Math.abs(Y(0) - Y(h))} fill={s.color} /> })}</g>
          if (s.type === 'scatter') return <g key={i}>{s.x.map((v, k) => <Marker key={k} x={X(v)} y={Y(s.y[k])} marker={s.marker} color={s.color} size={Math.sqrt(s.size) * 1.1} />)}</g>
          return <g key={i}>
            {s.linestyle !== 'None' && <polyline points={s.x.map((v, k) => `${X(v)},${Y(s.y[k])}`).join(' ')} fill="none" stroke={s.color} strokeWidth={s.linewidth * 1.33} strokeDasharray={dash[s.linestyle]} strokeLinejoin="round" />}
            {s.marker && s.x.map((v, k) => <Marker key={k} x={X(v)} y={Y(s.y[k])} marker={s.marker!} color={s.color} size={8} />)}
          </g>
        })}
      </g>
      <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} fill="none" stroke="#222" />
      <g className="plot-ticks" fontSize={12} fill="#222">
        {xticks.map(v => <g key={`x${v}`}><line x1={X(v)} x2={X(v)} y1={H - m.b} y2={H - m.b + 5} stroke="#222" /><text x={X(v)} y={H - m.b + 19} textAnchor="middle">{categories.length && !horizontalBars ? categories[v] : label(v)}</text></g>)}
        {yticks.map(v => <g key={`y${v}`}><line x1={m.l - 5} x2={m.l} y1={Y(v)} y2={Y(v)} stroke="#222" /><text x={m.l - 8} y={Y(v) + 4} textAnchor="end">{categories.length && horizontalBars ? categories[v] : label(v)}</text></g>)}
      </g>
      {f.title && <text x={(m.l + W - m.r) / 2} y={26} textAnchor="middle" fontSize={16} fill="#222">{f.title}</text>}
      {f.xlabel && <text x={(m.l + W - m.r) / 2} y={H - 12} textAnchor="middle" fontSize={13} fill="#222">{f.xlabel}</text>}
      {f.ylabel && <text transform={`translate(16 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={13} fill="#222">{f.ylabel}</text>}
      {legend.length > 0 && <g transform={`translate(${W - m.r - 170} ${m.t + 8})`}>
        <rect width={162} height={legend.length * 20 + 8} fill="#fff" fillOpacity={0.85} stroke="#ccc" rx={3} />
        {legend.map((s, i) => <g key={i} transform={`translate(8 ${i * 20 + 16})`}>{s.type === 'line' ? <line x1={0} x2={22} y1={-4} y2={-4} stroke={s.color} strokeWidth={2} strokeDasharray={dash[s.linestyle]} /> : <rect x={4} y={-10} width={12} height={12} fill={s.color} />}<text x={30} y={0} fontSize={12} fill="#222">{s.label!.slice(0, 22)}</text></g>)}
      </g>}
    </svg>
    {shot.auto && <figcaption className="muted">График показан в конце программы. В обычном Python для показа нужен plt.show().</figcaption>}
  </figure>
}
