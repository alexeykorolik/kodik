import type { SkillId } from './skills'

export type CodeGap = { index: number; answer: string; skill: SkillId }
// Match balanced calls rather than stopping at the first nested ')'.
function callGap(code: string, name: string, whole: boolean, skill: SkillId): CodeGap | undefined {
  const match = new RegExp(`\\b${name}\\s*\\(`).exec(code)
  if (!match) return
  const open = match.index + match[0].lastIndexOf('(')
  let depth = 1, quote = '', escaped = false
  for (let i = open + 1; i < code.length; i++) {
    const ch = code[i]
    if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = ''; continue }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(') depth++
    else if (ch === ')' && --depth === 0) {
      const index = whole ? match.index : open + 1
      const answer = code.slice(index, whole ? i + 1 : i)
      return answer ? { index, answer, skill } : undefined
    }
  }
}
function capture(code: string, pattern: RegExp, skill: SkillId): CodeGap | undefined {
  const match = new RegExp(pattern.source, pattern.flags + 'd').exec(code)
  if (!match?.[1]) return
  return { index: match.indices![1][0], answer: match[1], skill }
}
export function scaffoldForSkill(code: string, skill: SkillId): CodeGap | undefined {
  switch (skill) {
    case 'input': return callGap(code, 'int', true, skill)?.answer.includes('input(') ? callGap(code, 'int', true, skill) : callGap(code, 'input', true, skill)
    case 'assignment': {
      const assignments = [...code.matchAll(/^[ \t]*[\p{L}_][\p{L}\p{N}_]*\s*=\s*(?![=])([^\n]+)/gmu)]
      const match = assignments.find(item => /[\p{L}_]/u.test(item[1]) && !/^["']/.test(item[1])) || assignments[0]
      return match ? { index: match.index! + match[0].length - match[1].length, answer: match[1], skill } : undefined
    }
    case 'if': case 'comparison': return capture(code, /(?:if|elif)\s+([^\n:]+):/u, skill) || callGap(code, 'print', false, skill)
    case 'loop': return callGap(code, 'range', false, skill) || capture(code, /while\s+([^\n:]+):/u, skill) || capture(code, /for\s+[\p{L}_][\p{L}\p{N}_]*\s+in\s+([^\n:]+):/u, skill)
    case 'function': {
      const returned = capture(code, /return\s+([^\n]+)/u, skill)
      if (returned) return returned
      const name = /def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(/u.exec(code)?.[1]
      if (!name) return
      // Skip the definition: exercise the actual invocation, including no-arg functions.
      const after = code.indexOf('\n', code.indexOf('def ')) + 1
      const gap = callGap(code.slice(after), name, true, skill)
      return gap ? { ...gap, index: gap.index + after } : undefined
    }
    case 'list': return capture(code, /[\p{L}_][\p{L}\p{N}_]*\[([^\]\n]+)\]/u, skill)
      || capture(code, /for\s+[\p{L}_][\p{L}\p{N}_]*\s+in\s+([^\n:]+):/u, skill)
      || callGap(code, 'len', true, skill)
    case 'drawing': return callGap(code, 'forward', false, skill) || callGap(code, 'right', false, skill) || callGap(code, 'left', false, skill)
    case 'variable': case 'string': case 'arithmetic': case 'number': case 'print': case 'sequence': case 'indentation': case 'text_syntax':
      return callGap(code, 'print', false, skill) || callGap(code, 'forward', false, skill)
  }
}
