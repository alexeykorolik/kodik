// matplotlib.pyplot: line plots, scatter, bar charts and histograms with titles, axis labels, grid,
// legend and limits. Figures are shown by plt.show() (and plt.pause() for animation); a figure left
// unshown at the end of the program is shown too, so a forgotten show() does not hide the work.
import type { Figure, FigureShot, Series } from './scene'
import { cssColor } from './colors'
import { pause } from './libBasic'
import { NdArray, toArray } from './libNumpy'
import { PyModule, PyNative, PyObject, PyTuple, arg, bind, int, none, num, text, type Arg, type Ctx, type Keywords } from './values'

const cycle = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
const short: Record<string, string> = { b: '#0000ff', g: '#008000', r: '#ff0000', c: '#00bfbf', m: '#bf00bf', y: '#bfbf00', k: '#000000', w: '#ffffff' }
const markers = new Set(['o', '.', ',', 'v', '^', '<', '>', 's', '*', '+', 'x', 'D', 'd', 'p', 'h', 'H', '8', '|', '_'])
const LIMIT_POINTS = 20000, LIMIT_SHOTS = 300

class Opaque extends PyObject { constructor(public typeName: string, private text: string) { super() } repr() { return this.text } }

class FigureState {
  title?: string; xlabel?: string; ylabel?: string; grid = false; legend = false; labels?: string[]
  xlim?: [number, number]; ylim?: [number, number]; series: Series[] = []; lines = 0; patches = 0
  constructor(public id: number, public number: number) {}
  empty() { return !this.series.length && !this.title && !this.xlabel && !this.ylabel }
  snapshot(): Figure {
    const series = this.series.map((s, i) => this.labels && this.labels[i] !== undefined ? { ...s, label: this.labels[i] } : s)
    return JSON.parse(JSON.stringify({ id: this.id, title: this.title, xlabel: this.xlabel, ylabel: this.ylabel, grid: this.grid, legend: this.legend, xlim: this.xlim, ylim: this.ylim, series }))
  }
  clear() { Object.assign(this, { title: undefined, xlabel: undefined, ylabel: undefined, grid: false, legend: false, labels: undefined, xlim: undefined, ylim: undefined, series: [], lines: 0, patches: 0 }) }
}

function color(v: Arg | undefined, ctx: Ctx, fallback: string): string {
  if (!v || v.value === null) return fallback
  if (typeof v.value === 'string') {
    const s = v.value.trim()
    if (/^C\d$/.test(s)) return cycle[Number(s[1])]
    const c = short[s] ?? cssColor(s) ?? (/^#[0-9a-f]{8}$/i.test(s) ? s.slice(0, 7) : undefined)
    if (c) return c
    return ctx.fail(`Неизвестный цвет «${s}». Используй, например, "red", "C1", "#ff8800" или букву r, g, b, k.`)
  }
  const parts = ctx.items(v.value, 'цвет').map(p => num(p, ctx))
  if ((parts.length !== 3 && parts.length !== 4) || parts.some(p => p < 0 || p > 1)) ctx.fail('Цвет из чисел — три значения от 0 до 1: (r, g, b).')
  return '#' + parts.slice(0, 3).map(p => Math.round(p * 255).toString(16).padStart(2, '0')).join('')
}
function numbers(v: Arg, ctx: Ctx, what: string): number[] {
  if (typeof v.value === 'number' || typeof v.value === 'boolean') return [Number(v.value)]
  const a = toArray(v, ctx)
  if (a.shape.length > 1) ctx.fail(`${what}: нужен одномерный список чисел.`)
  return a.data
}
function categories(v: Arg, ctx: Ctx): (number | string)[] {
  const items = v.value instanceof NdArray ? v.value.data : typeof v.value === 'number' || typeof v.value === 'string' ? [v.value] : ctx.items(v.value, 'значения').map(item => typeof item.value === 'string' ? item.value : num(item, ctx))
  return items as (number | string)[]
}
function parseFormat(fmt: string, ctx: Ctx): { color?: string; marker?: string; linestyle?: string } {
  const result: { color?: string; marker?: string; linestyle?: string } = {}
  let rest = fmt
  for (const style of ['--', '-.', '-', ':']) if (rest.includes(style)) { result.linestyle = style; rest = rest.replace(style, ''); break }
  for (const ch of [...rest]) {
    if (short[ch] && !result.color) result.color = short[ch]
    else if (markers.has(ch) && !result.marker) result.marker = ch
    else ctx.fail(`Непонятная строка формата «${fmt}». Пример: "r-", "bo", "g--".`)
  }
  return result
}

export function pyplotModule(ctx: Ctx): { pyplot: PyModule; package: PyModule } {
  const shots: FigureShot[] = ctx.scene.plots ?? (ctx.scene.plots = [])
  let ids = 0, numbers_ = 0, points = 0
  const open: FigureState[] = []
  let current: FigureState | undefined
  const fig = () => { if (!current) { current = new FigureState(++ids, ++numbers_); open.push(current) } return current }
  const shoot = (f: FigureState, auto = false) => {
    if (shots.length >= LIMIT_SHOTS) ctx.fail('Слишком много кадров графика. Уменьши число вызовов plt.pause или plt.show.')
    shots.push({ t: ctx.clock.now, figure: f.snapshot(), ...(auto ? { auto: true } : {}) })
  }
  const close = (f: FigureState) => { open.splice(open.indexOf(f), 1); if (current === f) current = open.at(-1) }
  ctx.scene.onFinish(() => { for (const f of [...open]) if (!f.empty()) shoot(f, true) })
  const add = (f: FigureState, s: Series) => {
    const count = 'x' in s ? s.x.length : s.type === 'hist' ? s.counts.length : 0
    if ((points += count) > LIMIT_POINTS) ctx.fail(`На графиках больше ${LIMIT_POINTS} точек.`)
    if (f.series.length >= 100) ctx.fail('На одном графике больше 100 наборов данных.')
    f.series.push(s)
  }
  const label = (v: Arg | undefined, c: Ctx) => v && v.value !== null ? c.str(v).slice(0, 120) : undefined

  // ---- drawing functions shared by plt.* and Axes methods ----
  const plot = (f: FigureState, args: Arg[], kw: Keywords, c: Ctx): Arg => {
    for (const name of kw.keys()) if (!['color', 'c', 'label', 'linestyle', 'ls', 'linewidth', 'lw', 'marker', 'markersize', 'ms', 'alpha'].includes(name)) c.fail(`У plot() в Kodik нет аргумента «${name}».`)
    if (!args.length) c.fail('plot(): передай значения y или x и y.')
    const groups: { x?: Arg; y: Arg; fmt?: string }[] = []
    let i = 0
    while (i < args.length) {
      const a = args[i], b = args[i + 1], d = args[i + 2]
      if (typeof a.value === 'string') c.fail('plot(): строку формата пишут после данных, например plot(x, y, "r-").')
      if (b && typeof b.value !== 'string') { groups.push({ x: a, y: b, fmt: d && typeof d.value === 'string' ? d.value : undefined }); i += d && typeof d.value === 'string' ? 3 : 2 }
      else { groups.push({ y: a, fmt: b ? (b.value as string) : undefined }); i += b ? 2 : 1 }
    }
    for (const g of groups) {
      const y = numbers(g.y, c, 'plot'), x = g.x ? numbers(g.x, c, 'plot') : y.map((_, k) => k)
      if (x.length !== y.length) c.fail(`plot(): у x ${x.length} значений, а у y — ${y.length}. Длины должны совпадать.`)
      const fmt = g.fmt ? parseFormat(g.fmt, c) : {}
      const marker = kw.get('marker')?.value ?? fmt.marker
      if (marker !== undefined && marker !== null && (typeof marker !== 'string' || marker && !markers.has(marker))) c.fail('plot(): маркер — один из "o", ".", "s", "^", "v", "*", "+", "x", "D".')
      const ls = (kw.get('linestyle') ?? kw.get('ls'))?.value ?? (fmt.linestyle ?? (fmt.marker ? 'None' : '-'))
      const linestyle = ({ solid: '-', dashed: '--', dotted: ':', dashdot: '-.', '': 'None', none: 'None' } as Record<string, string>)[String(ls)] ?? String(ls)
      if (!['-', '--', ':', '-.', 'None'].includes(linestyle)) c.fail('plot(): стиль линии "-", "--", ":" или "-.".')
      const colour = color(kw.get('color') ?? kw.get('c'), c, fmt.color ?? cycle[f.lines % 10])
      f.lines++
      const lw = kw.get('linewidth') ?? kw.get('lw')
      add(f, { type: 'line', x, y, color: colour, linestyle, linewidth: lw ? num(lw, c) : 1.5, ...(marker ? { marker: marker as string } : {}), ...(label(kw.get('label'), c) !== undefined ? { label: label(kw.get('label'), c) } : {}) })
    }
    return { value: c.list(groups.map(() => ({ value: new Opaque('Line2D', '<Line2D>') }))) }
  }
  const scatter = (f: FigureState, args: Arg[], kw: Keywords, c: Ctx): Arg => {
    const p = bind('scatter', args, kw, ['x', 'y', 's', 'c', 'marker', 'color', 'label', 'alpha', 'edgecolors'], 2, c)
    const x = numbers(p.x!, c, 'scatter'), y = numbers(p.y!, c, 'scatter')
    if (x.length !== y.length) c.fail(`scatter(): у x ${x.length} значений, а у y — ${y.length}.`)
    const marker = p.marker ? text(p.marker, c, 'маркер') : 'o'
    if (!markers.has(marker)) c.fail('scatter(): маркер — один из "o", ".", "s", "^", "v", "*", "+", "x", "D".')
    if (p.c && typeof p.c.value !== 'string' && !(p.c.value instanceof PyTuple)) c.fail('scatter(): в Kodik c= задаёт один цвет для всех точек.')
    add(f, { type: 'scatter', x, y, color: color(p.color ?? p.c, c, cycle[f.patches++ % 10]), marker, size: p.s ? num(p.s, c) : 36, ...(label(p.label, c) !== undefined ? { label: label(p.label, c) } : {}) })
    return { value: new Opaque('PathCollection', '<matplotlib.collections.PathCollection>') }
  }
  const bar = (f: FigureState, args: Arg[], kw: Keywords, c: Ctx, horizontal = false): Arg => {
    const names = horizontal ? ['y', 'width', 'height', 'left', 'color', 'label', 'edgecolor', 'align', 'alpha'] : ['x', 'height', 'width', 'bottom', 'color', 'label', 'edgecolor', 'align', 'alpha']
    const p = bind(horizontal ? 'barh' : 'bar', args, kw, names, 2, c)
    const x = categories(p[names[0]]!, c), sizes = numbers(p[names[1]]!, c, 'bar'), heights = sizes.length === 1 && x.length > 1 ? x.map(() => sizes[0]) : sizes
    if (x.length !== heights.length) c.fail(`${horizontal ? 'barh' : 'bar'}(): у категорий ${x.length} значений, а у высот — ${heights.length}.`)
    if (p[names[3]] && p[names[3]]!.value !== null) c.fail('bar(): bottom/left (составные столбики) в Kodik не поддерживаются.')
    add(f, { type: 'bar', x, height: heights, color: color(p.color, c, cycle[f.patches++ % 10]), width: p[names[2]] ? num(p[names[2]], c) : 0.8, ...(horizontal ? { horizontal: true } : {}), ...(label(p.label, c) !== undefined ? { label: label(p.label, c) } : {}) })
    return { value: new Opaque('BarContainer', `<BarContainer object of ${x.length} artists>`) }
  }
  const hist = (f: FigureState, args: Arg[], kw: Keywords, c: Ctx): Arg => {
    const p = bind('hist', args, kw, ['x', 'bins', 'range', 'color', 'edgecolor', 'label', 'alpha', 'density'], 1, c)
    const data = numbers(p.x!, c, 'hist').filter(v => !Number.isNaN(v))
    if (p.density && c.truth(p.density.value)) c.fail('hist(density=True) в Kodik не поддерживается.')
    let edges: number[], edgeType: 'int' | 'float' = 'float'
    if (p.bins && (Array.isArray(p.bins.value) || p.bins.value instanceof NdArray || p.bins.value instanceof PyTuple)) {
      const given = toArray(p.bins, c); edgeType = given.dtype === 'float' ? 'float' : 'int'
      edges = numbers(p.bins, c, 'bins'); if (edges.length < 2 || edges.some((e, i) => i && e <= edges[i - 1])) c.fail('hist(): границы bins должны возрастать.')
    } else {
      const count = p.bins ? int(p.bins, c, 'число столбиков') : 10
      if (count < 1 || count > 500) c.fail('hist(): число столбиков от 1 до 500.')
      let lo: number, hi: number
      if (p.range && p.range.value !== null) [lo, hi] = c.items(p.range.value).map(v => num(v, c))
      else { lo = data.length ? Math.min(...data) : 0; hi = data.length ? Math.max(...data) : 1 }
      if (lo === hi) { lo -= 0.5; hi += 0.5 }
      edges = Array.from({ length: count + 1 }, (_, i) => lo + i * (hi - lo) / count); edges[count] = hi
    }
    const n = edges.length - 1, counts = Array(n).fill(0), first = edges[0], last = edges[n]
    for (const v of data) {
      if (v < first || v > last) continue
      // numpy.histogram: half-open bins [e_i, e_i+1), the last one also includes its right edge.
      let lo = 0, hi = n
      while (lo < hi) { const mid = (lo + hi) >> 1; if (edges[mid + 1] <= v) lo = mid + 1; else hi = mid }
      counts[Math.min(lo, n - 1)]++
      c.tick()
    }
    add(f, { type: 'hist', edges, counts, color: color(p.color, c, cycle[f.patches++ % 10]), ...(p.edgecolor ? { edgecolor: color(p.edgecolor, c, '#000000') } : {}), ...(label(p.label, c) !== undefined ? { label: label(p.label, c) } : {}) })
    return { value: c.tuple([{ value: new NdArray(counts, [n], 'float') }, { value: new NdArray(edges, [edges.length], edgeType) }, { value: new Opaque('BarContainer', `<BarContainer object of ${n} artists>`) }]) }
  }
  const limits = (f: FigureState, axis: 'xlim' | 'ylim', args: Arg[], kw: Keywords, c: Ctx): Arg | void => {
    const names = axis === 'xlim' ? ['left', 'right'] : ['bottom', 'top']
    const p = bind(axis, args.length === 1 && (args[0].value instanceof PyTuple || Array.isArray(args[0].value)) ? c.items(args[0].value) : args, kw, names, 0, c)
    if (!p[names[0]] && !p[names[1]]) { const v = f[axis] ?? [0, 1]; return { value: c.tuple(v.map(x => ({ value: x, float: true }))) } }
    const old = f[axis] ?? [NaN, NaN], lo = p[names[0]] && p[names[0]]!.value !== null ? num(p[names[0]], c) : old[0], hi = p[names[1]] && p[names[1]]!.value !== null ? num(p[names[1]], c) : old[1]
    if (lo === hi) c.fail(`${axis}(): границы оси не должны совпадать.`)
    f[axis] = [lo, hi]
  }
  const textSetter = (key: 'title' | 'xlabel' | 'ylabel') => (f: FigureState, args: Arg[], kw: Keywords, c: Ctx): Arg | void => {
    for (const name of kw.keys()) if (!['fontsize', 'size', 'loc', 'color', 'fontweight', 'pad', 'labelpad'].includes(name)) c.fail(`У ${key}() в Kodik нет аргумента «${name}».`)
    if (args.length !== 1) c.fail(`${key}() принимает одну строку.`)
    f[key] = c.str(args[0]).slice(0, 200)
  }
  const grid = (f: FigureState, args: Arg[], kw: Keywords, c: Ctx) => {
    const p = bind('grid', args, kw, ['visible', 'which', 'axis', 'color', 'linestyle', 'linewidth', 'alpha', 'b'], 0, c)
    const v = p.visible ?? p.b
    f.grid = v && v.value !== null ? c.truth(v.value) : (kw.size ? true : !f.grid)
  }
  const legend = (f: FigureState, args: Arg[], kw: Keywords, c: Ctx) => {
    for (const name of kw.keys()) if (!['loc', 'fontsize', 'title', 'frameon'].includes(name)) c.fail(`У legend() в Kodik нет аргумента «${name}».`)
    if (args.length) f.labels = c.items(args[0].value, 'подписи легенды').map(item => c.str(item))
    f.legend = true
  }
  type Draw = (f: FigureState, args: Arg[], kw: Keywords, c: Ctx) => Arg | void
  const drawing: Record<string, Draw> = {
    plot, scatter, bar, barh: (f, a, kw, c) => bar(f, a, kw, c, true), hist, grid, legend,
    title: textSetter('title'), xlabel: textSetter('xlabel'), ylabel: textSetter('ylabel'),
    xlim: (f, a, kw, c) => limits(f, 'xlim', a, kw, c), ylim: (f, a, kw, c) => limits(f, 'ylim', a, kw, c),
    xticks: () => undefined, yticks: () => undefined, tight_layout: () => undefined,
    axis: (f, a, kw, c) => { const v = a[0]?.value; if (typeof v === 'string' && ['equal', 'on', 'auto', 'tight', 'scaled'].includes(v)) return; if (v instanceof PyTuple || Array.isArray(v)) { const [x0, x1, y0, y1] = c.items(v).map(x => num(x, c)); f.xlim = [x0, x1]; f.ylim = [y0, y1]; return } c.fail('axis(): в Kodik — axis([xmin, xmax, ymin, ymax]) или axis("equal").') },
  }

  class Axes extends PyObject {
    readonly typeName = 'Axes'
    constructor(public figure: FigureState) { super() }
    repr() { return '<Axes>' }
    getattr(name: string): Arg | undefined {
      const map: Record<string, string> = { set_title: 'title', set_xlabel: 'xlabel', set_ylabel: 'ylabel', set_xlim: 'xlim', set_ylim: 'ylim', set_xticks: 'xticks', set_yticks: 'yticks' }
      const target = drawing[map[name] ?? (['title', 'xlabel', 'ylabel', 'xlim', 'ylim'].includes(name) ? '' : name)]
      if (name === 'cla' || name === 'clear') return { value: new PyNative(name, () => { this.figure.clear() }, true) }
      return target ? { value: new PyNative(name, (a, kw, c) => target(this.figure, a, kw, c), true) } : undefined
    }
  }
  class FigureObject extends PyObject {
    readonly typeName = 'Figure'
    constructor(public figure: FigureState) { super() }
    repr() { return `<Figure size 640x480 with ${this.figure.series.length ? 1 : 0} Axes>` }
    getattr(name: string): Arg | undefined {
      if (name === 'suptitle') return { value: new PyNative(name, (a, kw, c) => textSetter('title')(this.figure, a, new Map(), c), true) }
      if (name === 'add_subplot' || name === 'gca') return { value: new PyNative(name, () => ({ value: new Axes(this.figure) })) }
      if (name === 'show') return { value: new PyNative(name, () => { shoot(this.figure) }, true) }
      if (name === 'savefig') return { value: new PyNative(name, (a, kw, c) => c.fail('В Kodik графики не сохраняются в файлы — они показываются под программой.')) }
      return undefined
    }
  }

  const attrs = new Map<string, Arg>()
  for (const [name, fn] of Object.entries(drawing)) attrs.set(name, { value: new PyNative(name, (a, kw, c) => fn(fig(), a, kw, c), true) })
  const def = (name: string, fn: (a: Arg[], kw: Keywords, c: Ctx) => Arg | void, effect = true) => attrs.set(name, { value: new PyNative(name, fn, effect) })
  def('figure', (a, kw, c) => {
    for (const name of kw.keys()) if (!['figsize', 'dpi', 'num', 'facecolor'].includes(name)) c.fail(`У figure() в Kodik нет аргумента «${name}».`)
    if (open.length >= 20) c.fail('Открыто больше 20 рисунков. Закрой лишние через plt.close().')
    current = new FigureState(++ids, ++numbers_); open.push(current); return { value: new FigureObject(current) }
  })
  def('subplots', (a, kw, c) => {
    const p = bind('subplots', a, kw, ['nrows', 'ncols', 'figsize', 'dpi'], 0, c)
    if ((p.nrows && int(p.nrows, c) !== 1) || (p.ncols && int(p.ncols, c) !== 1)) c.fail('subplots() в Kodik создаёт одну область графика: plt.subplots().')
    current = new FigureState(++ids, ++numbers_); open.push(current)
    return { value: c.tuple([{ value: new FigureObject(current) }, { value: new Axes(current) }]) }
  })
  def('gca', () => ({ value: new Axes(fig()) }), false)
  def('gcf', () => ({ value: new FigureObject(fig()) }), false)
  def('show', (a, kw, c) => { for (const name of kw.keys()) if (name !== 'block') c.fail(`У show() нет аргумента «${name}».`); for (const f of [...open]) { if (!f.empty()) shoot(f); close(f) } })
  def('pause', (a, kw, c) => {
    const seconds = num(bind('pause', a, kw, ['interval'], 1, c).interval, c, 'число секунд')
    if (seconds < 0) c.fail('pause: время паузы не может быть отрицательным.')
    for (const f of open) if (!f.empty()) shoot(f)
    pause(c, seconds * 1000, 'plt.pause')
  })
  def('clf', () => { current?.clear() }); def('cla', () => { current?.clear() })
  def('close', (a, kw, c) => {
    const what = a[0]?.value
    if (what === 'all') { open.splice(0); current = undefined; return }
    if (what instanceof FigureObject) { if (open.includes(what.figure)) close(what.figure); return }
    if (what === undefined || what === null) { if (current) close(current); return }
    c.fail('close(): plt.close(), plt.close("all") или plt.close(fig).')
  })
  def('savefig', (a, kw, c) => c.fail('В Kodik графики не сохраняются в файлы — они показываются под программой.'))
  for (const name of ['ion', 'ioff', 'draw']) def(name, () => undefined)
  const pyplot = new PyModule('matplotlib.pyplot', attrs)
  void none
  return { pyplot, package: new PyModule('matplotlib', new Map()) }
}
