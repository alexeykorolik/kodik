import { createClient } from '@supabase/supabase-js'
import { lessons } from './course'
import type { LearningProgress, Session } from './achievement'
import { emptySkillState, type SkillState } from './mastery'
import { skillIds, type SkillId } from './skills'
import type { SupportLevel } from './skills'
import { getPracticeLesson, practiceLessonId, practiceLessons, practicePool } from './practicePool'
import { materializeSupport } from './supportVariants'
import { supportLevels, type SupportCheckpoint } from './adaptiveSupport'
import type { FirstAttempt, LearningError } from './learningHistory'

export type PracticeRecommendation = { id: string; lessonId: number; returnLessonId?: number; message: string; reason: 'corrective'|'review'; supportLevel?: SupportLevel }
export type Progress = LearningProgress & { completed: number[]; currentLesson?: number; started?: boolean; drafts?: Record<string, object>; recommendedPractice?: PracticeRecommendation; activePractice?: PracticeRecommendation; completedPracticeIds?: string[]; supportOverrides?: Record<string,SupportLevel>; scaffoldSkills?: Record<string,SkillId>; skillSupport?: Partial<Record<SkillId, SupportLevel>>; supportCheckpoint?: SupportCheckpoint; errorHistory?: LearningError[]; firstAttemptResults?: Record<string, FirstAttempt>; profile?: { displayName: string } }
const storageKey = 'kodik-progress-v1'
const url = typeof import.meta.env === 'undefined' ? undefined : import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = typeof import.meta.env === 'undefined' ? undefined : import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabase = url && key ? createClient(url, key) : null
let memory: Progress = { completed: [] }
let storageUnavailable = false
let cloudQueue = Promise.resolve()
export function cleanProgress(value: unknown): Progress {
  if (!value || typeof value !== 'object') return { completed: [] }
  const p = value as Progress
  const completed = [...new Set(Array.isArray(p.completed) ? p.completed.filter(id => lessons.some(l => l.id === id)) : [])]
  const bestStars: Record<string,number> = {}
  for (const l of lessons) if (!l.tutorial?.length) { const n = p.bestStars?.[l.id]; if (typeof n === 'number' && n >= 1 && n <= 3) bestStars[l.id] = Math.floor(n); else if ((!p.version || p.version < 2) && completed.includes(l.id)) bestStars[l.id] = 2 }
  const sessions: Record<string, Session> = {}
  const count = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
  for (const l of [...lessons, ...practiceLessons]) {
    const s = p.sessions?.[l.id]
    if (!s || typeof s !== 'object') continue
    const rawCheck = s.lastCheck
    const lastCheck = rawCheck && typeof rawCheck === 'object' && typeof rawCheck.passed === 'boolean' && typeof rawCheck.message === 'string'
      ? {
          passed: rawCheck.passed,
          message: rawCheck.message,
          output: Array.isArray(rawCheck.output) ? rawCheck.output.filter((line): line is string => typeof line === 'string').slice(0, 1000) : [],
          error: typeof rawCheck.error === 'string' ? rawCheck.error : undefined,
          systemError: rawCheck.systemError === true,
          errorType: typeof rawCheck.errorType === 'string' ? rawCheck.errorType : undefined,
          affectedSkills: Array.isArray(rawCheck.affectedSkills) ? rawCheck.affectedSkills.filter((id): id is SkillId => skillIds.includes(id as SkillId)) : undefined,
          stars: typeof rawCheck.stars === 'number' && rawCheck.stars >= 1 && rawCheck.stars <= 3 ? Math.floor(rawCheck.stars) : undefined,
          code: typeof rawCheck.code === 'string' ? rawCheck.code.slice(0, 10000) : ''
        }
      : undefined
    const supportLevel = supportLevels.includes(s.supportLevel!) ? s.supportLevel : undefined
    const practice = practicePool.find(item => practiceLessonId(item.id) === l.id)
    const variant = practice ? getPracticeLesson(practice.id, supportLevel)! : materializeSupport(l, supportLevel || p.supportOverrides?.[l.id], skillIds.includes(s.scaffoldSkill!) ? s.scaffoldSkill : undefined)
    sessions[l.id] = { attempts: count(s.attempts), hintsUsed: count(s.hintsUsed), solutionUsed: s.solutionUsed === true, referenceUsed: s.referenceUsed === true, finished: s.finished === true, startedAt: count(s.startedAt), firstActionAt: typeof s.firstActionAt === 'number' ? s.firstActionAt : undefined, answer: typeof s.answer === 'string' ? s.answer.slice(0,10000) : '', tokens: Array.isArray(s.tokens) ? [...new Set(s.tokens.filter(n => Number.isInteger(n) && n >= 0 && n < (variant.tokens?.length || 0)))] : [], lastCheck, supportLevel, scaffoldSkill: skillIds.includes(s.scaffoldSkill!) ? s.scaffoldSkill : undefined, supportMessage: typeof s.supportMessage === 'string' ? s.supportMessage : undefined, checkedFingerprints: Array.isArray(s.checkedFingerprints) ? s.checkedFingerprints.filter(value => typeof value === 'string').slice(-100) : [], meaningfulErrors: count(s.meaningfulErrors), recoveryOffered: s.recoveryOffered === true }
  }
  const concepts = lessons.flatMap(l => l.tutorial || [])
  const introducedConcepts = [...new Set([...(Array.isArray(p.introducedConcepts) ? p.introducedConcepts.filter(c => concepts.includes(c)) : []), ...completed.flatMap(id => lessons.find(l => l.id === id)?.tutorial || [])])]
  const drafts = p.drafts && typeof p.drafts === 'object' && !Array.isArray(p.drafts) ? { ...p.drafts } : {}
  if (typeof p.version !== 'number' || p.version < 2) for (const id of [1,2,6,7]) delete drafts[id]
  const skillStates: Partial<Record<SkillId, SkillState>> = {}
  for (const skillId of skillIds) {
    const raw = p.skillStates?.[skillId]
    if (!raw || typeof raw !== 'object') continue
    skillStates[skillId] = { ...emptySkillState(skillId), mastery: Math.max(0, Math.min(1, typeof raw.mastery === 'number' && Number.isFinite(raw.mastery) ? raw.mastery : 0)), attempts: count(raw.attempts), successes: count(raw.successes), independentSuccesses: count(raw.independentSuccesses), hintsUsed: count(raw.hintsUsed), consecutiveErrors: count(raw.consecutiveErrors), lastPracticedAt: typeof raw.lastPracticedAt === 'string' ? raw.lastPracticedAt : undefined, lastPracticedSequence: typeof raw.lastPracticedSequence === 'number' ? count(raw.lastPracticedSequence) : undefined }
  }
  // Version-2 progress predates mastery. Infer conservative evidence from
  // completed exercises so existing learners are not locked out after update.
  if (!Object.keys(skillStates).length && completed.length) for (const id of completed) {
    const lesson = lessons.find(item => item.id === id)
    for (const skillId of [...(lesson?.skills?.teaches || []), ...(lesson?.skills?.practices || [])]) {
      const prior = skillStates[skillId] || emptySkillState(skillId)
      skillStates[skillId] = { ...prior, mastery: Math.min(0.8, prior.mastery + (lesson?.tutorial?.length ? 0.14 : 0.2)), attempts: prior.attempts + 1, successes: prior.successes + 1, independentSuccesses: prior.independentSuccesses + (lesson?.tutorial?.length ? 0 : 1) }
    }
  }
  // Previous versions kept only the latest check. Preserve that known error;
  // do not invent missing historical attempts or their scores.
  const previousErrors: LearningError[] = Array.isArray(p.errorHistory) ? p.errorHistory : Object.entries(sessions).flatMap(([id, session]) => session.lastCheck && !session.lastCheck.passed && !session.lastCheck.systemError ? [{ id: `legacy-${id}`, lessonId: Number(id), type: session.lastCheck.errorType || 'wrong_structure', message: session.lastCheck.message, skills: session.lastCheck.affectedSkills || [], occurredAt: 0, attempt: session.attempts, imported: true }] : [])
  const errorHistory: LearningError[] = previousErrors.filter(error => error && typeof error.id === 'string' && typeof error.lessonId === 'number' && typeof error.message === 'string').map(error => ({ id: error.id, lessonId: error.lessonId, type: (typeof error.type === 'string' ? error.type : 'wrong_structure') as LearningError['type'], message: error.message, skills: Array.isArray(error.skills) ? error.skills.filter(id => skillIds.includes(id)) : [], occurredAt: count(error.occurredAt), resolvedAt: error.resolvedAt ? count(error.resolvedAt) : undefined, attempt: count(error.attempt), imported: error.imported === true }))
  const firstAttemptResults: Record<string, FirstAttempt> = {}
  if (p.firstAttemptResults && typeof p.firstAttemptResults === 'object') for (const [id, result] of Object.entries(p.firstAttemptResults)) {
    if (result && typeof result.stars === 'number' && result.stars >= 0 && result.stars <= 3 && lessons.some(lesson => lesson.id === Number(id) && !lesson.tutorial?.length)) firstAttemptResults[id] = { stars: result.stars, passed: result.passed === true, at: count(result.at) }
  }
  else for (const lesson of lessons.filter(item => !item.tutorial?.length)) {
    const session = sessions[lesson.id]
    if (p.attempts?.[lesson.id] === 1 && session?.attempts === 1 && session.lastCheck && !session.lastCheck.systemError) firstAttemptResults[lesson.id] = { stars: session.lastCheck.passed ? session.lastCheck.stars || bestStars[lesson.id] || 0 : 0, passed: session.lastCheck.passed, at: session.startedAt }
  }
  return { completed, version: 4, bestStars, sessions, introducedConcepts, errorHistory, firstAttemptResults, profile: { displayName: typeof p.profile?.displayName === 'string' ? p.profile.displayName.trim().slice(0, 40) : '' },
    attempts: p.attempts && typeof p.attempts === 'object' ? p.attempts : {}, hintsUsed: p.hintsUsed && typeof p.hintsUsed === 'object' ? p.hintsUsed : {}, tutorialSteps: p.tutorialSteps || {}, currentChapter: lessons.find(l => l.id === p.currentLesson)?.chapter || 1,
    currentLesson: lessons.some(l => l.id === p.currentLesson) ? p.currentLesson : undefined,
    started: p.started === true || (Array.isArray(p.completed) && p.completed.length > 0),
    drafts, skillStates, practiceSequence: count(p.practiceSequence),
    recommendedPractice: cleanPractice(p.recommendedPractice), activePractice: cleanPractice(p.activePractice), completedPracticeIds: Array.isArray(p.completedPracticeIds) ? p.completedPracticeIds.filter(id=>practicePool.some(item=>item.id===id)).slice(-100) : [], supportOverrides: cleanSupportOverrides(p.supportOverrides), scaffoldSkills: Object.fromEntries(Object.entries(p.scaffoldSkills || {}).filter(([,skill]) => skillIds.includes(skill))), skillSupport: Object.fromEntries(Object.entries(cleanSupportOverrides(p.skillSupport)).filter(([id])=>skillIds.includes(id as SkillId))), supportCheckpoint: { successes: Object.fromEntries(skillIds.map(id=>[id,count(p.supportCheckpoint?.successes?.[id])])), errors: {} } }
}
function cleanSupportOverrides(value: unknown) {
  const result: Record<string,SupportLevel>={}
  if (!value || typeof value!=='object' || Array.isArray(value)) return result
  for (const [id,level] of Object.entries(value)) if (['blocks','blocks_with_code','guided_code','code_tokens','free_code'].includes(String(level))) result[id]=level as SupportLevel
  return result
}
function cleanPractice(value: unknown): PracticeRecommendation | undefined {
  if (!value || typeof value !== 'object') return undefined
  const item=value as Partial<PracticeRecommendation>
  if (typeof item.id!=='string' || typeof item.lessonId!=='number' || typeof item.message!=='string' || (item.reason!=='corrective'&&item.reason!=='review')) return undefined
  if (!practicePool.some(candidate => candidate.id === item.id)) return undefined
  return { id:item.id,lessonId:practiceLessonId(item.id)!,returnLessonId:lessons.some(lesson=>lesson.id===item.returnLessonId)?item.returnLessonId:undefined,message:item.message,reason:item.reason,supportLevel:supportLevels.includes(item.supportLevel!)?item.supportLevel:undefined }
}
export function readLocalProgress(): Progress {
  if (storageUnavailable) return memory
  try { memory = cleanProgress(JSON.parse(localStorage.getItem(storageKey) || 'null')); return memory }
  catch { return memory }
}
function status(message: string) { window.dispatchEvent(new CustomEvent('kodik-storage', { detail: message })) }
export function saveProgress(progress: Progress, cloud = true) {
  memory = progress
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); storageUnavailable = false }
  catch { storageUnavailable = true; status('Не удалось сохранить на устройстве. Не закрывай вкладку до конца занятия.'); return }
  if (cloud && supabase) cloudQueue = cloudQueue.then(() => syncToSupabase(progress)).catch(() => { status('Прогресс сохранён на устройстве. Облако пока недоступно.') })
}
async function userId() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user.id
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.user?.id
}
export async function loadCloudProgress(): Promise<Progress | null> {
  if (!supabase) return null
  try {
    const id = await userId()
    if (!id) return null
    const { data, error } = await supabase.from('learner_progress').select('completed_lesson_ids,current_lesson,started,learning_state').eq('user_id', id).maybeSingle()
    if (error) throw error
    return data ? cleanProgress({ ...data.learning_state, completed: data.completed_lesson_ids.map(Number), currentLesson: data.current_lesson, started: data.started }) : null
  } catch { status('Прогресс сохранён на устройстве. Облако пока недоступно.'); return null }
}
async function syncToSupabase(progress: Progress) {
  if (!supabase) return
  const id = await userId()
  if (!id) return
  const { drafts: _drafts, ...learning_state } = progress
  const { error } = await supabase.from('learner_progress').upsert({ user_id: id, completed_lesson_ids: progress.completed.map(String), current_lesson: progress.currentLesson, started: progress.started, learning_state, updated_at: new Date().toISOString() })
  if (error) throw error
  status('Прогресс сохранён на устройстве и в облаке.')
}
export function readDraft(id: number) { return readLocalProgress().drafts?.[String(id)] }
export function saveDraft(id: number, state: object) { const progress = readLocalProgress(); saveProgress({ ...progress, drafts: { ...progress.drafts, [id]: state } }, false) }
