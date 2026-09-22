import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { EditorHandle } from './BlocklyEditor'
import { blockOptions } from './blockCatalog'
import { checkLesson, renderPython, validName, type Lesson, type Program, type RunResult } from './learningEngine'
import { nextGuide, tutorialSteps, newBlocks, emptyInfo, selectedLines, lineSources } from './tutorial'
import { saveProgress, readLocalProgress, type Progress } from './progress'
import { newSession, starsFor, type Session } from './achievement'
import { track } from './analytics'
import { checkTextLesson } from './textLearning'
import { CodePreview, Modal, Stars } from './LearningUI'
import { applyMasteryEvent } from './mastery'
import { lessons } from './course'
import { practicePool } from './practicePool'
import { selectNextExercise } from './exerciseSelector'
const BlocklyEditor = lazy(() => import('./BlocklyEditor').then(m => ({ default: m.BlocklyEditor })))
type Result = { passed: boolean; message: string; result: RunResult; stars?: number; code: string }
function solvedTokenOrder(tokens: string[], answer = '') {
  const search = (prefix: string, used: number[]): number[] | null => {
    if (prefix === answer) return used
    if (!answer.startsWith(prefix)) return null
    for (let index=0;index<tokens.length;index++) if (!used.includes(index)) {
      const found=search(prefix+tokens[index],[...used,index])
      if (found) return found
    }
    return null
  }
  return search('',[]) || []
}

export function LearningLesson({ lesson: sourceLesson, lessonPosition, lessonTotal, progress, onProgress, onContinue, practiceMessage }: { lesson: Lesson; lessonPosition: number; lessonTotal: number; progress: Progress; onProgress: (p: Progress) => void; onContinue: () => void; practiceMessage?: string }) {
  const adaptiveCode=progress.supportOverrides?.[sourceLesson.id]==='free_code' && !!sourceLesson.codeAnswer
  const lesson: Lesson=adaptiveCode ? {...sourceLesson,mode:'text',answer:sourceLesson.codeAnswer,supportLevel:'free_code',tutorial:undefined,instruction:`Ты уверенно справлялся с этим навыком, поэтому блоки убраны. ${sourceLesson.instruction}`} : sourceLesson
  const initialSession = progress.sessions?.[lesson.id] || newSession()
  const [session, setSession] = useState<Session>(initialSession)
  const [program, setProgram] = useState<Program>({ statements: [] })
  const [info, setInfo] = useState(emptyInfo)
  const [modal, setModal] = useState<'blocks'|'variable'|'clear'|'help'|'example'|null>(null)
  const [outcome, setOutcome] = useState<Result | null>(() => initialSession.lastCheck ? {
    passed: initialSession.lastCheck.passed,
    message: initialSession.lastCheck.message,
    result: { output: initialSession.lastCheck.output, error: initialSession.lastCheck.error, systemError: initialSession.lastCheck.systemError, errorType: initialSession.lastCheck.errorType, affectedSkills: initialSession.lastCheck.affectedSkills },
    stars: initialSession.lastCheck.stars,
    code: initialSession.lastCheck.code
  } : null)
  const [checking, setChecking] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [codeExpanded, setCodeExpanded] = useState(false)
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
    persistSession({ ...session, solutionUsed: true, hintsUsed: Math.max(3, session.hintsUsed), answer: !blocksMode ? lesson.answer : session.answer, tokens: lesson.mode === 'tokens' ? solvedTokenOrder(lesson.tokens || [],lesson.answer) : session.tokens })
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
        const nextBase = { ...session, attempts: session.attempts + 1, finished: checked.passed }
        const stars = checked.passed && !tutorial ? starsFor(nextBase) : undefined
        const p = readLocalProgress()
        const practiceSequence = (p.practiceSequence || 0) + 1
        const observedSkills = checked.passed ? [...new Set([...(lesson.skills?.teaches || []), ...(lesson.skills?.practices || [])])] : checked.result.affectedSkills || lesson.skills?.practices || []
        const skillStates = applyMasteryEvent(p.skillStates || {}, { skills: observedSkills, success: checked.passed, supportLevel: lesson.supportLevel || 'blocks_with_code', hintsUsed: session.hintsUsed, solutionUsed: session.solutionUsed, at: new Date().toISOString(), sequence: practiceSequence })
        const extra: Partial<Progress> = { attempts: { ...p.attempts, [lesson.id]: (p.attempts?.[lesson.id] || 0) + 1 }, skillStates, practiceSequence }
        if (!checked.passed && p.supportOverrides?.[lesson.id]==='free_code' && observedSkills.some(skillId=>(skillStates[skillId]?.consecutiveErrors||0)>=2)) extra.supportOverrides={...p.supportOverrides,[lesson.id]:'blocks_with_code'}
        if (!checked.passed && !p.activePractice) {
          const selected=selectNextExercise({lessons,pool:practicePool,completed:p.completed,currentLessonId:lesson.id,skillStates,practiceSequence,completedPracticeIds:p.completedPracticeIds})
          if (selected?.reason==='corrective' && selected.practiceId && selected.message) {
            const nextMain=lessons[lessons.findIndex(item=>item.id===lesson.id)+1]
            const returnLesson=selected.lessonId===nextMain?.id ? lessons[lessons.findIndex(item=>item.id===nextMain.id)+1] : nextMain
            extra.recommendedPractice={id:selected.practiceId,lessonId:selected.lessonId,returnLessonId:returnLesson?.id,message:selected.message,reason:'corrective'}
          }
        }
        if (checked.passed) {
          extra.completed = [...new Set([...p.completed, lesson.id])]
          extra.bestStars = { ...p.bestStars, ...(stars ? { [lesson.id]: Math.max(stars, p.bestStars?.[lesson.id] || 0) } : {}) }
          extra.introducedConcepts = [...new Set([...(p.introducedConcepts || []), ...(lesson.tutorial || [])])]
        }
        const code = lesson.mode === 'completion' ? `${lesson.prefix}${currentAnswer}${lesson.suffix}` : renderPython(checked.program)
        const next = { ...nextBase, lastCheck: { passed: checked.passed, message: checked.message, output: checked.result.output, error: checked.result.error, systemError: checked.result.systemError, errorType: checked.result.errorType, affectedSkills: checked.result.affectedSkills, stars, code } }
        persistSession(next, extra)
        setOutcome({ ...checked, stars, code })
        track('check', lesson.id, { passed: checked.passed, attempt: next.attempts, stars: stars || 0 })
      } catch { setOutcome({ passed: false, message: 'Не удалось проверить. Прогресс сохранён. Попробуй ещё раз.', result: { output: [], systemError: true }, code: '' }) }
      finally { setChecking(false) }
    }, 80)
  }
  const answer = (value: string) => { persistSession({ ...session, answer: value }) }
  const allowed = guide?.target === 'add' ? [guide.block!] : lesson.chapter === 1 ? ['text_print', 'text'] : lesson.allowed || []
  const assistance = guide?.text || (guided ? 'Ты собрал программу. Ниже видно, как она записывается на Python. Нажми «Проверить», чтобы увидеть результат.' : lesson.starterHint)
  const focusSource = (sourceId: string) => editor.current?.focusBlock(sourceId)
  const primaryAction = () => {
    if (outcome?.passed || session.finished) { onContinue(); return }
    if (outcome) { setOutcome(null); return }
    verify()
  }
  const primaryLabel = checking ? 'Проверяем…' : outcome?.passed || session.finished ? 'Продолжить' : outcome ? 'Попробовать снова' : 'Проверить'

  return <>
    <article className={`lesson-flow novice-flow support-${lesson.supportLevel || 'blocks_with_code'} ${guided ? 'is-guided' : ''}`} aria-label={`Задание ${lessonPosition} из ${lessonTotal}`}>
      <section className="task-intro" aria-labelledby="lesson-title">
        {practiceMessage && <p className="practice-intro" role="status">{practiceMessage}. Это короткое повторение, не откат назад.</p>}
        <div className="exercise-meta"><span>{tutorial ? 'Знакомство · без оценки' : lesson.review ? 'Практика главы' : 'Самостоятельная практика'}</span>{!tutorial && <Stars value={progress.bestStars?.[lesson.id] || 0} />}</div>
        <h1 id="lesson-title">{lesson.title}</h1><p className="task-copy">{lesson.goal}</p>
        <details className="task-details"><summary>Подробнее о задании</summary><p className="instruction">{lesson.instruction}</p>{!guided && <p className="next-action">{assistance}</p>}</details>
        <div className="lesson-help"><button className="text-button" onClick={() => setModal('help')}>{blocksMode ? 'Как работать с блоками' : 'Как выполнить задание'}</button>{!guided && <button className="text-button hint-button" onClick={() => useHint()} disabled={session.hintsUsed >= 3}>{session.hintsUsed ? 'Ещё подсказка' : 'Нужна подсказка?'}</button>}</div>
        {!guided && session.hintsUsed > 0 && <div className="hint-area"><p className="hint-text" role="status"><span>Подсказка {Math.min(session.hintsUsed, 3)}/3</span>{lesson.progressiveHints?.[Math.min(session.hintsUsed - 1, lesson.progressiveHints.length - 1)] || (session.hintsUsed === 1 ? firstHint : lesson.hint)}</p>{session.hintsUsed >= 3 && <button className="text-button" onClick={solution}>Показать готовый вариант{!tutorial ? ' · 1 ★' : ''}</button>}</div>}
      </section>
      <section className={`learning-work ${lesson.id === 1 ? 'first-command' : ''}`} aria-label="Собери решение">
        {guided && <div className="coach" role="status"><span>Шаг {guide ? steps.indexOf(guide) + 1 : steps.length + 1} из {steps.length + 1}</span><p>{assistance}</p></div>}
        {blocksMode ? <>
          <div className="block-workspace-grid"><div className="workspace-section"><div className="workspace-heading"><h2>Программа</h2><details className="workspace-menu"><summary aria-label="Действия с программой">•••</summary><button onClick={() => setModal('clear')}>Очистить программу</button></details></div>
            <Suspense fallback={<div className="blockly-host editor-loading" role="status">Готовим блоки…</div>}><BlocklyEditor ref={editor} lesson={lesson} onChange={setProgram} onInfo={setInfo} onAction={action} onReady={() => setEditorReady(true)} focusType={guide?.target === 'field' ? guide.block : guide?.block === 'text' ? 'text_print' : undefined} hideTools={guided} /></Suspense>
            <div className="workspace-actions"><button disabled={!editorReady} className={`add-block-button ${guide?.target === 'add' || guide?.target === 'variable' ? 'coach-target' : ''}`} onClick={showBlocks}><span>+</span> {editorReady ? 'Добавить блок' : 'Готовим блоки…'}</button></div>
          </div>
          <section className={`live-mirror ${codeExpanded ? 'code-expanded' : 'code-compact'}`} aria-label="Твой Python" data-selected-id={info.selectedId || ''}><div><h2>Python</h2><button className="text-button compact-code-toggle" aria-expanded={codeExpanded} onClick={() => { setCodeExpanded(value=>!value); track('python_view', lesson.id) }}>{codeExpanded ? 'Свернуть' : 'Показать код'}</button></div><div className="code-reveal"><CodePreview code={renderPython(program)} highlights={selectedLines(program, info.selectedId)} sourceIds={lineSources(program)} onLineSelect={focusSource} /><p>{lesson.codeNote || 'Те же действия на языке Python. Когда меняются блоки, меняется и код.'}</p>{guide?.id === 'value' && <p className="slot-explanation">Многоточие … — пустое место. Команда ждёт, что ей показать.</p>}</div></section></div>
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
    {outcome && <section className={`feedback-panel ${outcome.passed ? 'feedback-success' : 'feedback-error'}`} role="status" aria-live="polite"><div className="feedback-summary"><span className="feedback-mark" aria-hidden="true">{outcome.passed ? '✓' : '!'}</span><div><h2>{outcome.result.systemError ? 'Не удалось проверить' : outcome.passed ? 'Получилось!' : 'Давай исправим'}</h2><p className="feedback-message">{outcome.message}</p></div>{outcome.passed && !tutorial && <Stars value={outcome.stars || 1} />}</div>{outcome.passed && tutorial && <p className="intro-complete">Знакомство завершено · без оценки</p>}{(outcome.code || outcome.result.output.length > 0) && <details className="feedback-details"><summary>{outcome.passed ? 'Посмотреть результат' : 'Подробности проверки'}</summary>{outcome.code && <CodePreview code={outcome.code} />}{outcome.result.output.length > 0 && <div className="output-preview"><span>Программа показала</span><pre>{outcome.result.output.join('\n')}</pre></div>}</details>}</section>}
    <footer className={`primary-action ${outcome ? outcome.passed ? 'action-success' : 'action-retry' : ''}`}><span>{outcome ? outcome.passed ? tutorial ? 'Знакомство завершено' : `${outcome.stars || 1} из 3 звёзд` : 'Исправь решение и проверь ещё раз' : tutorial ? 'Можно пробовать сколько угодно' : `Проверок: ${session.attempts} · подсказок: ${session.hintsUsed}`}</span><button className={guided && !guide ? 'coach-target' : ''} disabled={checking || (guided && !!guide)} onClick={primaryAction}>{primaryLabel}</button></footer>
    {modal === 'blocks' && <Modal title={guide?.target === 'variable' ? 'Создать переменную' : guide?.target === 'add' ? `Выбери «${blockOptions.find(b => b.type === guide.block)?.label}»` : 'Добавить блок'} onClose={() => setModal(null)}><Picker allowed={allowed} fresh={guided ? newBlocks(lesson) : []} canCreateVariable={lesson.allowed?.includes('variables_set') || guide?.target === 'variable'} variableOnly={guide?.target === 'variable'} onVariable={() => setModal('variable')} onAdd={type => { editor.current?.addBlock(type); track('block_added', lesson.id, { type, first: info.blocks.length === 0 }); setModal(null) }} /><p className="sheet-note">Доступны только элементы, которые нужны на этом шаге.</p></Modal>}
    {modal === 'variable' && <Modal title="Подпишем коробку" onClose={() => setModal(null)}><p>Название поможет программе найти сохранённое значение.</p><VariableForm onCreate={name => { action('create_variable'); editor.current?.createVariable(name); setModal(null) }} /></Modal>}
    {modal === 'clear' && <Modal title="Очистить программу?" onClose={() => setModal(null)}><p>Блоки можно вернуть кнопкой «Отменить изменение». Попытка проверки за очистку не расходуется.</p><button className="sheet-primary" onClick={() => { editor.current?.clear(); setModal(null) }}>Очистить</button></Modal>}
    {modal === 'help' && <Modal title="Как собирать программу" onClose={() => setModal(null)}><ol className="ui-help"><li>«Добавить блок» открывает команды и значения.</li><li>Сначала добавь команду. Например, «Напечатать».</li><li>В её пустое место добавь значение: текст или число.</li><li>Нажми белое поле, чтобы изменить значение. Новая команда соединится снизу; внутри условия или цикла — займёт свободное место.</li><li>Выбери внешний блок, чтобы продолжить после него. Блоки можно перетаскивать, отменять изменения и удалять.</li></ol><p>Это помощь с интерфейсом. Она не уменьшает звёзды.</p></Modal>}
    {modal === 'example' && <Modal title="Вспомним связь с блоками" onClose={() => setModal(null)}><ReferenceExample lesson={lesson} /></Modal>}
  </>
}
function ReferenceExample({lesson}:{lesson:Lesson}) {
  const practiced=lesson.skills?.practices || []
  if (practiced.includes('function')) return <><div className="block-meaning">Создать функцию <span>приветствие</span> → вызвать её</div><CodePreview code={'def приветствие():\n    print("Привет!")\n\nприветствие()'} /><p>def описывает действие. Имя со скобками запускает его. Команды внутри функции имеют отступ.</p></>
  if (practiced.includes('loop')) return <><div className="block-meaning">Повторить <span>3 раза</span></div><CodePreview code={'for i in range(3):\n    print("Учусь!")'} /><p>range(3) задаёт три повторения, а отступ связывает print с циклом.</p></>
  if (practiced.includes('if')) return <><div className="block-meaning">Если <span>баллы не меньше 10</span></div><CodePreview code={'if баллы >= 10:\n    print("Можно пройти")'} /><p>Двоеточие начинает ветку, а отступ показывает действие внутри условия.</p></>
  if (practiced.includes('variable')) return <><div className="block-meaning">Сохранить <span>Мира в имя</span> → прочитать имя</div><CodePreview code={'имя = "Мира"\nprint(имя)'} /><p>Слева от = находится имя коробки. В print имя пишется без кавычек, чтобы прочитать значение.</p></>
  return <><div className="block-meaning">Напечатать <span>«текст»</span></div><CodePreview code={'print("текст")'} /><p>Имя команды — print. Скобки окружают то, что нужно показать. Текст записывается в кавычках.</p></>
}
function Picker({ allowed, fresh, canCreateVariable, variableOnly, onVariable, onAdd }: { allowed: string[]; fresh: string[]; canCreateVariable?: boolean; variableOnly?: boolean; onVariable: () => void; onAdd: (type:string) => void }) {
  const [category, setCategory] = useState('Все')
  const available = variableOnly ? [] : blockOptions.filter(b => allowed.includes(b.type))
  const groups = [...new Set([...available.map(b => b.group), ...(canCreateVariable ? ['Данные'] : [])])]
  return <>{!variableOnly && available.length + (canCreateVariable ? 1 : 0) > 3 && <div className="category-tabs" aria-label="Категории блоков">{['Все',...groups].map(g => <button key={g} aria-pressed={category === g} className={category === g ? 'active' : ''} onClick={() => setCategory(g)}>{g}</button>)}</div>}<div className="block-options">{canCreateVariable && (variableOnly || category === 'Все' || category === 'Данные') && <button className="variable-option" onClick={onVariable}><strong>Создать переменную</strong><span>Дать имя новому значению</span><i aria-hidden="true">+</i></button>}{available.filter(b => category === 'Все' || b.group === category).map(b => <button key={b.type} onClick={() => onAdd(b.type)}>{fresh.includes(b.type) && <small className="new-block">Новое</small>}<strong>{b.label}</strong><span>{b.detail}</span><i aria-hidden="true">+</i></button>)}</div></>
}
function VariableForm({ onCreate }: { onCreate: (name:string) => void }) {
  const [name,setName] = useState(''), [error,setError] = useState('')
  return <form className="variable-form" onSubmit={e => { e.preventDefault(); if (!validName(name.trim())) { setError('Начни с буквы. Используй буквы, цифры и подчёркивание без пробелов.'); return } onCreate(name.trim()) }}><label htmlFor="variable-name">Название переменной</label><div><input id="variable-name" value={name} onChange={e => setName(e.target.value)} placeholder="Например, имя" maxLength={40} autoComplete="off" /><button type="submit">Создать</button></div><p role="status">{error}</p></form>
}
