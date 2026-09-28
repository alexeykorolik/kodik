import { checkpointFor, lessonSkills, resolveAdaptiveSupport, type SupportDecision } from './adaptiveSupport'
import type { Lesson } from './learningEngine'
import type { Progress } from './progress'
import { supportRank, type SupportLevel } from './skills'
import { materializeSupport } from './supportVariants'
import { lessons } from './course'

export function previousSupport(lesson: Lesson, progress: Progress): SupportLevel {
  const override = progress.supportOverrides?.[lesson.id]
  if (override) return override
  const ids = lessonSkills(lesson)
  const inherited = ids.map(id => progress.skillSupport?.[id])
  if (!lesson.tutorial?.length && ids.length && inherited.every(Boolean)) return (inherited as SupportLevel[]).sort((a,b)=>supportRank[a]-supportRank[b])[0]
  return lesson.id === 1 ? 'blocks' : lesson.supportLevel || 'blocks_with_code'
}
export function decideLessonSupport(lesson: Lesson, progress: Progress, restore = false, current?: SupportLevel): SupportDecision {
  const source = lessons.find(item=>item.id===lesson.id) || lesson
  return resolveAdaptiveSupport(source, progress.skillStates || {}, current || previousSupport(source, progress), progress.supportCheckpoint, restore)
}
export function applySupportDecision(lesson: Lesson, progress: Progress, decision: SupportDecision): Progress {
  if (decision.reason !== 'advance' && decision.reason !== 'restore') return progress
  const checkpoint = checkpointFor(lesson, progress.skillStates || {})
  return { ...progress, supportOverrides: { ...progress.supportOverrides, [lesson.id]: decision.nextSupport },
    skillSupport: { ...progress.skillSupport, ...Object.fromEntries(lessonSkills(lesson).map(id=>[id,decision.nextSupport])) },
    supportCheckpoint: { successes: { ...progress.supportCheckpoint?.successes, ...checkpoint.successes }, errors: {} } }
}
export function openLessonVariant(lesson: Lesson, progress: Progress) {
  const saved = progress.sessions?.[lesson.id]
  // Resume keeps the actual editor format, including an unsent answer/draft.
  if (saved && !saved.finished && saved.supportLevel) return { lesson: materializeSupport(lesson, saved.supportLevel), progress, message: saved.supportMessage }
  const decision = decideLessonSupport(lesson, progress)
  const updated = applySupportDecision(lesson, progress, decision)
  const variant = materializeSupport(lesson, decision.nextSupport)
  return { lesson: variant, progress: updated, decision, message: decision.message }
}
// Store only a fingerprint in the session, not another copy of the learner's code.
export function answerFingerprint(answer: string) {
  let hash = 2166136261
  for (let i=0;i<answer.length;i++) hash = Math.imul(hash ^ answer.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}
export function meaningfulAnswer(answer: string) { return answer.split('\n').some(line => line.trim().length > 0 && !line.trim().startsWith('#')) }
