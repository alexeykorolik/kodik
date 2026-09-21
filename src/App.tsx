import { useEffect, useState } from 'react'
import { chapters, chapterLessons, lessons } from './course'
import { loadCloudProgress, readLocalProgress, saveProgress, type Progress } from './progress'
import { chapterMax, chapterStars, gate, isUnlocked, newSession } from './achievement'
import { LearningLesson } from './LearningLesson'
import { Stars } from './LearningUI'
import { exportEvents, track } from './analytics'
type Screen = 'home'|'path'|'lesson'|'finish'
export default function App() {
  const [progress, setProgress] = useState(readLocalProgress)
  const [screen, setScreen] = useState<Screen>('home')
  const [lessonId, setLessonId] = useState(() => readLocalProgress().currentLesson || 1)
  const [runKey, setRunKey] = useState(0)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [status, setStatus] = useState('Прогресс сохраняется на этом устройстве')
  const lesson = lessons.find(l => l.id === lessonId) || lessons[0]
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
  useEffect(() => { window.scrollTo(0,0) }, [screen,lessonId,runKey])
  const open = (id: number) => {
    const p = readLocalProgress()
    if (!isUnlocked(id,p)) { setScreen('path'); return }
    const target = lessons.find(l => l.id === id)!
    const replay = p.completed.includes(id)
    const sessions = { ...p.sessions }
    const drafts = { ...p.drafts }
    if (replay || !sessions[id]) { sessions[id] = newSession(); if (replay) delete drafts[id] }
    persist({ ...p, sessions, drafts, started: true, currentLesson: id, currentChapter: target.chapter })
    track(replay ? 'replay' : 'lesson_open', id)
    setLessonId(id); setRunKey(n => n + 1); setScreen('lesson')
  }
  const next = () => {
    const p = readLocalProgress()
    const index = lessons.findIndex(l => l.id === lessonId)
    const candidate = lessons[index + 1]
    if (!candidate) { setScreen(lessons.every(l => p.completed.includes(l.id)) ? 'finish' : 'path'); return }
    if (candidate.chapter !== lesson.chapter || !isUnlocked(candidate.id,p)) { setScreen('path'); return }
    open(candidate.id)
  }
  return <main className={`app-shell screen-${screen}`}>
    <header className="lesson-header">
      {screen === 'lesson' ? <button className="back-button" onClick={() => setScreen('path')} aria-label="К карте курса">←</button> : <button className="brand" onClick={() => setScreen('home')} aria-label="Кодик — главная"><span aria-hidden="true">к.</span>Кодик</button>}
      {screen === 'lesson' ? <div className="topic-label"><span>Глава {lesson.chapter} · Python</span><strong>{lesson.kicker}</strong></div> : <button className="nav-link" onClick={() => setScreen('path')}>Карта курса ↗</button>}
      <div className="header-progress"><div className="progress-track" role="progressbar" aria-label="Прогресс курса" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={progress.completed.length}><i style={{ width: `${progress.completed.length / lessons.length * 100}%` }} /></div><b>{progress.completed.length}/{lessons.length}</b><span className="total-stars" aria-label={`Всего ${stars} звёзд`}>★ {stars}</span></div>
    </header>
    {offline && <p className="network-note" role="status">Ты не в сети. Открытое занятие работает, прогресс сохраняется на устройстве.</p>}
    {screen === 'home' && <div className="home-layout"><section className="home-copy"><p className="eyebrow">Python · 5 глав · от блоков к своим строкам</p><h1>{done ? 'Начало положено.' : progress.started ? 'Продолжим собирать знания?' : <>Большой путь.<br />С маленького блока.</>}</h1><p className="home-description">{done ? 'Ты прошёл путь от первой команды до собственного кода. Можно повторить задания и улучшить результат.' : 'Никогда не программировал? Начнём вместе. Приложение покажет, куда нажать, а ты соберёшь свою первую команду и увидишь её на Python.'}</p>{progress.started && resume && <p className="resume-label">Твой следующий шаг<strong>{resume.title}</strong></p>}<button className="primary-button" onClick={() => resume && !done ? open(resume.id) : setScreen('path')}>{done ? 'Повторить пройденное' : progress.started ? resume ? 'Продолжить обучение' : 'К карте и повторению' : 'Начать бесплатно'} →</button><p className="small-note">Без регистрации. Ошибаться и пробовать — нормально.</p></section><div className="learning-illustration" aria-label="Блок печати превращается в Python"><div className="illustration-caption">Сначала — понятные блоки</div><div className="demo-block">напечатать <span>«Привет!»</span></div><div className="bridge-arrow" aria-hidden="true">↓</div><div className="demo-code"><span>print</span>(<b>"Привет!"</b>)</div><div className="illustration-caption bottom-caption">Затем — твоя первая строка Python</div><div className="illustration-seal" aria-hidden="true">&lt;/&gt;</div></div><div className="learning-steps"><p><b>01</b><strong>Попробуй с помощью</strong><span>Один понятный шаг за раз</span></p><p><b>02</b><strong>Закрепи самостоятельно</strong><span>Повторяй и улучшай результат</span></p><p><b>03</b><strong>Напиши код</strong><span>От узнавания строки к своей программе</span></p></div></div>}
    {screen === 'path' && <section className="course-path"><p className="eyebrow">Твой маршрут · {stars} ★</p><h1>Python с нуля</h1><p className="path-intro">Сначала знакомимся, затем пробуем сами.<br />Повторение сохраняет лучший результат.</p><details className="rating-rules"><summary>Как получить звёзды?</summary><p>3 ★ — с первой проверки без подсказок. 2 ★ — со второй или третьей проверки, либо с одной подсказкой. 1 ★ — после четырёх проверок, двух подсказок или готового примера.</p><p>Изменять блоки и пользоваться справкой можно бесплатно. Знакомства не оцениваются. Звёзды не теряются при повторении.</p></details>{chapters.map(chapter => {
      const access = gate(chapter.id,progress)
      const count = chapterStars(chapter.id,progress)
      const max = chapterMax(chapter.id)
      return <section className="chapter" key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}><div className="chapter-heading"><div><p>Глава {chapter.id}</p><h2 id={`chapter-${chapter.id}`}>{chapter.title}</h2></div><span>{count}/{max} ★</span></div><p className="chapter-description">{chapter.description}</p>{!access.open && <p className="gate-message" role="status">Чтобы открыть главу: {access.unfinished ? `заверши ещё ${access.unfinished} заданий в главе ${access.chapter}` : `повтори практику главы ${access.chapter}`}{access.missing ? ` и добери ${access.missing} ★` : ''}. Идеальный результат не нужен.</p>}<ol>{chapterLessons(chapter.id).map(item => {
        const complete = progress.completed.includes(item.id), unlocked = isUnlocked(item.id,progress)
        return <li key={item.id} className={`${complete ? 'complete' : ''} ${unlocked && !complete ? 'current' : ''}`}><button disabled={!unlocked} onClick={() => open(item.id)}><span className="path-number">{complete ? '✓' : lessons.indexOf(item) + 1}</span><span><small>{item.tutorial?.length ? 'Знакомство · без оценки' : item.mode !== 'blocks' ? 'Ближе к коду' : item.review ? 'Практика главы' : 'Практика'}</small><strong>{item.title}</strong>{!item.tutorial?.length && <Stars value={progress.bestStars?.[item.id] || 0} />}<em>{complete ? 'Пройти ещё раз' : unlocked ? 'Можно начинать' : 'Пока закрыто'}</em></span><span className="path-arrow" aria-hidden="true">{unlocked ? '→' : '—'}</span></button></li>
      })}</ol>{chapter.required > 0 && <p className="chapter-threshold">Следующая глава: все задания и {chapter.required} из {max} ★. {count >= chapter.required ? 'Звёзд уже достаточно.' : `Осталось ${chapter.required - count} ★.`}</p>}</section>
    })}</section>}
    {screen === 'lesson' && <LearningLesson key={`${lessonId}-${runKey}`} lesson={lesson} progress={progress} onProgress={setProgress} onContinue={next} />}
    {screen === 'finish' && <section className="finish-screen"><div className="finish-mark">✓</div><p className="eyebrow">{lessons.length} заданий · {stars} ★</p><h1>От блоков — к своим строкам.</h1><p>Ты собрал команды, познакомился с переменными, условиями, циклами и функциями. А последние строки написал сам. Возвращайся к практике, чтобы закрепить понимание.</p><button className="primary-button" onClick={() => setScreen('path')}>К карте курса →</button></section>}
    {screen !== 'lesson' && <footer className="site-footer"><span>Кодик · от блоков к пониманию</span><span role="status">{status}</span><details><summary>Данные тестирования</summary><p>События хранятся только здесь. Записываются действия и время, без введённого текста.</p><button className="text-button" onClick={exportEvents}>Скачать события JSON</button></details></footer>}
    {screen === 'lesson' && <p className="lesson-storage" role="status">{status}</p>}
  </main>
}
