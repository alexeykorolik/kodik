export const skillIds = ['print','string','number','sequence','variable','assignment','arithmetic','comparison','if','loop','function','indentation','text_syntax'] as const
export type SkillId = typeof skillIds[number]
export type SupportLevel = 'blocks' | 'blocks_with_code' | 'guided_code' | 'code_tokens' | 'free_code'
export type LessonSkills = { teaches: SkillId[]; practices: SkillId[]; requires: SkillId[] }

export type SkillDefinition = {
  id: SkillId
  title: string
  prerequisites: SkillId[]
}

export const skills: Record<SkillId, SkillDefinition> = {
  print: { id: 'print', title: 'Вывод данных', prerequisites: [] },
  string: { id: 'string', title: 'Строки', prerequisites: [] },
  number: { id: 'number', title: 'Числа', prerequisites: [] },
  sequence: { id: 'sequence', title: 'Порядок команд', prerequisites: ['print'] },
  variable: { id: 'variable', title: 'Переменные', prerequisites: ['string'] },
  assignment: { id: 'assignment', title: 'Присваивание', prerequisites: ['variable'] },
  arithmetic: { id: 'arithmetic', title: 'Вычисления', prerequisites: ['number'] },
  comparison: { id: 'comparison', title: 'Сравнения', prerequisites: ['number'] },
  if: { id: 'if', title: 'Условия', prerequisites: ['comparison','sequence'] },
  loop: { id: 'loop', title: 'Циклы', prerequisites: ['sequence','number'] },
  function: { id: 'function', title: 'Функции', prerequisites: ['sequence'] },
  indentation: { id: 'indentation', title: 'Отступы Python', prerequisites: ['sequence'] },
  text_syntax: { id: 'text_syntax', title: 'Синтаксис Python', prerequisites: ['print','string'] }
}

export const supportRank: Record<SupportLevel, number> = {
  blocks: 0,
  blocks_with_code: 1,
  guided_code: 2,
  code_tokens: 3,
  free_code: 4
}

export function supportForMode(mode: 'blocks'|'recognition'|'completion'|'tokens'|'text' = 'blocks'): SupportLevel {
  if (mode === 'blocks') return 'blocks_with_code'
  if (mode === 'recognition' || mode === 'completion') return 'guided_code'
  if (mode === 'tokens') return 'code_tokens'
  return 'free_code'
}
