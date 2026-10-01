import type { CSSProperties } from 'react'
import { lessons } from './course'
import { isUnlocked } from './achievement'
import type { Progress } from './progress'

type Screen = 'home' | 'path' | 'finish'

export function BottomNavigation({ active, onHome, onPath, onProgress }: { active: Screen; onHome: () => void; onPath: () => void; onProgress: () => void }) {
  return <nav className="bottom-navigation" aria-label="Основная навигация">
    <button className={active === 'home' ? 'active' : ''} aria-current={active === 'home' ? 'page' : undefined} onClick={onHome}><span aria-hidden="true">⌂</span>Главная</button>
    <button className={active === 'path' ? 'active' : ''} aria-current={active === 'path' ? 'page' : undefined} onClick={onPath}><span aria-hidden="true">▤</span>Курс</button>
    <button onClick={onProgress}><span aria-hidden="true">◔</span>Прогресс</button>
  </nav>
}

export function HomeScreen({ progress, resumeId, done, onStart, onPath, onOpen }: { progress: Progress; resumeId?: number; done: boolean; onStart: () => void; onPath: () => void; onOpen: (id: number) => void }) {
  const completed = progress.completed.length
  const currentIndex = Math.max(0, lessons.findIndex(lesson => lesson.id === resumeId))
  const preview = lessons.slice(Math.max(0, currentIndex - (completed ? 1 : 0)), currentIndex + 3)
  const next = lessons.find(lesson => lesson.id === resumeId)
  return <div className="home-overview">
    <section className="home-greeting">
      <p className="eyebrow">Твой путь в Python</p>
      <h1>{done ? 'Начало положено.' : progress.started ? 'Привет! Продолжим учиться?' : 'Привет! Начнём с первого блока.'}</h1>
      <p>{done ? 'Возвращайся к заданиям, чтобы закрепить навыки.' : 'Небольшие шаги помогут освоить код с нуля.'}</p>
    </section>
    <section className="home-progress-card" aria-label="Твой прогресс">
      <div className="progress-ring" style={{ '--progress': `${completed / lessons.length * 100}%` } as CSSProperties}><strong>{completed}/{lessons.length}</strong></div>
      <div><h2>Твой прогресс</h2><p>{completed === 0 ? 'Первое задание уже ждёт тебя' : `${completed} ${completed === 1 ? 'урок пройден' : completed < 5 ? 'урока пройдено' : 'уроков пройдено'} из ${lessons.length}`}</p></div>
    </section>
    <button className="home-resume-card" onClick={onStart}>
      <span className="resume-icon" aria-hidden="true">＋</span><span><strong>{progress.started ? done ? 'Повторить пройденное' : 'Твой следующий шаг' : 'Попробовать блок'}</strong><small>{next && !done ? next.title : 'Собери первую программу и увидь Python'}</small></span><span className="card-chevron" aria-hidden="true">›</span>
    </button>
    {progress.recommendedPractice && <p className="home-practice-note">Короткое повторение: {progress.recommendedPractice.message}</p>}
    <button className="primary-button home-main-action" onClick={onStart}>{done ? 'Повторить пройденное' : progress.recommendedPractice ? 'Быстро вспомнить' : progress.started ? resumeId ? 'Продолжить обучение' : 'К карте и повторению' : 'Начать бесплатно'} <span aria-hidden="true">→</span></button>
    <section className="home-path-preview" aria-labelledby="home-path-title"><div className="section-heading"><div><p className="section-label">Твой путь</p><h2 id="home-path-title">Python для новичков</h2></div><button className="text-button" onClick={onPath}>Весь курс →</button></div><p>От понятных блоков до собственных строк кода.</p><ol>{preview.map((lesson, index) => {
      const complete = progress.completed.includes(lesson.id)
      const unlocked = isUnlocked(lesson.id, progress)
      return <li key={lesson.id} className={complete ? 'complete' : unlocked && lesson.id === resumeId ? 'current' : 'locked'}><span className="preview-marker" aria-hidden="true">{complete ? '✓' : lesson.id}</span><button disabled={!unlocked} onClick={() => onOpen(lesson.id)}><span><strong>{lesson.title}</strong><small>{complete ? 'Пройдено' : unlocked ? index === 0 || lesson.id === resumeId ? 'Продолжить' : 'Доступно' : 'Откроется позже'}</small></span><span aria-hidden="true">{unlocked ? '›' : '·'}</span></button></li>
    })}</ol></section>
  </div>
}
