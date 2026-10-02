import type { Progress } from './progress'
import { lessons } from './course'
import { practiceLessonId, practicePool } from './practicePool'
import { skillIds, supportRank, type SkillId, type SupportLevel } from './skills'
import { emptySkillState } from './mastery'
import { curriculumVersion } from './release'
import { mergeLearningRecords } from './learningHistory'

// An explicit allowlist. Local progress is richer and must never be spread into
// a network payload, even when additional local fields are introduced later.
export type CloudProgressDTO = Pick<Progress, 'completed'|'currentLesson'|'started'|'version'|'bestStars'|'attempts'|'hintsUsed'|'introducedConcepts'|'skillStates'|'skillSupport'|'supportOverrides'|'scaffoldSkills'|'supportCheckpoint'|'practiceSequence'|'completedPracticeIds'|'firstAttemptResults'> & { cloudSchemaVersion: 1; curriculumVersion: string }
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const mainIds = lessons.map(lesson => lesson.id)
const allIds = [...mainIds, ...practicePool.map(item => practiceLessonId(item.id)!)]
const concepts = new Set(lessons.flatMap(lesson => lesson.tutorial || []))
const counter = (value: unknown, maximum = 1e6) => typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(0, Math.floor(value))) : 0
const support = (value: unknown): value is SupportLevel => typeof value === 'string' && Object.hasOwn(supportRank, value)
const skill = (value: unknown): value is SkillId => skillIds.includes(value as SkillId)
function lessonCounts(raw: unknown, maximum = 1e6) {
  const source = record(raw), result: Record<string,number> = {}
  for (const id of allIds) if (typeof source[id] === 'number' && Number.isFinite(source[id])) result[id] = counter(source[id], maximum)
  return result
}
export function toCloudProgress(value: unknown): CloudProgressDTO {
  const p = record(value)
  const completed = [...new Set(Array.isArray(p.completed) ? p.completed.filter((id): id is number => typeof id === 'number' && mainIds.includes(id)) : [])]
  const skillStates: NonNullable<Progress['skillStates']> = {}, skillSupport: NonNullable<Progress['skillSupport']> = {}
  const rawStates = record(p.skillStates), rawSkillSupport = record(p.skillSupport)
  for (const id of skillIds) {
    if (support(rawSkillSupport[id])) skillSupport[id] = rawSkillSupport[id]
    if (!Object.hasOwn(rawStates,id)) continue
    const raw = record(rawStates[id])
    const timestamp = typeof raw.lastPracticedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw.lastPracticedAt) && Number.isFinite(Date.parse(raw.lastPracticedAt)) ? raw.lastPracticedAt : undefined
    skillStates[id] = { ...emptySkillState(id), mastery: typeof raw.mastery === 'number' && Number.isFinite(raw.mastery) ? Math.min(1,Math.max(0,raw.mastery)) : 0,
      attempts:counter(raw.attempts),successes:counter(raw.successes),independentSuccesses:counter(raw.independentSuccesses),hintsUsed:counter(raw.hintsUsed),consecutiveErrors:counter(raw.consecutiveErrors),
      lastPracticedSequence: typeof raw.lastPracticedSequence === 'number' ? counter(raw.lastPracticedSequence) : undefined, lastPracticedAt: timestamp }
  }
  const supportOverrides: NonNullable<Progress['supportOverrides']> = {}, scaffoldSkills: NonNullable<Progress['scaffoldSkills']> = {}
  const rawSupport = record(p.supportOverrides), rawScaffolds = record(p.scaffoldSkills)
  for (const id of allIds) { if (support(rawSupport[id])) supportOverrides[id] = rawSupport[id]; if (skill(rawScaffolds[id])) scaffoldSkills[id] = rawScaffolds[id] }
  const firstAttemptResults: NonNullable<Progress['firstAttemptResults']> = {}, rawFirst = record(p.firstAttemptResults)
  for (const id of mainIds) {
    if (!Object.hasOwn(rawFirst,id)) continue
    const result = record(rawFirst[id])
    firstAttemptResults[id] = { stars:counter(result.stars,3),passed:result.passed === true,at:counter(result.at,1e13) }
  }
  const successes = record(record(p.supportCheckpoint).successes)
  const bestStars = lessonCounts(p.bestStars,3)
  for (const id of Object.keys(bestStars)) if (!mainIds.includes(Number(id)) || bestStars[id] < 1) delete bestStars[id]
  return { cloudSchemaVersion:1,curriculumVersion,version:4,completed,currentLesson:typeof p.currentLesson === 'number' && mainIds.includes(p.currentLesson) ? p.currentLesson : undefined,started:p.started === true || completed.length > 0,
    bestStars,attempts:lessonCounts(p.attempts),hintsUsed:lessonCounts(p.hintsUsed),introducedConcepts:Array.isArray(p.introducedConcepts) ? [...new Set(p.introducedConcepts.filter((item): item is string => typeof item === 'string' && concepts.has(item)))] : [],
    skillStates,skillSupport,supportOverrides,scaffoldSkills,supportCheckpoint:{successes:Object.fromEntries(skillIds.map(id=>[id,counter(successes[id])])),errors:{}},practiceSequence:counter(p.practiceSequence),
    completedPracticeIds:Array.isArray(p.completedPracticeIds) ? [...new Set(p.completedPracticeIds.filter((id): id is string => typeof id === 'string' && practicePool.some(item=>item.id===id)))] : [], firstAttemptResults }
}
export function cloudProgressRow(userId: string, progress: unknown) {
  const dto = toCloudProgress(progress)
  return { user_id:userId,completed_lesson_ids:dto.completed.map(String),current_lesson:dto.currentLesson,started:dto.started,learning_state:dto,updated_at:new Date().toISOString() }
}
export function readCloudProgressRow(value: unknown): CloudProgressDTO {
  const row = record(value), state = record(row.learning_state)
  // Old rows may contain private content. Only allowlisted metadata is restored.
  return toCloudProgress({ ...state, completed:Array.isArray(row.completed_lesson_ids) ? row.completed_lesson_ids.map(id=>typeof id === 'string' || typeof id === 'number' ? Number(id) : NaN) : state.completed,
    currentLesson:row.current_lesson,started:row.started })
}
export function mergeCloudAndLocal(cloud: Progress, local: Progress): Progress {
  const maxCounts = (remote: Record<string,number> = {}, device: Record<string,number> = {}) => {
    const result = { ...remote }
    for (const [id,value] of Object.entries(device)) result[id] = Math.max(value,result[id] || 0)
    return result
  }
  // An empty device state must not overwrite restored mastery/support. Local
  // evidence for the same skill remains authoritative, including later errors.
  return { ...cloud,...local,currentLesson:local.currentLesson || cloud.currentLesson,started:local.started || cloud.started,
    completed:[...new Set([...cloud.completed,...local.completed])],bestStars:maxCounts(cloud.bestStars,local.bestStars),attempts:maxCounts(cloud.attempts,local.attempts),hintsUsed:maxCounts(cloud.hintsUsed,local.hintsUsed),
    introducedConcepts:[...new Set([...(cloud.introducedConcepts || []),...(local.introducedConcepts || [])])],
    skillStates:{...cloud.skillStates,...local.skillStates},skillSupport:{...cloud.skillSupport,...local.skillSupport},supportOverrides:{...cloud.supportOverrides,...local.supportOverrides},scaffoldSkills:{...cloud.scaffoldSkills,...local.scaffoldSkills},
    supportCheckpoint:{successes:maxCounts(cloud.supportCheckpoint?.successes,local.supportCheckpoint?.successes),errors:{}},practiceSequence:Math.max(cloud.practiceSequence || 0,local.practiceSequence || 0),
    completedPracticeIds:[...new Set([...(cloud.completedPracticeIds || []),...(local.completedPracticeIds || [])])],
    ...mergeLearningRecords(cloud,local),profile:local.profile,sessions:local.sessions,drafts:local.drafts,activePractice:local.activePractice,recommendedPractice:local.recommendedPractice }
}
