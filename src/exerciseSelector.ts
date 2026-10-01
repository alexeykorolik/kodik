import type { Lesson } from './learningEngine'
import type { SkillState } from './mastery'
import { getPracticeLesson, type PracticeItem } from './practicePool'
import type { SkillId, SupportLevel } from './skills'
import { adaptiveThresholds } from './adaptiveSupport'

export type SelectionReason = 'main' | 'corrective' | 'review'
export type ExerciseSelection = { lessonId: number; practiceId?: string; reason: SelectionReason; supportLevel: SupportLevel; message?: string }
export type SelectionInput = {
  lessons: Lesson[]
  pool: PracticeItem[]
  completed: number[]
  currentLessonId?: number
  targetLessonId?: number
  correctiveOnly?: boolean
  skillStates: Partial<Record<SkillId, SkillState>>
  practiceSequence: number
  completedPracticeIds?: string[]
  now?: number
}

export function selectNextExercise(input: SelectionInput): ExerciseSelection | null {
  const currentIndex = input.lessons.findIndex(lesson => lesson.id === input.currentLessonId)
  const next = input.targetLessonId !== undefined ? input.lessons.find(lesson => lesson.id === input.targetLessonId) : input.lessons.slice(Math.max(0, currentIndex + 1)).find(lesson => !input.completed.includes(lesson.id))
  if (!next) return null
  const relevant = [...new Set([...(next.skills?.requires || []), ...(next.skills?.teaches || []), ...(next.skills?.practices || [])])]
  const knownSkills = Object.keys(input.skillStates) as SkillId[]
  const known = (id: SkillId) => (input.skillStates[id]?.successes || 0) > 0 || (input.skillStates[id]?.mastery || 0) >= 0.2
  const targetSkills = [...new Set([...(next.skills?.teaches || []),...(next.skills?.practices || [])])]
  const eligible = (corrective: boolean) => input.pool.filter(item => {
    const source = input.lessons.find(lesson=>lesson.id===item.sourceLessonId)
    const required = [...new Set([...item.requires,...(source?.skills?.requires || [])])]
    return !!source && (!next.extended || !!source.extended) && required.every(id=>known(id) || (corrective && targetSkills.includes(id)))
  })
  const ordered = (ids: SkillId[]) => ids.sort((a,b) => Number(!relevant.includes(a)) - Number(!relevant.includes(b)) || (input.skillStates[a]?.mastery || 0) - (input.skillStates[b]?.mastery || 0) || a.localeCompare(b))
  const struggling = ordered(relevant.filter(id => (input.skillStates[id]?.consecutiveErrors || 0) >= adaptiveThresholds.meaningfulErrors))
  for (const skillId of struggling) {
    const item = eligible(true).find(candidate => candidate.kind === 'corrective' && candidate.skills.includes(skillId)) || eligible(true).find(candidate => candidate.skills.includes(skillId))
    if (item) { const lesson = getPracticeLesson(item.id)!; return { lessonId: lesson.id, practiceId: item.id, reason: 'corrective', supportLevel: lesson.supportLevel!, message: item.title } }
  }
  if (input.correctiveOnly) return null
  // A sequence gap is not elapsed time: review means the learner returned later.
  const now = input.now ?? Date.now()
  const stale = ordered(knownSkills.filter(id => {
    const state = input.skillStates[id]
    const at = Date.parse(state?.lastPracticedAt || '')
    return state && state.mastery >= 0.35 && Number.isFinite(at) && now - at >= adaptiveThresholds.reviewDays * 86400000
  }))
  for (const skillId of stale) {
    const item = eligible(false).find(candidate => candidate.kind === 'review' && candidate.skills.includes(skillId))
    if (item) { const lesson = getPracticeLesson(item.id)!; return { lessonId: lesson.id, practiceId: item.id, reason: 'review', supportLevel: lesson.supportLevel!, message: item.title } }
  }
  const supportLevel = next.supportLevel || 'blocks_with_code'
  return { lessonId: next.id, reason: 'main', supportLevel }
}
