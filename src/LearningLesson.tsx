import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { EditorHandle } from './BlocklyEditor'
import { blockOptions } from './blockCatalog'
import { checkLesson, renderPython, validName, type Lesson, type Program, type RunResult } from './learningEngine'
import { nextGuide, tutorialSteps, newBlocks, emptyInfo, selectedLines } from './tutorial'
import { saveProgress, readLocalProgress, type Progress } from './progress'
import { newSession, starsFor, type Session } from './achievement'
import { track } from './analytics'
import { checkTextLesson } from './textLearning'
import { CodePreview, Modal, Stars } from './LearningUI'
const BlocklyEditor = lazy(() => import('./BlocklyEditor').then(m => ({ default: m.BlocklyEditor })))
type Result = { passed: boolean; message: string; result: RunResult; stars?: number; code: string }

export function LearningLesson({ lesson, progress, onProgress, onContinue }: { lesson: Lesson; progress: Progress; onProgress: (p: Progress) => void; onContinue: () => void }) {
  const [session, setSession] = useState<Session>(() => progress.sessions?.[lesson.id] || newSession())
  const [program, setProgram] = useState<Program>({ statements: [] })
  const [info, setInfo] = useState(emptyInfo)
  const [modal, setModal] = useState<'blocks'|'variable'|'code'|'clear'|'help'|'example'|null>(null)
  const [outcome, setOutcome] = useState<Result | null>(null)
  const [checking, setChecking] = useState(false)
  const editor = useRef<EditorHandle>(null)
  const tutorial = !!lesson.tutorial?.length
  const guide = nextGuide(lesson, progress.introducedConcepts || [], info, program)
  const steps = tutorialSteps(lesson, progress.introducedConcepts || [])
  const guided = steps.length > 0
  const blocksMode = lesson.mode === 'blocks'
  const currentAnswer = lesson.mode === 'tokens' ? (session.tokens || []).map(i => lesson.tokens![i]).join('') : session.answer || ''
  const firstHint = lesson.mode === 'completion' ? 'Подумай, что случится с игроками, у которых 11 или 12 баллов. Равенства одному числу недостаточно.' : lesson.id === 8 ? 'Сначала найди количество в одной коробке. Результат этого действия должен стать частью второго вычисления.' : lesson.chapter === 3 ? 'Одно действие должно зависеть от проверки. Помести печать внутрь команды «Если».' : lesson.chapter === 4 && lesson.mode === 'blocks' ? 'Повторять нужно действие печати. Оно должно находиться внутри цикла.' : lesson.id === 12 ? 'Внутри цикла нужен вызов функции. Её определение должно находиться перед циклом.' : lesson.id === 15 ? 'Чтобы достать содержимое коробки, нужно её имя. Текст в кавычках не читает коробку.' : 'Команда вывода называется print. Она должна получить текст в кавычках внутри круглых скобок.'
  const persistSession = (next: Session, extra: Partial<Progress> = {}) => {
    if (!next.firstActionAt) { next = { ...next, firstActionAt: Date.now() }; track('first_action', lesson.id, { kind: 'interaction', elapsedMs: next.firstActionAt! - next.startedAt }) }
    setSession(next)
    const p = readLocalProgress()
    const updated = { ...p, ...extra, sessions: { ...p.sessions, [lesson.id]: next } }
    saveProgress(updated); onProgress(updated)
  }
  const action = (kind: string) => { if (!session.firstActionAt) { const now = Date.now(); track('first_action', lesson.id, { kind, elapsedMs: now - session.startedAt }); persistSession({ ...session, firstActionAt: now }) } }
  const guideId = guide?.id || 'ready'
  useEffect(() => {
    if (!guided || guide) return
    const reveal = () => document.querySelector('.live-mirror')?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    const field = document.querySelector('.blocklyHtmlInput')
    if (field) { field.addEventListener('blur', reveal, { once: true }); return () => field.removeEventListener('blur', reveal) }
    reveal()
  }, [guideId, guided])
  useEffect(() => {
    if (!guided) return
    track('tutorial_step', lesson.id, { step: guideId })
    const p = readLocalProgress(); saveProgress({ ...p, tutorialSteps: { ...p.tutorialSteps, [lesson.id]: guideId } }, false)
  }, [guideId, guided, lesson.id])
  const showBlocks = () => { action('open_picker'); setModal('blocks') }
  const useHint = (extra: Partial<Session> = {}) => {
    const next = { ...session, ...extra, hintsUsed: session.hintsUsed + 1 }
    const p = readLocalProgress()
    persistSession(next, { hintsUsed: { ...p.hintsUsed, [lesson.id]: (p.hintsUsed?.[lesson.id] || 0) + 1 } })
    track('hint', lesson.id, { level: next.hintsUsed })
  }
  const solution = () => {
    persistSession({ ...session, solutionUsed: true, hintsUsed: Math.max(3, session.hintsUsed), answer: !blocksMode ? lesson.answer : session.answer, tokens: lesson.mode === 'tokens' ? ['print','(','"Учусь!"',')'].map(t => lesson.tokens!.indexOf(t)) : session.tokens })
    if (blocksMode) editor.current?.showSolution()
    track('hint', lesson.id, { solution: true })
  }
  const verify = () => {
    if (checking || session.finished) return
    setChecking(true)
    window.setTimeout(() => {
      try {
        const currentProgram = editor.current?.getProgram() || program
        const checked = blocksMode ? { ...checkLesson(lesson, currentProgram), program: currentProgram } : checkTextLesson(lesson, currentAnswer)
        if (checked.result.systemError) { setOutcome({ ...checked, code: '' }); return }
        const next = { ...session, attempts: session.attempts + 1, finished: checked.passed }
        const stars = checked.passed && !tutorial ? starsFor(next) : undefined
        const p = readLocalProgress()
        const extra: Partial<Progress> = { attempts: { ...p.attempts, [lesson.id]: (p.attempts?.[lesson.id] || 0) + 1 } }
        if (checked.passed) {
          extra.completed = [...new Set([...p.completed, lesson.id])]
          extra.bestStars = { ...p.bestStars, ...(stars ? { [lesson.id]: Math.max(stars, p.bestStars?.[lesson.id] || 0) } : {}) }
          extra.introducedConcepts = [...new Set([...(p.introducedConcepts || []), ...(lesson.tutorial || [])])]
        }
        persistSession(next, extra)
        const code = lesson.mode === 'completion' ? `${lesson.prefix}${currentAnswer}${lesson.suffix}` : renderPython(checked.program)
        setOutcome({ ...checked, stars, code })
        track('check', lesson.id, { passed: checked.passed, attempt: next.attempts, stars: stars || 0 })
      } catch { setOutcome({ passed: false, message: 'Не удалось проверить. Прогресс сохранён. Попробуй ещё раз.', result: { output: [], systemError: true }, code: '' }) }
      finally { setChecking(false) }
    }, 80)
  }
  const answer = (value: string) => { persistSession({ ...session, answer: value }) }
  const allowed = guide?.target === 'add' ? [guide.block!] : lesson.chapter === 1 ? ['text_print', 'text'] : lesson.allowed || []
  const assistance = guide?.text || (guided ? 'Ты собрал программу. Ниже видно, как она записывается на Python. Нажми «Проверить», чтобы увидеть результат.' : lesson.starterHint)

  return <>
    <article className={`lesson-flow novice-flow ${guided ? 'is-guided' : ''}`}>
      <section className="task-intro" aria-labelledby="lesson-title">
        <div className="exercise-meta"><span>{tutorial ? 'Знакомство · без оценки' : lesson.review ? 'Практика главы' : 'Самостоятельная практика'}</span>{!tutorial && <Stars value={progress.bestStars?.[lesson.id] || 0} />}</div>
        <h1 id="lesson-title">{lesson.title}</h1><p className="instruction">{lesson.instruction}</p><p className="task-copy">{lesson.goal}</p>
        {!guided && <p className="next-action">{assistance}</p>}
        <div className="help-row"><button className="text-button" onClick={() => setModal('help')}>Как пользоваться блоками?</button>{!tutorial && <span>Помощь с интерфейсом бесплатна</span>}</div>
        {!guided && <div className="hint-area"><button className="text-button" onClick={() => useHint()} disabled={session.hintsUsed >= 3}>{session.hintsUsed ? 'Ещё подсказка' : 'Подсказка по решению'}</button>{!tutorial && !session.hintsUsed && <small>Одна подсказка — до 2 ★. Две — 1 ★.</small>}{session.hintsUsed > 0 && <p className="hint-text" role="status">{session.hintsUsed === 1 ? firstHint : lesson.hint}</p>}{session.hintsUsed >= 3 && <button className="text-button" onClick={solution}>Показать готовый вариант{!tutorial ? ' · 1 ★' : ''}</button>}</div>}
      </section>
      <section className={`learning-work ${lesson.id === 1 ? 'first-command' : ''}`} aria-label="Собери решение">
        {guided && <div className="coach" role="status"><span>Шаг {guide ? steps.indexOf(guide) + 1 : steps.length + 1} из {steps.length + 1}</span><p>{assistance}</p></div>}
        {blocksMode ? <>
          <div className="workspace-section"><div className="workspace-heading"><h2>Твои блоки</h2><button className="quiet-button" onClick={() => setModal('clear')}>Очистить</button></div>
            <Suspense fallback={<div className="blockly-host editor-loading" role="status">Готовим блоки…</div>}><BlocklyEditor ref={editor} lesson={lesson} onChange={setProgram} onInfo={setInfo} onAction={action} focusType={guide?.target === 'field' ? guide.block : guide?.block === 'text' ? 'text_print' : undefined} hideTools={guided} /></Suspense>
            <div className="workspace-actions"><button className={`add-block-button ${guide?.target === 'add' ? 'coach-target' : ''}`} onClick={showBlocks}><span>+</span> Добавить блок</button>{lesson.allowed?.includes('variables_set') && <button className={`code-button ${guide?.target === 'variable' ? 'coach-target' : ''}`} onClick={() => setModal('variable')}>Создать переменную</button>}</div>
          </div>
          <section className="live-mirror" aria-label="Твой Python"><div><h2>Твой Python</h2><button className="text-button" onClick={() => { setModal('code'); track('python_view', lesson.id) }}>Развернуть</button></div><CodePreview code={renderPython(program)} highlights={selectedLines(program, info.selectedType)} /><p>{lesson.codeNote || 'Те же действия на языке Python. Когда меняются блоки, меняется и код.'}</p>{guide?.id === 'value' && <p className="slot-explanation">Многоточие … — пустое место. Команда ждёт, что ей показать.</p>}</section>
        </> : <section className="text-exercise">
          {lesson.mode === 'recognition' && <div className="block-meaning">Напечатать <span>{lesson.id === 15 ? 'значение из «имя»' : '«Привет!»'}</span></div>}
          {lesson.mode === 'completion' && <CodePreview code={`${lesson.prefix}${currentAnswer || '___'}${lesson.suffix}`} />}
          {(lesson.mode === 'recognition' || lesson.mode === 'completion') && <fieldset className="code-choices"><legend>{lesson.mode === 'completion' ? 'Выбери пропущенный знак' : 'Выбери строку Python'}</legend>{lesson.choices!.map(choice => <label key={choice} className={currentAnswer === choice ? 'chosen' : ''}><input type="radio" name="code-choice" value={choice} checked={currentAnswer === choice} onChange={() => answer(choice)} /><code>{choice}</code></label>)}</fieldset>}
          {lesson.mode === 'tokens' && <><p>Нажимай части в нужном порядке. Нажми выбранную часть, чтобы вернуть её.</p><div className="token-result" aria-label="Собранная строка">{(session.tokens || []).map((i,pos) => <button key={i} onClick={() => persistSession({ ...session, tokens: session.tokens!.filter((_,n) => n !== pos) })}>{lesson.tokens![i]}</button>)}{!session.tokens?.length && <span>Здесь появится твоя строка</span>}</div><div className="token-options">{lesson.tokens!.map((token,i) => <button key={i} disabled={session.tokens?.includes(i)} onClick={() => persistSession({ ...session, tokens: [...(session.tokens || []), i] })}>{token}</button>)}</div></>}
          {lesson.mode === 'text' && <><label className="code-label" htmlFor="python-answer">Твой Python</label><textarea id="python-answer" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={currentAnswer} onChange={e => answer(e.target.value)} rows={lesson.id === 21 ? 5 : 3} placeholder="Напиши команду здесь" /></>}
          <button className="text-button" onClick={() => { if (!session.referenceUsed) useHint({ referenceUsed: true }); setModal('example') }}>Вспомнить по блокам{!tutorial ? ' · подсказка' : ''}</button>
        </section>}
      </section>
    </article>
    <footer className="primary-action"><span>{tutorial ? 'Можно пробовать сколько угодно — это знакомство.' : `Проверок: ${session.attempts} · подсказок: ${session.hintsUsed}`}</span><button className={guided && !guide ? 'coach-target' : ''} disabled={checking || (guided && !!guide)} onClick={session.finished ? onContinue : verify}>{checking ? 'Проверяем…' : session.finished ? 'Продолжить' : 'Проверить'}</button></footer>
    {modal === 'blocks' && <Modal title={guide?.target === 'add' ? `Выбери «${blockOptions.find(b => b.type === guide.block)?.label}»` : 'Добавить блок'} onClose={() => setModal(null)}><Picker allowed={allowed} fresh={guided ? newBlocks(lesson) : []} onAdd={type => { editor.current?.addBlock(type); track('block_added', lesson.id, { type, first: info.blocks.length === 0 }); setModal(null) }} /><p className="sheet-note">Блок сам соединится с подходящим пустым местом. Его можно переместить или удалить.</p></Modal>}
    {modal === 'variable' && <Modal title="Подпишем коробку" onClose={() => setModal(null)}><p>Название поможет программе найти сохранённое значение.</p><VariableForm onCreate={name => { action('create_variable'); editor.current?.createVariable(name); setModal(null) }} /></Modal>}
    {modal === 'code' && <Modal title="Твой Python" onClose={() => setModal(null)}><CodePreview code={renderPython(program)} highlights={selectedLines(program, info.selectedType)} /><p>{lesson.codeNote}</p></Modal>}
    {modal === 'clear' && <Modal title="Очистить программу?" onClose={() => setModal(null)}><p>Блоки можно вернуть кнопкой «Отменить изменение». Попытка проверки за очистку не расходуется.</p><button className="sheet-primary" onClick={() => { editor.current?.clear(); setModal(null) }}>Очистить</button></Modal>}
    {modal === 'help' && <Modal title="Как собирать программу" onClose={() => setModal(null)}><ol className="ui-help"><li>«Добавить блок» открывает команды и значения.</li><li>Сначала добавь команду. Например, «Напечатать».</li><li>В её пустое место добавь значение: текст или число.</li><li>Нажми белое поле, чтобы изменить значение. Новая команда соединится снизу; внутри условия или цикла — займёт свободное место.</li><li>Выбери внешний блок, чтобы продолжить после него. Блоки можно перетаскивать, отменять изменения и удалять.</li></ol><p>Это помощь с интерфейсом. Она не уменьшает звёзды.</p></Modal>}
    {modal === 'example' && <Modal title="Вспомним связь с блоками" onClose={() => setModal(null)}><div className="block-meaning">Напечатать <span>«текст»</span></div><CodePreview code={'print("текст")'} /><p>Имя команды — print. Скобки окружают то, что нужно показать. Текст записывается в кавычках.</p>{lesson.mode === 'completion' && <><div className="block-meaning">Если <span>баллы не меньше 10</span></div><CodePreview code={'if баллы >= 10:\n    print("Можно пройти")'} /></>}</Modal>}
    {outcome && <Modal title={outcome.result.systemError ? 'Не удалось проверить' : outcome.passed ? 'Получилось!' : 'Давай исправим'} onClose={() => setOutcome(null)} success={outcome.passed}>
      {outcome.passed && (tutorial ? <p className="intro-complete">Знакомство завершено · без оценки</p> : <><Stars value={outcome.stars || 1} /><p className="sheet-note">{outcome.stars === 3 ? 'С первой проверки и без подсказок.' : outcome.stars === 2 ? 'Хорошая практика. Можно повторить и улучшить результат.' : 'Задание пройдено. Повтори самостоятельно, чтобы заработать больше звёзд.'} Лучший результат сохраняется.</p></>)}
      <p className="feedback-message">{outcome.message}</p>{outcome.passed && <><h3>Вот твой Python</h3><CodePreview code={outcome.code} /><p className="sheet-note">{lesson.codeNote}</p></>}{outcome.result.output.length > 0 && <div className="output-preview"><span>Программа показала</span><pre>{outcome.result.output.join('\n')}</pre></div>}
      <button className="sheet-primary" onClick={outcome.passed ? onContinue : () => setOutcome(null)}>{outcome.passed ? 'Продолжить' : 'Исправить'}</button>
    </Modal>}
  </>
}
function Picker({ allowed, fresh, onAdd }: { allowed: string[]; fresh: string[]; onAdd: (type:string) => void }) {
  const [category, setCategory] = useState('Все')
  const available = blockOptions.filter(b => allowed.includes(b.type))
  return <>{available.length > 3 && <div className="category-tabs" aria-label="Категории блоков">{['Все',...new Set(available.map(b => b.group))].map(g => <button key={g} aria-pressed={category === g} className={category === g ? 'active' : ''} onClick={() => setCategory(g)}>{g}</button>)}</div>}<div className="block-options">{available.filter(b => category === 'Все' || b.group === category).map(b => <button key={b.type} onClick={() => onAdd(b.type)}>{fresh.includes(b.type) && <small className="new-block">Новое</small>}<strong>{b.label}</strong><span>{b.detail}</span><i aria-hidden="true">+</i></button>)}</div></>
}
function VariableForm({ onCreate }: { onCreate: (name:string) => void }) {
  const [name,setName] = useState(''), [error,setError] = useState('')
  return <form className="variable-form" onSubmit={e => { e.preventDefault(); if (!validName(name.trim())) { setError('Начни с буквы. Используй буквы, цифры и подчёркивание без пробелов.'); return } onCreate(name.trim()) }}><label htmlFor="variable-name">Название переменной</label><div><input id="variable-name" value={name} onChange={e => setName(e.target.value)} placeholder="Например, имя" maxLength={40} autoComplete="off" /><button type="submit">Создать</button></div><p role="status">{error}</p></form>
}
