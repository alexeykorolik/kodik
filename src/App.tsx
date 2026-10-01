import { useEffect, useState } from 'react'
import { chapters, chapterLessons, lessons } from './course'
import { loadCloudProgress, readLocalProgress, saveProgress, type Progress } from './progress'
import { chapterStars, isUnlocked, newSession } from './achievement'
import { LearningLesson } from './LearningLesson'
import { exportEvents, track } from './analytics'
import { selectNextExercise } from './exerciseSelector'
import { getPracticeLesson, practicePool } from './practicePool'
import { openLessonVariant } from './learningFlow'
import { materializeSupport } from './supportVariants'
import { useMobileLayout } from './useLessonViewport'
import { CoursePathScreen } from './CoursePathScreen'
import { BottomNavigation, HomeScreen } from './MobileOverview'
type Screen = 'home'|'path'|'lesson'|'finish'
export default function App() {
  const mobile = useMobileLayout()
  const [progress, setProgress] = useState(readLocalProgress)
  const [screen, setScreen] = useState<Screen>('home')
  const [lessonId, setLessonId] = useState(() => readLocalProgress().currentLesson || 1)
  const [runKey, setRunKey] = useState(0)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [status, setStatus] = useState('Прогресс сохраняется на этом устройстве')
  const practice = progress.activePractice
  const sourceLesson = (practice?.lessonId === lessonId ? getPracticeLesson(practice.id, practice.supportLevel) : lessons.find(l => l.id === lessonId)) || lessons[0]
  const lesson = sourceLesson.extended ? sourceLesson : materializeSupport(sourceLesson, progress.sessions?.[lessonId]?.supportLevel)
  const contextLesson = practice?.lessonId === lessonId ? lessons.find(item=>item.id===practice.returnLessonId) || lesson : lesson
  const lessonChapter = chapterLessons(contextLesson.chapter || 1)
  const lessonPosition = Math.max(1, lessonChapter.findIndex(item => item.id === contextLesson.id) + 1)
  const coursePosition = Math.max(1, lessons.findIndex(item => item.id === contextLesson.id) + 1)
  const activeSupport = lesson.supportLevel || 'blocks_with_code'
  const done = lessons.every(l => progress.completed.includes(l.id))
  const stars = chapters.reduce((n,c) => n + chapterStars(c.id, progress), 0)
  const resume = lessons.find(l => l.id === progress.currentLesson && !progress.sessions?.[l.id]?.finished && isUnlocked(l.id, progress)) || lessons.find(l => !progress.completed.includes(l.id) && isUnlocked(l.id, progress))
  const persist = (p: Progress) => { saveProgress(p); setProgress(p) }
  useEffect(() => {
    const network = () => { setOffline(!navigator.onLine); if (navigator.onLine) saveProgress(readLocalProgress()) }
    const storage = (e: Event) => setStatus((e as CustomEvent<string>).detail)
    window.addEventListener('online',network); window.addEventListener('offline',network); window.addEventListener('kodik-storage',storage)
    let mounted = true
    void loadCloudProgress().then(cloud => {
      if (!cloud || !mounted) return
      const local = readLocalProgress()
      const bestStars = { ...cloud.bestStars }
      for (const [id,value] of Object.entries(local.bestStars || {})) bestStars[id] = Math.max(value, bestStars[id] || 0)
      const merged = { ...cloud, ...local, currentLesson: local.currentLesson || cloud.currentLesson, started: local.started || cloud.started, completed: [...new Set([...cloud.completed,...local.completed])], bestStars, introducedConcepts: [...new Set([...(cloud.introducedConcepts || []),...(local.introducedConcepts || [])])], sessions: { ...cloud.sessions,...local.sessions } }
      saveProgress(merged,false); setProgress(merged)
    })
    return () => { mounted = false; window.removeEventListener('online',network); window.removeEventListener('offline',network); window.removeEventListener('kodik-storage',storage) }
  }, [])
  useEffect(() => {
    const p=readLocalProgress()
    if (!p.started || p.activePractice || p.recommendedPractice || !p.currentLesson || !p.completed.includes(p.currentLesson)) return
    const selected=selectNextExercise({lessons,pool:practicePool,completed:p.completed,currentLessonId:p.currentLesson,skillStates:p.skillStates||{},practiceSequence:p.practiceSequence||0,completedPracticeIds:p.completedPracticeIds})
    if (selected?.reason!=='review' || !selected.practiceId || !selected.message) return
    const returnLesson=lessons.find(item=>!p.completed.includes(item.id)&&isUnlocked(item.id,p))
    const updated={...p,recommendedPractice:{id:selected.practiceId,lessonId:selected.lessonId,returnLessonId:returnLesson?.id,message:selected.message,reason:'review' as const}}
    saveProgress(updated,false);setProgress(updated)
  }, [])
  useEffect(() => { window.scrollTo(0,0) }, [screen,lessonId,runKey])
  const open = (id: number) => {
    let p = readLocalProgress()
    const active = p.activePractice?.lessonId === id ? p.activePractice : undefined
    if (!active && p.activePractice) p = { ...p, activePractice: undefined }
    if (!active && !isUnlocked(id,p)) { setScreen('path'); return }
    const target = (active ? getPracticeLesson(active.id, active.supportLevel) : lessons.find(l => l.id === id))!
    const replay = !active && p.completed.includes(id)
    const sessions = { ...p.sessions }
    const drafts = { ...p.drafts }
    // Evaluate before starting a replay; do not clear an unfinished resumed session.
    const opened = active ? { lesson: target, progress: p, message: active.reason === 'corrective' ? 'Давай закрепим это ещё на одном примере.' : undefined, decision: undefined } : openLessonVariant(target,p)
    p = opened.progress
    if (opened.decision) track('adaptive_decision', id, { ...opened.decision, skillId: opened.decision.skillId || '' })
    if (opened.decision?.reason === 'advance') track('support_changed', id, { previousSupport: opened.decision.previousSupport, nextSupport: opened.decision.nextSupport, reason: 'advance' })
    if (replay || !sessions[id]) { sessions[id] = { ...newSession(), supportLevel: opened.lesson.supportLevel, supportMessage: opened.message }; if (replay) delete drafts[id] }
    else sessions[id] = { ...sessions[id], supportLevel: opened.lesson.supportLevel, supportMessage: opened.message }
    persist({ ...p, sessions, drafts, started: true, currentLesson: active ? active.returnLessonId : id, currentChapter: target.chapter })
    track(replay ? 'replay' : 'lesson_open', id)
    setLessonId(id); setRunKey(n => n + 1); setScreen('lesson')
  }
  const next = () => {
    const p = readLocalProgress()
    if (p.activePractice) {
      if (!p.sessions?.[p.activePractice.lessonId]?.finished) return
      const returnLessonId=p.activePractice.returnLessonId
      if (p.activePractice.reason === 'corrective') track('corrective_completed', lessonId, { practiceId: p.activePractice.id, returnLessonId: returnLessonId || 0 })
      const sessions = { ...p.sessions }
      if (returnLessonId && p.activePractice.reason === 'corrective' && sessions[returnLessonId]) {
        const old = sessions[returnLessonId], supportLevel = p.supportOverrides?.[returnLessonId] || old.supportLevel
        sessions[returnLessonId] = { ...old, supportLevel, answer: supportLevel !== old.supportLevel ? '' : old.answer, tokens: supportLevel !== old.supportLevel ? [] : old.tokens, lastCheck: undefined, meaningfulErrors: 0, recoveryOffered: false, supportMessage: 'Закрепили. Вернёмся к тому же заданию — твой прогресс сохранён.' }
      }
      persist({ ...p, sessions, activePractice: undefined, recommendedPractice: undefined, completedPracticeIds: [...new Set([...(p.completedPracticeIds || []),p.activePractice.id])] })
      if (returnLessonId && isUnlocked(returnLessonId,readLocalProgress())) { open(returnLessonId); return }
      setScreen('path'); return
    }
    if (p.recommendedPractice) {
      const recommendation=p.recommendedPractice
      persist({ ...p, activePractice: recommendation })
      const cleared = readLocalProgress(); const sessions = { ...cleared.sessions }; delete sessions[recommendation.lessonId]
      const drafts = { ...cleared.drafts }; delete drafts[recommendation.lessonId]
      persist({ ...cleared, sessions, drafts })
      open(recommendation.lessonId)
      return
    }
    const index = lessons.findIndex(l => l.id === lessonId)
    const candidate = lessons[index + 1]
    if (!candidate) { setScreen(lessons.every(l => p.completed.includes(l.id)) ? 'finish' : 'path'); return }
    if (candidate.chapter !== lesson.chapter || !isUnlocked(candidate.id,p)) { setScreen('path'); return }
    open(candidate.id)
  }
  const startOrResume = () => {
    const p=readLocalProgress()
    if (p.activePractice) { open(p.activePractice.lessonId); return }
    if (p.recommendedPractice) {
      const sessions = { ...p.sessions }; delete sessions[p.recommendedPractice.lessonId]
      const drafts = { ...p.drafts }; delete drafts[p.recommendedPractice.lessonId]
      persist({...p,sessions,drafts,activePractice:p.recommendedPractice})
      open(p.recommendedPractice.lessonId)
      return
    }
    if (resume && !done) open(resume.id)
    else setScreen('path')
  }
  return <main className={`app-shell screen-${screen} ${screen === 'lesson' ? `support-${activeSupport}` : ''}`}>
    <header className="lesson-header">
      {screen === 'lesson' ? <button className="back-button" onClick={() => setScreen('path')} aria-label="К карте курса">←</button> : <button className="brand" onClick={() => setScreen('home')} aria-label="Кодик — главная"><span aria-hidden="true">к.</span>Кодик</button>}
      {screen === 'lesson' ? <div className="lesson-position"><span>{practice ? 'Короткая практика' : 'Задание'}</span><strong><span className="desktop-only">{practice ? '↺' : `${lessonPosition}/${lessonChapter.length}`}</span><span className="mobile-only">{practice ? '↺' : `${coursePosition}/${lessons.length}`}</span></strong></div> : <button className="nav-link" onClick={() => setScreen('path')}>Карта курса ↗</button>}
      <div className={`header-progress ${screen === 'lesson' ? 'lesson-progress' : ''}`}><div className="progress-track" role="progressbar" aria-label={screen === 'lesson' && !mobile ? 'Прогресс главы' : 'Прогресс курса'} aria-valuemin={0} aria-valuemax={screen === 'lesson' && !mobile ? lessonChapter.length : lessons.length} aria-valuenow={screen === 'lesson' ? mobile ? coursePosition : lessonPosition : progress.completed.length}><i style={{ width: `${(screen === 'lesson' ? mobile ? coursePosition / lessons.length : lessonPosition / lessonChapter.length : progress.completed.length / lessons.length) * 100}%` }} /></div>{screen !== 'lesson' && <><b>{progress.completed.length}/{lessons.length}</b><span className="total-stars" aria-label={`Всего ${stars} звёзд`}>★ {stars}</span></>}</div>
    </header>
    {offline && <p className="network-note" role="status">Ты не в сети. Открытое занятие работает, прогресс сохраняется на устройстве.</p>}
    {screen === 'home' && <HomeScreen progress={progress} resumeId={resume?.id} done={done} onStart={startOrResume} onPath={() => setScreen('path')} onOpen={open} />}
    {screen === 'path' && <CoursePathScreen progress={progress} resume={resume} onOpen={open} onContinue={startOrResume} />}
    {screen === 'lesson' && <LearningLesson key={`${lessonId}-${runKey}`} lesson={lesson} lessonPosition={lessonPosition} lessonTotal={lessonChapter.length} progress={progress} onProgress={setProgress} onContinue={next} practiceMessage={progress.activePractice?.lessonId===lesson.id ? progress.activePractice.message : undefined} />}
    {screen === 'finish' && <section className="finish-screen"><div className="finish-mark">✓</div><p className="eyebrow">{lessons.length} заданий · {stars} ★</p><h1>От блоков — к своим строкам.</h1><p>Ты собрал команды, познакомился с переменными, условиями, циклами и функциями. А последние строки написал сам. Возвращайся к практике, чтобы закрепить понимание.</p><button className="primary-button" onClick={() => setScreen('path')}>К карте курса →</button></section>}
    {(screen === 'home' || screen === 'path' || screen === 'finish') && <BottomNavigation active={screen} onHome={() => setScreen('home')} onPath={() => setScreen('path')} onProgress={() => setScreen('path')} />}
    {screen !== 'lesson' && <footer className="site-footer"><span>Кодик · от блоков к пониманию</span><span role="status">{status}</span><details><summary>Данные тестирования</summary><p>События хранятся только здесь. Записываются действия и время, без введённого текста.</p><button className="text-button" onClick={exportEvents}>Скачать события JSON</button></details></footer>}
    {screen === 'lesson' && <p className="lesson-storage" role="status">{status}</p>}
  </main>
}
