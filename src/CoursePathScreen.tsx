import { useState } from 'react'
import { chapters, chapterLessons, lessons } from './course'
import { gate, isUnlocked } from './achievement'
import type { Progress } from './progress'
import type { Lesson } from './learningEngine'

const perPage = 4

export function CoursePathScreen({ progress, resume, onOpen, onContinue }: { progress: Progress; resume?: Lesson; onOpen: (id: number) => void; onContinue: () => void }) {
  const [chapterIndex, setChapterIndex] = useState(() => Math.max(0, chapters.findIndex(chapter => chapter.id === (resume?.chapter || 1))))
  const [page, setPage] = useState(() => Math.max(0, Math.floor(chapterLessons(resume?.chapter || 1).findIndex(item => item.id === resume?.id) / perPage)))
  const chapter = chapters[chapterIndex]
  const items = chapterLessons(chapter.id)
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const access = gate(chapter.id, progress)
  const chooseChapter = (next: number) => { setChapterIndex(Math.max(0, Math.min(chapters.length - 1, next))); setPage(0) }
  return <section className="course-path-fixed" aria-label="Карта курса">
    <header className="path-fixed-head"><p className="eyebrow">Твой маршрут</p><h1>Python с нуля</h1><div className="path-progress-card" id="course-progress"><div><span>Прогресс курса</span><strong>{progress.completed.length} / {lessons.length}</strong></div><div className="progress-track" role="progressbar" aria-label="Прогресс курса" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={progress.completed.length}><i style={{ width: `${progress.completed.length / lessons.length * 100}%` }} /></div></div></header>
    <div className="chapter-switcher"><button onClick={() => chooseChapter(chapterIndex - 1)} disabled={chapterIndex === 0} aria-label="Предыдущая глава">‹</button><div><small>Глава {chapter.id} из {chapters.length}</small><h2>{chapter.title}</h2></div><button onClick={() => chooseChapter(chapterIndex + 1)} disabled={chapterIndex === chapters.length - 1} aria-label="Следующая глава">›</button></div>
    <p className="path-chapter-description">{chapter.description}</p>
    <ol className="path-fixed-lessons">{items.slice(page * perPage, (page + 1) * perPage).map(item => {
      const complete = progress.completed.includes(item.id), unlocked = isUnlocked(item.id, progress)
      const position = lessons.indexOf(item) + 1
      return <li key={item.id} className={complete ? 'complete' : unlocked ? 'current' : 'locked'}><button onClick={() => onOpen(item.id)} disabled={!unlocked}><span className="path-number">{complete ? '✓' : position}</span><span className="path-lesson-copy"><small>{complete ? 'Пройдено' : unlocked ? 'Текущий шаг' : 'Пока закрыто'}</small><strong>{item.title}</strong></span><span className="path-arrow" aria-hidden="true">{unlocked ? '›' : '·'}</span></button></li>
    })}</ol>
    {!access.open && <p className="path-gate-note">Сначала заверши предыдущие шаги, чтобы открыть эту главу.</p>}
    <div className="path-page-controls"><button onClick={() => setPage(value => Math.max(0, value - 1))} disabled={page === 0}>Назад</button><span>{page + 1} / {pages}</span><button onClick={() => setPage(value => Math.min(pages - 1, value + 1))} disabled={page === pages - 1}>Дальше</button></div>
    {resume && <button className="primary-button path-fixed-continue" onClick={onContinue}>Продолжить обучение <span aria-hidden="true">→</span></button>}
  </section>
}
