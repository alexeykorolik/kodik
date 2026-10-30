/**
 * What counts as the learner's own change for learning conclusions (not for grading).
 * A passed check stays a passed check; these helpers only decide whether it may support a
 * learning conclusion or a mode recommendation. They do not prove independent work or mastery.
 */
import { translateWorkspace } from './blockProgram'
import { parseCourseProgram } from '../pythonRuntime'

/**
 * Comparable form of a program.
 * - A program the checker can parse is compared by its syntax tree — the same parser that grades it.
 *   Comments, spacing, quote style and escape spelling of the same string value, and indentation
 *   written with a tab instead of four spaces disappear; order, nesting, names, operators and
 *   literal values stay.
 * - A program the checker cannot parse (for example a start with `1 / / 2`) is never interpreted:
 *   it is compared as exact text, ignoring only line-ending style, trailing spaces and trailing
 *   blank lines. So fixing a syntax error is always a change, and a parse error never leads to
 *   "unchanged" by guesswork.
 */
export type ProgramShape = { parsed: true; key: string } | { parsed: false; key: string; error: string }

export function programShape(code: unknown): ProgramShape {
  const source = String(code ?? '')
  try { return { parsed: true, key: JSON.stringify(parseCourseProgram(source)) } }
  catch (e) { return { parsed: false, key: source.replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/\s+$/, '')).join('\n').replace(/\n+$/, ''), error: (e as Error).message } }
}

/** Same program for evidence purposes: both parsed with equal trees, or both unparsed with equal text. */
export function sameProgram(a: unknown, b: unknown): boolean {
  const x = programShape(a), y = programShape(b)
  return x.parsed === y.parsed && x.key === y.key
}

/** Python of a block start; moving blocks or changing ids does not change it. */
export function blockStartProgram(starterBlocks: unknown): string | null {
  if (!starterBlocks) return null
  const t = translateWorkspace(starterBlocks)
  return t.ok ? t.python : null
}

/**
 * True when the submitted program is the untouched start: same program as the Python starter or as the
 * translated block start. `code` is what was graded (for blocks: the server-generated Python).
 */
export function isUnchangedStart(code: string, mode: string, starter: string, starterBlocks: unknown): boolean {
  if (!String(code ?? '').trim()) return false
  if (mode === 'python') return !!String(starter ?? '').trim() && sameProgram(code, starter)
  const blocks = blockStartProgram(starterBlocks)
  return !!blocks && sameProgram(code, blocks)
}
