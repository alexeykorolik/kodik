import type { Lesson } from './learningEngine'
import type { SkillState } from './mastery'
import type { PracticeItem } from './practicePool'
import type { SkillId, SupportLevel } from './skills'
import { supportRank } from './skills'

export type SelectionReason = 'main' | 'corrective' | 'review' | 'less_support'
export type ExerciseSelection = { lessonId: number; practiceId?: string; reason: SelectionReason; supportLevel: SupportLevel; message?: string }
export type SelectionInput = {
  lessons: Lesson[]
  pool: PracticeItem[]
  completed: number[]
  currentLessonId?: number
  skillStates: Partial<Record<SkillId, SkillState>>
  practiceSequence: number
  completedPracticeIds?: string[]
}

const weakest = (ids: SkillId[], states: Partial<Record<SkillId, SkillState>>) => [...ids].sort((a,b) => (states[a]?.mastery || 0) - (states[b]?.mastery || 0) || a.localeCompare(b))[0]
const lessSupport = (level: SupportLevel): SupportLevel => level === 'blocks' ? 'blocks_with_code' : level === 'blocks_with_code' ? 'guided_code' : level === 'guided_code' ? 'code_tokens' : 'free_code'

export function selectNextExercise(input: SelectionInput): ExerciseSelection | null {
  const currentIndex = input.lessons.findIndex(lesson => lesson.id === input.currentLessonId)
  const next = input.lessons.slice(Math.max(0, currentIndex + 1)).find(lesson => !input.completed.includes(lesson.id))
  if (!next) return null
  const relevant = [...new Set([...(next.skills?.requires || []), ...(next.skills?.teaches || []), ...(next.skills?.practices || [])])]
  const knownSkills = Object.keys(input.skillStates) as SkillId[]
  const struggling = knownSkills.filter(id => (input.skillStates[id]?.consecutiveErrors || 0) >= 2).sort((a,b) => Number(!relevant.includes(a))-Number(!relevant.includes(b)))
  if (struggling.length) {
    const skillId = weakest(struggling, input.skillStates)
    const available=input.pool.filter(candidate=>!input.completedPracticeIds?.includes(candidate.id))
    const item = available.find(candidate => candidate.kind === 'corrective' && candidate.skills.includes(skillId)) || available.find(candidate => candidate.skills.includes(skillId))
    if (item) return { lessonId: item.sourceLessonId, practiceId: item.id, reason: 'corrective', supportLevel: item.supportLevel, message: item.title }
  }
  const stale = knownSkills.filter(id => {
    const state = input.skillStates[id]
    return state && state.mastery >= 0.35 && state.lastPracticedSequence !== undefined && input.practiceSequence - state.lastPracticedSequence >= 4
  }).sort((a,b) => Number(!relevant.includes(a))-Number(!relevant.includes(b)))
  if (stale.length) {
    const skillId = weakest(stale, input.skillStates)
    const item = input.pool.find(candidate => candidate.kind === 'review' && candidate.skills.includes(skillId) && !input.completedPracticeIds?.includes(candidate.id))
    if (item) return { lessonId: item.sourceLessonId, practiceId: item.id, reason: 'review', supportLevel: item.supportLevel, message: item.title }
  }
  const targetSkills = [...new Set([...(next.skills?.teaches || []), ...(next.skills?.practices || [])])]
  const confident = targetSkills.length > 0 && targetSkills.every(id => (input.skillStates[id]?.mastery || 0) >= 0.72 && (input.skillStates[id]?.independentSuccesses || 0) >= 2)
  const supportLevel = next.supportLevel || 'blocks_with_code'
  if (confident && supportRank[supportLevel] < supportRank.free_code) return { lessonId: next.id, reason: 'less_support', supportLevel: lessSupport(supportLevel) }
  return { lessonId: next.id, reason: 'main', supportLevel }
}
