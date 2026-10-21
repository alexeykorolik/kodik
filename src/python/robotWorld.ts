// The Robot's field as text, the way a teacher writes it in a task:
//
//   +-+-+-+-+        R  robot          *  cell to fill       #  already filled
//   |R . . *|        P  parking        Q  robot on parking   X  robot on a cell to fill
//   + + +-+ +        .  empty cell     -  |  walls between cells; the outer border is always a wall
//   |. .|. .|
//   +-+-+-+-+
//
// A field without walls can also be written as rows of cells: "R . . *" on separate lines.
import type { Cell } from './scene'

export type World = { rows: number; cols: number; walls: Set<string>; targets: Set<string>; parking: Set<string>; filled: Set<string>; start: Cell }
export const MAX_SIDE = 20
export const key = (r: number, c: number) => `${r}:${c}`
export const cellOf = (k: string): Cell => k.split(':').map(Number) as Cell

export function emptyWorld(rows = 6, cols = 8): World { return { rows, cols, walls: new Set(), targets: new Set(), parking: new Set(), filled: new Set(), start: [0, 0] } }

export function parseWorld(source: string): World {
  const lines = source.replace(/\r/g, '').split('\n').map(line => line.replace(/\s+$/, ''))
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  if (!lines.length) throw new Error('Поле Робота пустое.')
  const grid = lines[0].trimStart().startsWith('+')
  const cells: string[][] = [], world = emptyWorld(0, 0)
  if (grid) {
    const indent = lines[0].length - lines[0].trimStart().length, rows = lines.map(line => line.slice(indent))
    if (rows.length < 3 || rows.length % 2 === 0) throw new Error('Поле с рамкой: строки с клетками чередуются со строками стен «+-+-+», первая и последняя — рамка.')
    const width = Math.max(...rows.map(line => line.length))
    if (width < 3 || width % 2 === 0) throw new Error('Поле с рамкой: каждая клетка занимает два символа, строка начинается и заканчивается знаком «+» или «|».')
    world.rows = (rows.length - 1) / 2; world.cols = (width - 1) / 2
    for (let r = 0; r <= world.rows; r++) {
      const line = rows[2 * r]
      for (let c = 0; c < world.cols; c++) {
        const ch = line[2 * c + 1] ?? ' '
        if (ch === '-') { if (r > 0 && r < world.rows) world.walls.add(`h:${r}:${c}`) }
        else if (ch !== ' ' && !(r === 0 || r === world.rows)) throw new Error(`Строка стен ${2 * r + 1}: используй «-» для стены или пробел для прохода.`)
      }
      if (r === world.rows) break
      const row = rows[2 * r + 1]
      cells.push([])
      for (let c = 0; c <= world.cols; c++) {
        const wall = row[2 * c] ?? ' '
        if (wall === '|') { if (c > 0 && c < world.cols) world.walls.add(`v:${r}:${c}`) }
        else if (wall !== ' ') throw new Error(`Строка ${2 * r + 2}: между клетками ставь «|» для стены или пробел.`)
        if (c < world.cols) cells[r].push(row[2 * c + 1] ?? '.')
      }
    }
  } else {
    for (const line of lines) cells.push(line.trim().split(/\s+/))
    world.rows = cells.length; world.cols = Math.max(...cells.map(row => row.length))
    if (cells.some(row => row.length !== world.cols)) throw new Error('Во всех строках поля должно быть одинаковое число клеток.')
    if (cells.some(row => row.some(cell => cell.length !== 1))) throw new Error('Клетки поля пишутся одним символом через пробел: R . * # P.')
  }
  if (world.rows < 1 || world.cols < 1 || world.rows > MAX_SIDE || world.cols > MAX_SIDE) throw new Error(`Поле Робота — от 1×1 до ${MAX_SIDE}×${MAX_SIDE} клеток.`)
  let robots = 0
  cells.forEach((row, r) => row.forEach((ch, c) => {
    const k = key(r, c)
    if (ch === ' ' || ch === '.') return
    if ('RQX'.includes(ch)) { robots++; world.start = [r, c] }
    if (ch === '*' || ch === 'X') world.targets.add(k)
    else if (ch === '#') world.filled.add(k)
    else if (ch === 'P' || ch === 'Q') world.parking.add(k)
    else if (ch !== 'R') throw new Error(`Неизвестный знак «${ch}» в клетке ${r + 1}, ${c + 1}. Допустимы: R . * # P Q X.`)
  }))
  if (robots !== 1) throw new Error(robots ? 'На поле должен быть один Робот (R, Q или X).' : 'Отметь Робота на поле буквой R.')
  return world
}

/** The same field written back as text with walls (used to show a program-made field to a teacher). */
export function formatWorld(world: World): string {
  const lines: string[] = []
  for (let r = 0; r <= world.rows; r++) {
    let walls = '+'
    for (let c = 0; c < world.cols; c++) walls += (r === 0 || r === world.rows || world.walls.has(`h:${r}:${c}`) ? '-' : ' ') + '+'
    lines.push(walls)
    if (r === world.rows) break
    let row = ''
    for (let c = 0; c <= world.cols; c++) {
      row += c === 0 || c === world.cols || world.walls.has(`v:${r}:${c}`) ? '|' : ' '
      if (c === world.cols) break
      const k = key(r, c), robot = world.start[0] === r && world.start[1] === c
      row += robot ? (world.parking.has(k) ? 'Q' : world.targets.has(k) ? 'X' : 'R') : world.targets.has(k) ? '*' : world.filled.has(k) ? '#' : world.parking.has(k) ? 'P' : '.'
    }
    lines.push(row)
  }
  return lines.join('\n')
}
