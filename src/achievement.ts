import { chapters, chapterLessons, lessons } from './course'
import type { SkillState } from './mastery'
import type { SkillId } from './skills'
import type { ErrorType } from './validation'
export type SavedCheck = {
  passed: boolean
  message: string
  output: string[]
  error?: string
  systemError?: boolean
  errorType?: ErrorType
  affectedSkills?: SkillId[]
  stars?: number
  code: string
}
export type Session = { attempts: number; hintsUsed: number; solutionUsed: boolean; referenceUsed?: boolean; finished?: boolean; answer?: string; tokens?: number[]; firstActionAt?: number; startedAt: number; lastCheck?: SavedCheck }
export type LearningProgress = { bestStars?: Record<string, number>; sessions?: Record<string, Session>; introducedConcepts?: string[]; tutorialSteps?: Record<string, string>; attempts?: Record<string, number>; hintsUsed?: Record<string, number>; skillStates?: Partial<Record<SkillId, SkillState>>; practiceSequence?: number; currentChapter?: number; version?: number }
export const newSession = (): Session => ({ attempts: 0, hintsUsed: 0, solutionUsed: false, startedAt: Date.now() })
export function starsFor(s: Session) { return s.solutionUsed || s.hintsUsed >= 2 || s.attempts >= 4 ? 1 : s.hintsUsed === 1 || s.attempts >= 2 ? 2 : 3 }
export function chapterStars(chapter: number, p: LearningProgress) { return chapterLessons(chapter).filter(l => !l.tutorial?.length).reduce((n,l) => n + (p.bestStars?.[l.id] || 0), 0) }
export function chapterMax(chapter: number) { return chapterLessons(chapter).filter(l => !l.tutorial?.length).length * 3 }
const chapterRequirements: Record<number, Partial<Record<SkillId, number>>> = {
  2: { print: 0.45, string: 0.4, sequence: 0.25 },
  3: { variable: 0.33, assignment: 0.3, arithmetic: 0.3 },
  4: { comparison: 0.4, if: 0.4 },
  5: { loop: 0.4 }
}
export function gate(chapter: number, p: LearningProgress & { completed: number[] }) {
  if (chapter === 1) return { open: true, unfinished: 0, missingSkills: [] as SkillId[] }
  const previous = chapters.filter(c => c.id < chapter)
  const blocked = previous.find(c => chapterLessons(c.id).some(l => !p.completed.includes(l.id)))
  const requirements = chapterRequirements[chapter] || {}
  const missingSkills = (Object.entries(requirements) as [SkillId,number][]).filter(([skillId, minimum]) => (p.skillStates?.[skillId]?.mastery || 0) < minimum).map(([skillId]) => skillId)
  if (!blocked && !missingSkills.length) return { open: true, unfinished: 0, missingSkills }
  return { open: false, unfinished: blocked ? chapterLessons(blocked.id).filter(l => !p.completed.includes(l.id)).length : 0, chapter: blocked?.id || chapter - 1, missingSkills }
}
export function isUnlocked(id: number, p: LearningProgress & { completed: number[] }) {
  const lesson = lessons.find(l => l.id === id)
  if (!lesson) return false
  if (p.completed.includes(id)) return true
  const list = chapterLessons(lesson.chapter!)
  return gate(lesson.chapter!, p).open && list.slice(0, list.findIndex(l => l.id === id)).every(l => p.completed.includes(l.id))
}
