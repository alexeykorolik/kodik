/**
 * What counts as the learner's own change for learning conclusions (not for grading).
 * A passed check stays a passed check; these helpers only decide whether it may support a
 * learning conclusion or a mode recommendation.
 */
import { translateWorkspace } from './blockProgram'

/** Python program text without comments, blank lines and trailing spaces (string-aware). */
export function normalizeProgram(code: unknown): string {
  return String(code ?? '').replace(/\r\n/g, '\n').split('\n').map(line => {
    let quote = '', escaped = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (escaped) { escaped = false; continue }
      if (quote && ch === '\\') { escaped = true; continue }
      if (quote) { if (ch === quote) quote = ''; continue }
      if (ch === '"' || ch === "'") { quote = ch; continue }
      if (ch === '#') return line.slice(0, i)
    }
    return line
  }).map(line => line.replace(/\s+$/, '')).filter(line => line.trim()).join('\n')
}

/** Normalized program of a block start; moving blocks or changing ids does not change it. */
export function normalizedBlockStart(starterBlocks: unknown): string | null {
  if (!starterBlocks) return null
  const t = translateWorkspace(starterBlocks)
  return t.ok ? normalizeProgram(t.python) : null
}

/**
 * True when the submitted program is the untouched start: same program as the Python starter or as the
 * translated block start. `code` is what was graded (for blocks: the server-generated Python).
 */
export function isUnchangedStart(code: string, mode: string, starter: string, starterBlocks: unknown): boolean {
  const submitted = normalizeProgram(code)
  if (!submitted) return false
  if (mode === 'python') return !!normalizeProgram(starter) && submitted === normalizeProgram(starter)
  const blocks = normalizedBlockStart(starterBlocks)
  return !!blocks && submitted === blocks
}
