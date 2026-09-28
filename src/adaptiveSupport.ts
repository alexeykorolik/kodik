import type { Lesson } from './learningEngine'
import type { SkillState } from './mastery'
import { supportRank, type SkillId, type SupportLevel } from './skills'
import { createSupportVariant } from './supportVariants'

export const supportLevels: SupportLevel[] = ['blocks', 'blocks_with_code', 'guided_code', 'code_tokens', 'free_code']
export const adaptiveThresholds = { confident: 0.72, independentSuccesses: 2, meaningfulErrors: 2, freshSuccesses: 2, reviewDays: 3 }
export type SupportCheckpoint = { successes: Partial<Record<SkillId, number>>; errors: Partial<Record<SkillId, number>> }
export type SupportDecision = { previousSupport: SupportLevel; nextSupport: SupportLevel; reason: 'keep'|'advance'|'restore'|'fallback'; skillId?: SkillId; masteryBand: 'low'|'developing'|'confident'; message?: string }
export function lessonSkills(lesson: Lesson): SkillId[] {
  return [...new Set([...(lesson.skills?.teaches || []), ...(lesson.skills?.practices || [])])]
}
export function checkpointFor(lesson: Lesson, states: Partial<Record<SkillId, SkillState>>): SupportCheckpoint {
  return { successes: Object.fromEntries(lessonSkills(lesson).map(id => [id, states[id]?.independentSuccesses || 0])), errors: Object.fromEntries(lessonSkills(lesson).map(id => [id, states[id]?.consecutiveErrors || 0])) }
}
export function resolveAdaptiveSupport(lesson: Lesson, states: Partial<Record<SkillId, SkillState>>, previous = lesson.supportLevel || 'blocks_with_code', checkpoint?: SupportCheckpoint, restore = false): SupportDecision {
  const ids = lessonSkills(lesson)
  const skillId = [...ids].sort((a,b) => (states[a]?.mastery || 0) - (states[b]?.mastery || 0))[0]
  const minimum = skillId ? states[skillId]?.mastery || 0 : 0
  const masteryBand: SupportDecision['masteryBand'] = minimum >= adaptiveThresholds.confident ? 'confident' : minimum >= 0.4 ? 'developing' : 'low'
  const repeated = ids.some(id => (states[id]?.consecutiveErrors || 0) >= adaptiveThresholds.meaningfulErrors)
  const strong = ids.length > 0 && ids.every(id => (states[id]?.mastery || 0) >= adaptiveThresholds.confident && (states[id]?.independentSuccesses || 0) >= adaptiveThresholds.independentSuccesses && !(states[id]?.consecutiveErrors) && (states[id]?.independentSuccesses || 0) - (checkpoint?.successes[id] || 0) >= adaptiveThresholds.freshSuccesses)
  const rank = supportRank[previous]
  // First introductions stay intact. Repeated lessons can walk the entire ladder.
  const delta = restore && repeated ? -1 : !restore && strong && !lesson.tutorial?.length ? 1 : 0
  const nextSupport = supportLevels[Math.max(0, Math.min(4, rank + delta))]
  const base = { previousSupport: previous, nextSupport, skillId, masteryBand }
  if (nextSupport === previous) return { ...base, reason: 'keep' }
  if (!createSupportVariant(lesson, nextSupport)) return { ...base, nextSupport: previous, reason: 'fallback' }
  return { ...base, reason: delta > 0 ? 'advance' : 'restore', message: delta > 0 ? 'У тебя получается. Попробуем следующий шаг с меньшим количеством помощи.' : 'Давай закрепим это ещё на одном примере. Добавим немного помощи.' }
}
