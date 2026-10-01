import type { Lesson } from '../learningEngine'
import type { TutorRequest, TutorResponse } from './aiTypes'

export function fallbackResponse(request: TutorRequest, lesson: Lesson): TutorResponse {
  const { action, hintLevel, context } = request
  let message = ''
  if (action === 'hint') message = lesson.progressiveHints?.[hintLevel - 1] || (hintLevel === 1 ? lesson.starterHint : lesson.hint)
  else if (action === 'error_explanation') {
    const errors: Record<string, string> = {
      wrong_order: 'Команды выполняются по порядку. Посмотри, какое действие должно быть раньше.',
      wrong_value: 'Структура похожа на нужную. Проверь, какое значение использует команда.',
      missing_block: 'Для цели задания пока не хватает действия. Найди его в условии.',
      wrong_structure: 'Проверь, какие действия должны быть внутри других команд.',
      syntax_error: 'Проверь скобки, кавычки и написание знакомых команд.',
      wrong_indentation: 'Отступ показывает, какие действия входят внутрь условия, цикла или функции.',
      wrong_condition: 'Сравни условие со словами задачи: когда действие должно выполняться?',
      loop_error: 'Найди повторяемое действие и проверь, что оно находится внутри цикла.',
      wrong_function_call: 'Описание функции и её запуск — разные шаги. Проверь оба.',
      runtime_error: 'Программа столкнулась с ошибкой при выполнении. Проверь значения и порядок действий.',
    }
    message = errors[context.lastError?.type || ''] || lesson.starterHint
  } else if (action === 'concept') message = lesson.codeNote || lesson.starterHint
  else message = `Похожая задача: представь другие значения и попробуй применить идею «${context.skill.name.toLowerCase()}». Сначала определи первый шаг.`
  return { type: action === 'hint' ? 'hint' : action === 'example' ? 'example' : 'explanation', message, concept: null, example: null, shouldRevealSolution: false, confidence: 'high' }
}
