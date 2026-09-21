import type { SkillId } from './skills'

export type ErrorType = 'wrong_order' | 'wrong_value' | 'missing_block' | 'wrong_structure' | 'syntax_error' | 'wrong_indentation' | 'wrong_condition' | 'loop_error' | 'wrong_function_call' | 'runtime_error'
export type ValidationIssue = { message: string; errorType: ErrorType; affectedSkills: SkillId[] }

export function issue(message: string, fallbackSkills: SkillId[] = []): ValidationIssue {
  const text = message.toLowerCase()
  if (/отступ/.test(text)) return { message, errorType: 'wrong_indentation', affectedSkills: ['indentation'] }
  if (/функц|вызов/.test(text)) return { message, errorType: 'wrong_function_call', affectedSkills: ['function'] }
  if (/цикл|повтор|range/.test(text)) return { message, errorType: 'loop_error', affectedSkills: ['loop'] }
  if (/сравнен|услов|равенств|≥|>=/.test(text)) return { message, errorType: 'wrong_condition', affectedSkills: text.includes('услов') ? ['if','comparison'] : ['comparison'] }
  if (/порядок|сначала|затем/.test(text)) return { message, errorType: 'wrong_order', affectedSkills: ['sequence'] }
  if (/пуст|добав|нужен блок|встав/.test(text)) return { message, errorType: 'missing_block', affectedSkills: fallbackSkills }
  if (/синтакс|скоб|кавыч|команд/.test(text)) return { message, errorType: 'syntax_error', affectedSkills: ['text_syntax'] }
  if (/значен|числ|текст/.test(text)) return { message, errorType: 'wrong_value', affectedSkills: fallbackSkills }
  return { message, errorType: 'wrong_structure', affectedSkills: fallbackSkills }
}
