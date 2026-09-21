import { chapters, chapterLessons, lessons } from './course'
export type Session = { attempts: number; hintsUsed: number; solutionUsed: boolean; referenceUsed?: boolean; finished?: boolean; answer?: string; tokens?: number[]; firstActionAt?: number; startedAt: number }
export type LearningProgress = { bestStars?: Record<string, number>; sessions?: Record<string, Session>; introducedConcepts?: string[]; tutorialSteps?: Record<string, string>; attempts?: Record<string, number>; hintsUsed?: Record<string, number>; currentChapter?: number; version?: number }
export const newSession = (): Session => ({ attempts: 0, hintsUsed: 0, solutionUsed: false, startedAt: Date.now() })
export function starsFor(s: Session) { return s.solutionUsed || s.hintsUsed >= 2 || s.attempts >= 4 ? 1 : s.hintsUsed === 1 || s.attempts >= 2 ? 2 : 3 }
export function chapterStars(chapter: number, p: LearningProgress) { return chapterLessons(chapter).filter(l => !l.tutorial?.length).reduce((n,l) => n + (p.bestStars?.[l.id] || 0), 0) }
export function chapterMax(chapter: number) { return chapterLessons(chapter).filter(l => !l.tutorial?.length).length * 3 }
export function gate(chapter: number, p: LearningProgress & { completed: number[] }) {
  if (chapter === 1) return { open: true, missing: 0, unfinished: 0 }
  const previous = chapters.filter(c => c.id < chapter)
  const blocked = previous.find(c => chapterLessons(c.id).some(l => !p.completed.includes(l.id)) || chapterStars(c.id, p) < c.required)
  if (!blocked) return { open: true, missing: 0, unfinished: 0 }
  return { open: false, missing: Math.max(0, blocked.required - chapterStars(blocked.id, p)), unfinished: chapterLessons(blocked.id).filter(l => !p.completed.includes(l.id)).length, chapter: blocked.id }
}
export function isUnlocked(id: number, p: LearningProgress & { completed: number[] }) {
  const lesson = lessons.find(l => l.id === id)
  if (!lesson) return false
  if (p.completed.includes(id)) return true
  const list = chapterLessons(lesson.chapter!)
  return gate(lesson.chapter!, p).open && list.slice(0, list.findIndex(l => l.id === id)).every(l => p.completed.includes(l.id))
}
