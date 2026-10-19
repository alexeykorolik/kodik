/**
 * What counts as the learner's own change for learning conclusions (not for grading).
 * A passed check stays a passed check; these helpers only decide whether it may support a
 * learning conclusion or a mode recommendation.
 */
import { translateWorkspace } from './blockProgram'

const WORD = /[\p{L}\p{N}_]/u

/**
 * Python program reduced to what matters for "did the learner change it": comments, blank lines and
 * insignificant spacing are dropped (`print( 42 )`, `print (42)` and `print(42)` are the same), string
 * contents are kept exactly (only the quote style is unified), indentation is compared by nesting level
 * (2 or 4 spaces, or a tab, describe the same block), and lines continued inside brackets or after `\`
 * are joined. A space is kept only between two words, so `return x` never becomes `returnx`.
 */
export function normalizeProgram(code: unknown): string {
  const src = String(code ?? '').replace(/\r\n?/g, '\n')
  const lines: { indent: number; text: string }[] = []
  let tokens: string[] = [], indent = -1, depth = 0, i = 0
  const word = (t: string) => WORD.test(t[0]) && WORD.test(t[t.length - 1])
  const push = (t: string) => { tokens.push(t) }
  const endLine = () => {
    if (tokens.length) lines.push({ indent, text: tokens.reduce((out, t, k) => out + (k && word(tokens[k - 1]) && word(t) ? ' ' : '') + t, '') })
    tokens = []; indent = -1
  }
  while (i < src.length) {
    const ch = src[i]
    if (indent < 0 && depth === 0) {
      // Width of the leading whitespace of a new logical line (a tab advances to the next multiple of 8).
      let w = 0, j = i
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) { w = src[j] === '\t' ? (Math.floor(w / 8) + 1) * 8 : w + 1; j++ }
      indent = w; i = j; continue
    }
    if (ch === '\n') { if (depth === 0) endLine(); i++; continue }
    if (ch === ' ' || ch === '\t') { i++; continue }
    if (ch === '\\' && src[i + 1] === '\n') { i += 2; continue }
    if (ch === '#') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (ch === '"' || ch === "'") {
      const triple = src.startsWith(ch.repeat(3), i), close = triple ? ch.repeat(3) : ch
      let j = i + close.length, body = ''
      while (j < src.length && !src.startsWith(close, j)) { if (src[j] === '\\' && j + 1 < src.length) { body += src[j] + src[j + 1]; j += 2; continue } if (!triple && src[j] === '\n') break; body += src[j++] }
      i = Math.min(src.length, j + close.length)
      push((triple ? 'T' : '') + (body.includes('\\') ? close + body + close : JSON.stringify(body)))
      continue
    }
    if (WORD.test(ch)) { let j = i; while (j < src.length && WORD.test(src[j])) j++; push(src.slice(i, j)); i = j; continue }
    if ('([{'.includes(ch)) depth++
    if (')]}'.includes(ch)) depth = Math.max(0, depth - 1)
    push(ch); i++
  }
  endLine()
  // Indentation as nesting level: each deeper indent opens a level, a shallower one returns to its match.
  const stack: number[] = [0]
  return lines.map(({ indent: w, text }) => {
    if (w > stack[stack.length - 1]) stack.push(w)
    else while (stack.length > 1 && w < stack[stack.length - 1]) stack.pop()
    return '  '.repeat(stack.length - 1) + text
  }).join('\n')
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
