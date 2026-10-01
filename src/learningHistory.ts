import type { ErrorType } from './validation'
import type { SkillId } from './skills'
import type { Progress } from './progress'

export type LearningError = { id: string; lessonId: number; type: ErrorType; message: string; skills: SkillId[]; occurredAt: number; resolvedAt?: number; attempt: number; imported?: boolean }
export type FirstAttempt = { stars: number; passed: boolean; at: number }

export function recordLearningCheck(progress: Progress, check: { lessonId: number; passed: boolean; message: string; errorType?: ErrorType; skills: SkillId[]; attempt: number; stars?: number; tutorial: boolean; practice: boolean; at: number }): Partial<Progress> {
  const history = progress.errorHistory || []
  const errorHistory = check.passed
    ? history.map(error => error.lessonId === check.lessonId && !error.resolvedAt ? { ...error, resolvedAt: check.at } : error)
    : [...history, { id: `${check.lessonId}-${check.at}-${check.attempt}`, lessonId: check.lessonId, type: check.errorType || 'wrong_value', message: check.message, skills: check.skills, occurredAt: check.at, attempt: check.attempt }]
  const firstAttemptResults = { ...progress.firstAttemptResults }
  const previousAttempts = Math.max(progress.attempts?.[check.lessonId] || 0, progress.sessions?.[check.lessonId]?.attempts || 0)
  if (!check.tutorial && !check.practice && !progress.completed.includes(check.lessonId) && !firstAttemptResults[check.lessonId] && previousAttempts === 0) {
    firstAttemptResults[check.lessonId] = { stars: check.passed ? check.stars || 0 : 0, passed: check.passed, at: check.at }
  }
  return { errorHistory, firstAttemptResults }
}

export function firstAttemptSummary(progress: Progress) {
  const results = Object.values(progress.firstAttemptResults || {})
  return { count: results.length, average: results.length ? results.reduce((sum, result) => sum + result.stars, 0) / results.length : null, passed: results.filter(result => result.passed).length }
}

// Keep resolved errors resolved, and keep the earliest first check when an
// existing learner's device and cloud both have evidence for the same task.
export function mergeLearningRecords(cloud: Progress, local: Progress): Partial<Progress> {
  const errors = new Map<string, LearningError>()
  for (const error of [...(cloud.errorHistory || []), ...(local.errorHistory || [])]) {
    const prior = errors.get(error.id)
    errors.set(error.id, { ...error, resolvedAt: Math.max(prior?.resolvedAt || 0, error.resolvedAt || 0) || undefined })
  }
  const firstAttemptResults = { ...cloud.firstAttemptResults }
  for (const [id, result] of Object.entries(local.firstAttemptResults || {})) {
    if (!firstAttemptResults[id] || result.at < firstAttemptResults[id].at) firstAttemptResults[id] = result
  }
  return { errorHistory: [...errors.values()].sort((a, b) => a.occurredAt - b.occurredAt), firstAttemptResults }
}

export const errorLabels: Record<string, string> = {
  missing_block: 'Не хватает команды', wrong_order: 'Порядок действий', wrong_value: 'Значение или результат', type_mismatch: 'Тип данных', syntax_error: 'Запись Python', indentation_error: 'Отступы', wrong_condition: 'Условие', wrong_loop: 'Цикл', missing_call: 'Вызов функции', runtime_error: 'Ошибка запуска', variable_error: 'Переменная', unknown_variable: 'Переменная', infinite_loop: 'Цикл не заканчивается',
  wrong_structure: 'Структура программы', wrong_indentation: 'Отступы', loop_error: 'Цикл', wrong_function_call: 'Вызов функции',
}
