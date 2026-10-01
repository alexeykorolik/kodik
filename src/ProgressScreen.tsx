import { useState } from 'react'
import { lessons } from './course'
import type { Progress } from './progress'
import { errorLabels, firstAttemptSummary, type LearningError } from './learningHistory'
import { Icon } from './Icon'
import { Modal } from './LearningUI'
import { skills, skillIds } from './skills'
import { masteryLabel } from './mastery'

export function ProgressScreen({ progress }: { progress: Progress }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'fixed'>('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<LearningError | 'score' | null>(null)
  const [view, setView] = useState<'skills' | 'history' | 'scores'>('skills')
  const [skillPage, setSkillPage] = useState(0)
  const history = progress.errorHistory || []
  const summary = firstAttemptSummary(progress)
  const fixed = history.filter(error => error.resolvedAt).length
  const rows = [...history].reverse().filter(error => filter === 'all' || (filter === 'fixed' ? !!error.resolvedAt : !error.resolvedAt))
  const pages = Math.max(1, Math.ceil(rows.length / 3))
  const position = Math.min(page, pages - 1)
  const lessonName = (id: number) => lessons.find(lesson => lesson.id === id)?.title || 'Короткая практика'
  return <section className="insights-screen" aria-label="Прогресс обучения">
    <div className="insights-heading"><p className="eyebrow">Твои результаты</p><h1>Прогресс</h1><p>Пройдено {progress.completed.length} из {lessons.length} заданий</p></div>
    <div className="progress-tabs" aria-label="Разделы прогресса">{([['skills','Навыки'],['history','Что повторить'],['scores','Оценки']] as const).map(([id,title]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{title}</button>)}</div>
    {view === 'skills' && <>
      <div className="skills-journey"><Icon name="book" /><div><strong>Путь к самостоятельному Python</strong><p>Блоки → код с поддержкой → свой код</p></div></div>
      <div className="skill-cards">{skillIds.slice(skillPage * 4, skillPage * 4 + 4).map(id => {
        const state = progress.skillStates?.[id], started = !!state?.attempts
        return <div className="skill-card" key={id}><div><h2>{skills[id].title}</h2><span>{started ? masteryLabel(state.mastery) : 'Впереди'}</span></div><meter min={0} max={1} value={state?.mastery || 0} aria-label={`Освоение: ${skills[id].title}`} /><p>{!started ? 'Познакомимся с темой в курсе' : state.independentSuccesses ? `Самостоятельных решений: ${state.independentSuccesses}` : 'Продолжай с поддержкой — это тоже шаг вперёд'}</p></div>
      })}</div>
      <div className="path-page-controls skill-pages"><button disabled={skillPage === 0} onClick={() => setSkillPage(skillPage - 1)} aria-label="Предыдущие навыки"><Icon name="chevronLeft" size={18} /></button><span>{skillPage + 1} / {Math.ceil(skillIds.length / 4)}</span><button disabled={skillPage >= Math.ceil(skillIds.length / 4) - 1} onClick={() => setSkillPage(skillPage + 1)} aria-label="Следующие навыки"><Icon name="chevronRight" size={18} /></button></div>
    </>}
    {view === 'scores' && <><div className="insights-metrics">
      <button className="metric-card metric-primary" onClick={() => setSelected('score')} aria-label="Как считается средняя оценка первой проверки"><Icon name="star" /><strong>{summary.average === null ? '—' : summary.average.toFixed(1).replace('.', ',')}<small> / 3</small></strong><span>Средняя оценка<br />первой проверки</span><Icon name="info" size={15} className="metric-info" /></button>
      <div className="metric-card"><Icon name="check" /><strong>{summary.count ? Math.round(summary.passed / summary.count * 100) : '—'}{summary.count > 0 && <small>%</small>}</strong><span>Получилось<br />с первой проверки</span></div>
    </div><p className="score-note">Оценки помогают наблюдать за обучением. Навык растёт, когда ты пробуешь и исправляешь ошибки.</p></>}
    {view === 'history' && <><div className="history-heading"><div><h2>Что повторить</h2><p>{history.length ? `${history.length} за всё время · ${fixed} исправлено` : 'Здесь появятся темы для повторения'}</p></div><Icon name="clock" size={21} /></div>
    <div className="history-filters" aria-label="Фильтр ошибок">{([['all', 'Все'], ['open', 'Повторить'], ['fixed', 'Исправлены']] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(0) }}>{label}</button>)}</div>
    <div className="history-list">{rows.slice(position * 3, (position + 1) * 3).map(error => <button className={`history-row ${error.resolvedAt ? 'is-fixed' : ''}`} key={error.id} onClick={() => setSelected(error)}><span className="history-status"><Icon name={error.resolvedAt ? 'check' : 'alert'} size={20} /></span><span className="history-copy"><strong>{errorLabels[error.type] || 'Ошибка в решении'}</strong><small>{lessonName(error.lessonId)}</small><span>{error.message}</span></span><Icon name="chevronRight" size={18} /></button>)}{!rows.length && <div className="history-empty"><span><Icon name={filter === 'fixed' ? 'check' : 'book'} size={30} /></span><h3>{filter === 'all' ? 'Каждая попытка полезна' : filter === 'fixed' ? 'Исправления ещё впереди' : 'Всё исправлено'}</h3><p>{filter === 'all' ? 'Продолжай курс. Ошибки сохранятся здесь даже после того, как ты их исправишь.' : filter === 'fixed' ? 'После верного решения ошибки этого задания останутся здесь с отметкой «Исправлено».' : 'Новых ошибок для повторения пока нет.'}</p></div>}</div>
    {rows.length > 3 && <div className="path-page-controls history-pages"><button onClick={() => setPage(position - 1)} disabled={position === 0} aria-label="Предыдущие ошибки"><Icon name="chevronLeft" size={18} /></button><span>{position + 1} / {pages}</span><button onClick={() => setPage(position + 1)} disabled={position === pages - 1} aria-label="Следующие ошибки"><Icon name="chevronRight" size={18} /></button></div>}
    </>}
    {selected === 'score' && <Modal title="Оценка первой проверки" onClose={() => setSelected(null)}><p>Для каждого задания учитывается самая первая проверка: от 1 до 3 звёзд, если решение верное, или 0, если была ошибка.</p><p>Среднее рассчитано по {summary.count} заданиям. Последующие исправления и повторное прохождение не меняют этот показатель. Знакомства без оценки и короткие повторения не учитываются.</p><p>Для старых уроков включены только проверки, о которых сохранились достоверные данные.</p></Modal>}
    {selected && selected !== 'score' && <Modal title={errorLabels[selected.type] || 'Ошибка в решении'} onClose={() => setSelected(null)}><p className="eyebrow">{lessonName(selected.lessonId)}</p><p>{selected.message}</p><p>{selected.resolvedAt ? 'Исправлено: ты получил верный результат в этом задании.' : 'Можно вернуться к этому заданию через карту курса и попробовать ещё раз.'}</p><p className="history-date">{selected.imported ? 'Сохранено из последней проверки до обновления.' : new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' }).format(selected.occurredAt)} · Проверка {selected.attempt}</p></Modal>}
  </section>
}
