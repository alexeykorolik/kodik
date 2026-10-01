import { checkLesson, renderPython, runProgram, type Lesson } from './learningEngine'
import { parsePythonProgram } from './textLearning'
import type { SupportLevel } from './skills'
import { checkExtendedLesson } from './extendedChecker'

function codeFirstVariant(source: Lesson, level: SupportLevel): Lesson | null {
  if (level === 'blocks' || level === 'blocks_with_code' || !source.codeAnswer) return null
  const code = source.codeAnswer
  const base = { ...source, supportLevel: level, tutorial: undefined, choices: undefined, tokens: undefined, prefix: undefined, suffix: undefined }
  if (level === 'free_code') return { ...base, mode: 'text', answer: code }
  if (level === 'code_tokens') {
    const tokens = code.split(/(?<=\n)/).filter(Boolean)
    if (tokens.length === 1) {
      const parts = code.match(/\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{N}_]*|\d+|[^\s])\s*/gu)
      if (!parts || parts.join('') !== code) return null
      return { ...base, mode: 'tokens', answer: code, tokens: [...parts].reverse() }
    }
    return { ...base, mode: 'tokens', answer: code, tokens: [...tokens].reverse() }
  }
  const skill = source.skills?.primarySkill
  const gap = skill === 'loop' ? /(?:range\(([^\n)]+)\)|while\s+([^\n:]+):)/.exec(code)
    : skill === 'if' || skill === 'comparison' ? /if\s+([^\n:]+):/.exec(code)
    : skill === 'function' ? /return\s+([^\n]+)/.exec(code)
    : skill === 'list' ? /print\(([^\n]+)\)/.exec(code)
    : /print\(([^\n]+)\)/.exec(code) || /forward\(([^\n]+)\)/.exec(code)
  const fallback = /print\(([^\n]+)\)/.exec(code) || /forward\(([^\n]+)\)/.exec(code)
  const match = gap || fallback
  if (!match) return null
  const answer = match[1] || match[2], index = match.index + match[0].indexOf(answer)
  const choices = [...new Set([answer, '0', '"другое значение"'])]
  const variant: Lesson = { ...base, mode: 'completion', answer, choices, prefix: code.slice(0, index), suffix: code.slice(index + answer.length) }
  return checkExtendedLesson(variant, answer).passed ? variant : null
}

// A variant keeps the curriculum goal and checker. Only the input scaffold changes.
export function createSupportVariant(source: Lesson, level: SupportLevel): Lesson | null {
  if (level === source.supportLevel) return source
  if (source.extended) return codeFirstVariant(source, level)
  if (level === 'blocks' || level === 'blocks_with_code') {
    if (source.mode !== 'blocks' && source.mode !== 'text') return null
    return { ...source, mode: 'blocks', supportLevel: level }
  }
  const code = source.codeAnswer
  if (!code) return null
  try {
    const canonical = parsePythonProgram(code)
    // Recognition/completion lessons have a choice checker, not a program checker.
    const validate = source.mode === 'recognition' || source.mode === 'completion'
      ? (program: typeof canonical) => renderPython(program) === renderPython(canonical) ? null : 'Сравни команды, значения и порядок с заданием.'
      : source.validate
    const base: Lesson = { ...source, validate, expectedOutput: source.mode === 'recognition' || source.mode === 'completion' ? runProgram(canonical).output : source.expectedOutput, tutorial: undefined, supportLevel: level, prefix: undefined, suffix: undefined, choices: undefined, tokens: undefined,
      progressiveHints: ['Сравни команды и значения с целью задания. Выполняй их сверху вниз.', source.codeNote || 'Скобки связывают команду с её значением. Текст записывается в кавычках.', source.goal] }
    if (!checkLesson(base, canonical).passed) return null
    if (level === 'free_code') return { ...base, mode: 'text', answer: code }
    if (level === 'code_tokens') {
      // Whitespace stays with its token: this preserves indentation and strings.
      const tokens = code.match(/\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{N}_]*|\d+(?:\.\d+)?|>=|<=|==|!=|\*\*|[^\s])\s*/gu)
      if (!tokens || tokens.length > 32 || tokens.join('') !== code) return null
      return { ...base, mode: 'tokens', answer: code, tokens: [...tokens].reverse() }
    }
    // Fill one value/operation in an otherwise complete, working program.
    const gap = /print\(([^\n]+)\)/.exec(code) || /range\(([^\n]+)\)/.exec(code)
    if (!gap) return null
    const answer = gap[1], index = gap.index + gap[0].indexOf(answer)
    const wrong = answer.startsWith('"') ? '"Другое сообщение"' : answer.includes('>=') ? answer.replace('>=', '==') : '0'
    const other = answer.startsWith('"') ? answer.slice(1, -1) : answer.includes('+') ? answer.replace('+', '-') : '"текст"'
    const choices = [...new Set([wrong, answer, other])]
    if (choices.length < 2) return null
    return { ...base, mode: 'completion', answer, choices, prefix: code.slice(0, index), suffix: code.slice(index + answer.length) }
  } catch { return null }
}

export function materializeSupport(source: Lesson, level?: SupportLevel): Lesson {
  return level ? createSupportVariant(source, level) || source : source
}

export const supportExplanation: Record<SupportLevel, string> = {
  blocks: 'Собираем программу блоками. Каждый новый шаг подскажет, что сделать.',
  blocks_with_code: 'Собираем блоки и смотрим, как они превращаются в Python.',
  guided_code: 'Теперь часть Python уже готова. Выбери фрагмент для пропуска.',
  code_tokens: 'Теперь собери Python из частей. Пробелы и отступы уже сохранены.',
  free_code: 'Теперь напиши решение сам. Пример и помощь остаются рядом.'
}
