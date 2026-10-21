// What a test checks besides the printed text. Used by the sandboxed checker (server/b2b/runner-entry.ts)
// with the task's reference solution run on the same input and field; never sent to the learner's page.
//   output  — printed text equals the expected text (the old behaviour; the default);
//   drawing — the final turtle picture equals the reference picture (order of drawing does not matter);
//   robot   — the Robot solved the field: every * cell filled, nothing extra, finished on P, no crash;
//   plot    — the shown figures have the reference's chart types, data, titles, labels, grid and legend.
import { figuresAt, turtleAt, type FigureShot, type Pose, type RobotScene, type Scene, type Series, type TurtleItem, type TurtleScene } from './scene'
import { cssColor } from './colors'

export const SCENE_CHECKS = ['output', 'drawing', 'robot', 'plot'] as const
export type SceneCheckKind = typeof SCENE_CHECKS[number]
export type SceneVerdict = { passed: boolean; message: string }
const ok: SceneVerdict = { passed: true, message: '' }

// ---------- turtle picture ----------
const GRID = 2
const hex = (c: string) => cssColor(c) ?? c
type TextItem = Extract<TurtleItem, { kind: 'text' }>
function raster(scene: TurtleScene | undefined) {
  const points = new Map<string, string>(), texts: TextItem[] = [], stamps: Pose[] = []
  let complete = true
  if (!scene) return { points, texts, stamps, bg: '#ffffff', complete }
  const state = turtleAt(scene), put = (x: number, y: number, color: string, layer: string) => points.set(`${layer}:${Math.round(x / GRID)}:${Math.round(y / GRID)}`, color)
  let budget = 400000
  const result = () => ({ points, texts, stamps, bg: hex(state.bg), complete })
  const spend = () => { if (--budget < 0) { complete = false; return false } return true }
  for (const item of state.items) {
    if (item.kind === 'line') {
      const length = Math.hypot(item.x2 - item.x1, item.y2 - item.y1), steps = Math.max(1, Math.ceil(length / (GRID / 2)))
      for (let i = 0; i <= steps; i++) { if (!spend()) return result(); put(item.x1 + (item.x2 - item.x1) * i / steps, item.y1 + (item.y2 - item.y1) * i / steps, hex(item.color), 'l') }
    } else if (item.kind === 'dot') {
      const r = item.size / 2
      for (let dx = -r; dx <= r; dx += GRID) for (let dy = -r; dy <= r; dy += GRID) { if (!spend()) return result(); if (dx * dx + dy * dy <= r * r) put(item.x + dx, item.y + dy, hex(item.color), 'f') }
    } else if (item.kind === 'fill') {
      const xs = item.points.filter((_, i) => i % 2 === 0), ys = item.points.filter((_, i) => i % 2 === 1)
      const step = GRID * 2
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) {
        if (!spend()) return result()
        let inside = false
        for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) { if (!spend()) return result(); if ((ys[i] > y) !== (ys[j] > y) && x < (xs[j] - xs[i]) * (y - ys[i]) / (ys[j] - ys[i]) + xs[i]) inside = !inside }
        if (inside) put(x, y, hex(item.color), 'f')
      }
    } else if (item.kind === 'text') texts.push(item)
    else if (item.kind === 'stamp' && item.pose.shape !== 'blank') stamps.push(item.pose)
  }
  return result()
}
const samePosition = (a: { x: number; y: number }, e: { x: number; y: number }) => Math.abs(a.x - e.x) <= GRID && Math.abs(a.y - e.y) <= GRID
const chosenColor = (a: string, e: string) => hex(e) === '#000000' || hex(a) === hex(e)
function sameTexts(actual: TextItem[], expected: TextItem[]): boolean {
  const sort = (a: TextItem, b: TextItem) => a.text.localeCompare(b.text) || a.x - b.x || a.y - b.y
  const a = [...actual].sort(sort), e = [...expected].sort(sort)
  return a.length === e.length && e.every((v, i) => v.text === a[i].text && samePosition(a[i], v) && a[i].align === v.align && a[i].size === v.size && a[i].weight === v.weight && chosenColor(a[i].color, v.color))
}
function sameStamps(actual: Pose[], expected: Pose[]): boolean {
  const angle = (p: Pose) => { const period = p.shape === 'circle' ? 1 : p.shape === 'square' ? 90 : p.shape === 'triangle' ? 120 : 360; return p.shape === 'circle' ? 0 : ((p.heading % period) + period) % period }
  const sort = (a: Pose, b: Pose) => a.shape.localeCompare(b.shape) || a.x - b.x || a.y - b.y || angle(a) - angle(b) || a.stretch - b.stretch
  const a = [...actual].sort(sort), e = [...expected].sort(sort)
  return a.length === e.length && e.every((v, i) => v.shape === a[i].shape && samePosition(a[i], v) && Math.abs(a[i].stretch - v.stretch) <= 1e-9 && Math.abs(angle(a[i]) - angle(v)) <= 1e-9 && chosenColor(a[i].pen, v.pen) && chosenColor(a[i].fill, v.fill))
}
function near(map: Map<string, string>, key: string, color: string | undefined): boolean {
  const [layer, x, y] = key.split(':'), cx = Number(x), cy = Number(y)
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const other = map.get(`${layer}:${cx + dx}:${cy + dy}`); if (other !== undefined && (color === undefined || other === color)) return true }
  return false
}
function where(keys: string[]): string {
  const xs = keys.map(k => Number(k.split(':')[1]) * GRID), ys = keys.map(k => Number(k.split(':')[2]) * GRID)
  return `около x = ${Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)}, y = ${Math.round(ys.reduce((a, b) => a + b, 0) / ys.length)}`
}
export function compareDrawing(actual: TurtleScene | undefined, expected: TurtleScene | undefined): SceneVerdict {
  if (!actual || !actual.items.length) return { passed: false, message: 'Черепаха ничего не нарисовала. Подключи turtle (import turtle) и опусти перо перед движением.' }
  const a = raster(actual), e = raster(expected)
  if (!a.complete || !e.complete) return { passed: false, message: 'Рисунок слишком большой или сложный для сравнения. Уменьши размеры или число деталей.' }
  if (!a.points.size && !a.texts.length && !a.stamps.length) return { passed: false, message: 'Черепаха ничего не нарисовала: итоговый рисунок пуст. Проверь clear(), reset() и положение пера.' }
  // Colour matters only when the reference chose colours; a task about shape accepts any pen colour.
  const colourMatters = [...e.points.values()].some(c => c !== '#000000')
  const missing = [...e.points].filter(([k, c]) => !near(a.points, k, colourMatters ? c : undefined)).map(([k]) => k)
  const extra = [...a.points].filter(([k, c]) => !near(e.points, k, colourMatters ? c : undefined)).map(([k]) => k)
  const tolerance = (n: number) => Math.max(3, n * 0.03)
  if (missing.length > tolerance(e.points.size) || extra.length > tolerance(a.points.size)) {
    const shapeMissing = [...e.points.keys()].filter(k => !near(a.points, k, undefined)).length
    const shapeExtra = [...a.points.keys()].filter(k => !near(e.points, k, undefined)).length
    if (shapeMissing <= tolerance(e.points.size) && shapeExtra <= tolerance(a.points.size)) return { passed: false, message: 'Форма рисунка верная, но цвет линий или заливки другой. Проверь color, pencolor и fillcolor.' }
    if (missing.length > tolerance(e.points.size)) return { passed: false, message: `Рисунок отличается: не хватает части рисунка ${where(missing)}. Проверь длины, углы и число повторений.` }
    return { passed: false, message: `Рисунок отличается: есть лишние линии ${where(extra)}. Проверь длины, углы и penup/pendown.` }
  }
  if (!sameTexts(a.texts, e.texts)) return { passed: false, message: 'Надписи на рисунке отличаются. Проверь текст, положение и оформление write().' }
  if (!sameStamps(a.stamps, e.stamps)) return { passed: false, message: 'Штампы на рисунке отличаются. Проверь форму, положение, размер и направление stamp().' }
  if (e.bg !== a.bg) return { passed: false, message: 'Цвет фона отличается. Проверь bgcolor().' }
  return ok
}

// ---------- Robot ----------
export function checkRobot(actual: RobotScene | undefined): SceneVerdict {
  if (!actual) return { passed: false, message: 'Программа не управляет Роботом. Подключи команды: from pyrob.api import *.' }
  if (actual.result.solved) return ok
  return { passed: false, message: `Задание Робота не выполнено: ${actual.result.problems.join(' ')}` }
}

// ---------- plots ----------
const close = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && (x === y || Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y)))
const kind: Record<Series['type'], string> = { line: 'линия', scatter: 'точечная диаграмма', bar: 'столбчатая диаграмма', hist: 'гистограмма' }
function sameSeries(a: Series, e: Series, n: number): string | undefined {
  if (a.type !== e.type) return `Набор данных ${n}: ожидается ${kind[e.type]}, а построена ${kind[a.type]}.`
  if (e.type === 'hist' && a.type === 'hist') {
    if (a.counts.length !== e.counts.length) return `Гистограмма ${n}: другое число столбиков (bins).`
    if (!a.edges.every((v, i) => close(v, e.edges[i])) || !a.counts.every((v, i) => close(v, e.counts[i]))) return `Гистограмма ${n}: другие данные или границы столбиков.`
  } else if (e.type === 'bar' && a.type === 'bar') {
    if (a.x.length !== e.x.length || a.x.some((v, i) => typeof v === 'number' && typeof e.x[i] === 'number' ? !close(v, e.x[i] as number) : v !== e.x[i])) return `Диаграмма ${n}: другие подписи или положения столбиков.`
    const i = a.height.findIndex((v, k) => !close(v, e.height[k]))
    if (i >= 0) return `Диаграмма ${n}: высота столбика «${e.x[i]}» ${a.height[i]}, а нужно ${e.height[i]}.`
    if (!!a.horizontal !== !!e.horizontal) return `Диаграмма ${n}: ${e.horizontal ? 'нужны горизонтальные столбики (barh)' : 'нужны вертикальные столбики (bar)'}.`
  } else if ('x' in a && 'x' in e && (e.type === 'line' || e.type === 'scatter') && (a.type === 'line' || a.type === 'scatter')) {
    if (a.x.length !== e.x.length) return `Набор данных ${n}: ${a.x.length} точек, а нужно ${e.x.length}.`
    const i = a.x.findIndex((v, k) => !close(v, e.x[k]) || !close(a.y[k], e.y[k]))
    if (i >= 0) return `Набор данных ${n}: точка ${i + 1} — (${a.x[i]}, ${a.y[i]}), а нужно (${e.x[i]}, ${e.y[i]}).`
  }
  if (e.label !== undefined && a.label !== e.label) return `Набор данных ${n}: подпись для легенды должна быть «${e.label}».`
  return undefined
}
export function comparePlots(actual: FigureShot[] | undefined, expected: FigureShot[] | undefined): SceneVerdict {
  const a = figuresAt(actual ?? []), e = figuresAt(expected ?? [])
  if (!a.length) return { passed: false, message: 'Программа не построила график. Подключи import matplotlib.pyplot as plt и вызови plt.show().' }
  if (a.length !== e.length) return { passed: false, message: `Показано графиков: ${a.length}, а нужно ${e.length}.` }
  for (const [i, shot] of e.entries()) {
    const f = shot.figure, g = a[i].figure, prefix = e.length > 1 ? `График ${i + 1}: ` : ''
    if (g.series.length !== f.series.length) return { passed: false, message: `${prefix}наборов данных ${g.series.length}, а нужно ${f.series.length}.` }
    for (const [k, s] of f.series.entries()) { const problem = sameSeries(g.series[k], s, k + 1); if (problem) return { passed: false, message: prefix + problem } }
    for (const [key, name] of [['title', 'заголовок'], ['xlabel', 'подпись оси X'], ['ylabel', 'подпись оси Y']] as const)
      if (f[key] !== undefined && (g[key] ?? '').trim() !== f[key]!.trim()) return { passed: false, message: `${prefix}${name} должен быть «${f[key]}»${g[key] ? `, а сейчас «${g[key]}»` : ''}.` }
    if (f.grid && !g.grid) return { passed: false, message: `${prefix}включи сетку: plt.grid(True).` }
    if (f.legend && !g.legend) return { passed: false, message: `${prefix}добавь легенду: plt.legend().` }
    for (const key of ['xlim', 'ylim'] as const) if (f[key] && (!g[key] || !g[key]!.every((v, j) => close(v, f[key]![j])))) return { passed: false, message: `${prefix}границы оси ${key === 'xlim' ? 'X' : 'Y'} должны быть ${f[key]!.join(' … ')}.` }
  }
  return ok
}

/** All requested scene checks for one test, the first failing one wins. */
export function checkScene(checks: readonly string[], actual: Scene | undefined, expected: Scene | undefined): SceneVerdict {
  for (const check of checks) {
    const verdict = check === 'drawing' ? compareDrawing(actual?.turtle, expected?.turtle) : check === 'robot' ? checkRobot(actual?.robot) : check === 'plot' ? comparePlots(actual?.plots, expected?.plots) : ok
    if (!verdict.passed) return verdict
  }
  return ok
}
