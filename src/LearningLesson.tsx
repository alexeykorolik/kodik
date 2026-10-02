import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { EditorHandle } from './BlocklyEditor'
import { blockOptions } from './blockCatalog'
import { checkLesson, renderPython, validName, type Lesson, type Program, type RunResult } from './learningEngine'
import { nextGuide, tutorialSteps, newBlocks, emptyInfo, selectedLines, lineSources } from './tutorial'
import { saveProgress, readLocalProgress, type Progress } from './progress'
import { newSession, starsFor, type Session } from './achievement'
import { track } from './analytics'
import { checkTextLesson } from './textLearning'
import { parsePythonProgram } from './textLearning'
import { CodePreview, DrawingPreview, Modal, Stars } from './LearningUI'
import { runCourseProgram } from './pythonRuntime'
import { parseCourseProgram } from './pythonRuntime'
import { summarizePython } from './pythonStructure'
import { normalizeInvalidPython } from './pythonEvidence'
import { courseMaterials } from './courseMaterials'
import { recordLearningCheck } from './learningHistory'
import { Icon } from './Icon'
import { applyMasteryEvent } from './mastery'
import { lessons } from './course'
import { practicePool } from './practicePool'
import { selectNextExercise } from './exerciseSelector'
import { getPracticeLesson } from './practicePool'
import { answerFingerprint, applySupportDecision, decideLessonSupport, meaningfulAnswer } from './learningFlow'
import { supportExplanation } from './supportVariants'
import { useLessonViewport } from './useLessonViewport'
import { mobileGoal, mobileGuide } from './mobileLesson'
import { MinimalCodeEditor } from './MinimalCodeEditor'
import { AITutor } from './ai/aiTutor'
import { HttpAIProvider } from './ai/aiProvider'
import { buildTutorContext } from './ai/aiContext'
import { tutorFlags } from './ai/aiFlags'
import type { TutorAction, TutorResult } from './ai/aiTypes'
import { useAndroidBack } from './useAndroidBack'
const BlocklyEditor = lazy(() => import('./BlocklyEditor').then(m => ({ default: m.BlocklyEditor })))
const aiTutor = new AITutor(new HttpAIProvider(), tutorFlags.tutor)
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

export function LearningLesson({ lesson, lessonPosition, lessonTotal, progress, onProgress, onContinue, practiceMessage }: { lesson: Lesson; lessonPosition: number; lessonTotal: number; progress: Progress; onProgress: (p: Progress) => void; onContinue: () => void; practiceMessage?: string }) {
  const initialSession = progress.sessions?.[lesson.id] || newSession()
  const [session, setSession] = useState<Session>(initialSession)
  const [program, setProgram] = useState<Program>({ statements: [] })
  const [info, setInfo] = useState(emptyInfo)
  const [pythonSource, setPythonSource] = useState<string | undefined>(undefined)
  const [modal, setModal] = useState<'blocks'|'variable'|'clear'|'help'|'example'|'python'|'result'|null>(null)
  const [outcome, setOutcome] = useState<Result | null>(() => initialSession.lastCheck ? {
    passed: initialSession.lastCheck.passed,
    message: initialSession.lastCheck.message,
    result: { output: initialSession.lastCheck.output, error: initialSession.lastCheck.error, systemError: initialSession.lastCheck.systemError, errorType: initialSession.lastCheck.errorType, affectedSkills: initialSession.lastCheck.affectedSkills },
    stars: initialSession.lastCheck.stars,
    code: initialSession.lastCheck.code
  } : null)
  const [checking, setChecking] = useState(false)
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false)
  useAndroidBack(()=>{ if (!workspaceExpanded) return false; setWorkspaceExpanded(false); return true },50)
  const [tutorAnswer, setTutorAnswer] = useState<{ action: TutorAction; level: number; result: TutorResult } | null>(null)
  const [tutorLoading, setTutorLoading] = useState(false)
  const tutorSerial = useRef(0)
  const awaitingHintAttempt = useRef<number | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const [codeExpanded, setCodeExpanded] = useState(() => lesson.supportLevel !== 'blocks' && window.matchMedia('(min-width: 768px)').matches)
  const editor = useRef<EditorHandle>(null)
  const verifyTimer = useRef<number | undefined>(undefined)
  const pendingSource = useRef<string | undefined>(undefined)
  const feedback = useRef<HTMLElement>(null)
  const { mobile, actionRef } = useLessonViewport()
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
    // Opening a sheet moves DOM focus away from Blockly. Retain the exact
    // source context for the mirror until that block is removed or replaced.
    setPythonSource(previous => info.selectedId || (info.blocks.some(block => block.id === previous) ? previous : undefined))
  }, [info])
  useEffect(() => () => window.clearTimeout(verifyTimer.current), [])
  useEffect(() => { tutorSerial.current++; setTutorAnswer(null); setTutorLoading(false); awaitingHintAttempt.current = null }, [lesson.id])
  useEffect(() => {
    if (modal || !pendingSource.current) return
    const sourceId = pendingSource.current
    pendingSource.current = undefined
    // Passive modal cleanup (including native focus restoration) runs before
    // this next-frame selection. Otherwise it can clear the chosen block.
    const frame = requestAnimationFrame(() => editor.current?.focusBlock(sourceId))
    return () => cancelAnimationFrame(frame)
  }, [modal])
  useEffect(() => {
    if (!guided || guide) return
    if (mobile) return
    const reveal = () => { setCodeExpanded(true); document.querySelector('.live-mirror')?.scrollIntoView({ block: 'nearest', behavior: 'instant' }) }
    const field = document.querySelector('.blocklyHtmlInput')
    if (field) { field.addEventListener('blur', reveal, { once: true }); return () => field.removeEventListener('blur', reveal) }
    reveal()
  }, [guideId, guided, mobile])
  useEffect(() => {
    if (!outcome) return
    const frame = requestAnimationFrame(() => feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [outcome?.passed, session.attempts])
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
  const requestTutor = async (kind: TutorAction, level = Math.min(3, session.hintsUsed || 1)) => {
    if (!tutorFlags.tutor || (kind === 'example' && !tutorFlags.examples) || ((kind === 'concept' || kind === 'error_explanation') && !tutorFlags.explanations)) return
    const serial = ++tutorSerial.current
    setTutorLoading(true)
    setTutorAnswer(null)
    let currentProgram = editor.current?.getProgram() || program
    if (lesson.extended) {
      const source = lesson.mode === 'completion' || lesson.mode === 'tokens' ? `${lesson.prefix || ''}${currentAnswer}${lesson.suffix || ''}` : currentAnswer
      try { currentProgram = { statements: [], normalizedStructure: summarizePython(parseCourseProgram(source)) } }
      catch { currentProgram = { statements: [], normalizedStructure: 'syntax_error' } }
    } else if (lesson.mode === 'text') { try { currentProgram = parsePythonProgram(currentAnswer) } catch { currentProgram = { statements: [] } } }
    const request = { action: kind, hintLevel: level as 1 | 2 | 3,
      context: buildTutorContext(lesson, progress, { ...session, hintsUsed: kind === 'hint' ? level : session.hintsUsed }, currentProgram, outcome && !outcome.passed ? outcome.result.errorType : undefined) }
    const metadata = { action: kind, level, skillId: request.context.skill.id, supportLevel: request.context.task.supportLevel, errorType: request.context.lastError?.type || '' }
    track(kind === 'hint' ? 'ai_hint_requested' : kind === 'example' ? 'ai_example_requested' : 'ai_explanation_requested', lesson.id, metadata)
    const result = await aiTutor.respond(request, lesson)
    if (serial !== tutorSerial.current) return
    setTutorAnswer({ action: kind, level, result })
    setTutorLoading(false)
    if (result.source === 'ai') {
      track('ai_hint_generated', lesson.id, { ...metadata, latencyMs: result.latencyMs, provider: result.provider })
      if (kind === 'hint') awaitingHintAttempt.current = session.attempts
    } else {
      track('ai_hint_fallback', lesson.id, { ...metadata, reason: result.reason || 'unknown' })
      if (result.reason === 'invalid_response') track('ai_response_failed', lesson.id, { reason: result.reason })
    }
  }
  const showHint = () => {
    const level = Math.min(3, session.hintsUsed + 1)
    useHint()
    void requestTutor('hint', level)
  }
  const solution = () => {
    persistSession({ ...session, solutionUsed: true, hintsUsed: Math.max(3, session.hintsUsed), answer: !blocksMode ? lesson.answer : session.answer, tokens: lesson.mode === 'tokens' ? solvedTokenOrder(lesson.tokens || [],lesson.answer) : session.tokens })
    if (blocksMode) editor.current?.showSolution()
    track('hint', lesson.id, { solution: true })
  }
  const verify = () => {
    if (checking || session.finished) return
    setChecking(true)
    verifyTimer.current = window.setTimeout(() => {
      try {
        const currentProgram = editor.current?.getProgram() || program
        const checked = blocksMode ? { ...checkLesson(lesson, currentProgram), program: currentProgram } : checkTextLesson(lesson, currentAnswer)
        if (awaitingHintAttempt.current !== null && session.attempts >= awaitingHintAttempt.current) {
          track('ai_hint_outcome', lesson.id, { passed: checked.passed, nextAttempt: session.attempts + 1, errorType: checked.result.errorType || '', skillId: lesson.skills?.teaches[0] || lesson.skills?.practices[0] || '', supportLevel: lesson.supportLevel || 'blocks_with_code' })
          awaitingHintAttempt.current = null
        }
        if (checked.result.systemError) { setOutcome({ ...checked, code: '' }); return }
        const rawAnswer = blocksMode ? currentProgram.statements.length ? renderPython(currentProgram) : '' : currentAnswer
        let evidenceAnswer = (lesson.mode === 'text' || lesson.mode === 'tokens') && checked.program.statements.length ? renderPython(checked.program) : rawAnswer.trimEnd()
        if (lesson.extended) {
          const fullCode = lesson.mode === 'completion' ? (lesson.prefix || '') + rawAnswer + (lesson.suffix || '') : rawAnswer
          try { evidenceAnswer = JSON.stringify(parseCourseProgram(fullCode)) } catch { evidenceAnswer = normalizeInvalidPython(fullCode) }
        } else if (!blocksMode && checked.result.errorType === 'syntax_error') evidenceAnswer = normalizeInvalidPython(evidenceAnswer)
        const fingerprint = answerFingerprint(evidenceAnswer)
        const meaningful = meaningfulAnswer(rawAnswer) && !(session.checkedFingerprints || []).includes(fingerprint)
        const nextBase = { ...session, attempts: session.attempts + 1, finished: checked.passed, checkedFingerprints: meaningful ? [...(session.checkedFingerprints || []),fingerprint] : session.checkedFingerprints,
          meaningfulErrors: checked.passed ? 0 : (session.meaningfulErrors || 0) + Number(meaningful) }
        const stars = checked.passed && !tutorial && !progress.activePractice ? starsFor(nextBase) : undefined
        const p = readLocalProgress()
        const practiceSequence = (p.practiceSequence || 0) + Number(meaningful || checked.passed)
        const targetSkills = [...new Set([...(lesson.skills?.teaches || []), ...(lesson.skills?.practices || [])])]
        const affected = (checked.result.affectedSkills || []).filter(id=>targetSkills.includes(id))
        // Message heuristics must not create evidence for a topic absent from this task.
        const observedSkills = checked.passed ? targetSkills : affected.length ? affected : targetSkills
        const skillStates = meaningful || checked.passed ? applyMasteryEvent(p.skillStates || {}, { skills: observedSkills, success: checked.passed, supportLevel: lesson.supportLevel || 'blocks_with_code', hintsUsed: session.hintsUsed, solutionUsed: session.solutionUsed, guided, at: new Date().toISOString(), sequence: practiceSequence }) : p.skillStates || {}
        const extra: Partial<Progress> = { ...recordLearningCheck(p, { lessonId: lesson.id, passed: checked.passed, message: checked.message, errorType: checked.result.errorType, skills: observedSkills, attempt: nextBase.attempts, stars, tutorial, practice: !!p.activePractice, at: Date.now() }), attempts: { ...p.attempts, [lesson.id]: (p.attempts?.[lesson.id] || 0) + 1 }, skillStates, practiceSequence }
        if (!checked.passed && meaningful && nextBase.meaningfulErrors >= 2 && !session.recoveryOffered && !p.activePractice) {
          const decision = decideLessonSupport(lesson,{...p,skillStates},true,lesson.supportLevel)
          const updated = applySupportDecision(lesson,{...p,skillStates},decision)
          extra.scaffoldSkills = updated.scaffoldSkills; extra.supportOverrides = updated.supportOverrides; extra.skillSupport = updated.skillSupport; extra.supportCheckpoint = updated.supportCheckpoint
          track('adaptive_decision', lesson.id, { ...decision, skillId: decision.skillId || '' })
          if (decision.reason === 'restore') track('support_changed', lesson.id, { runStartedAt: session.startedAt, previousSupport: decision.previousSupport, nextSupport: decision.nextSupport, reason: 'restore' })
          const selected=selectNextExercise({lessons,pool:practicePool,completed:p.completed,targetLessonId:lesson.id,correctiveOnly:true,skillStates,practiceSequence,completedPracticeIds:p.completedPracticeIds})
          if (selected?.reason==='corrective' && selected.practiceId && selected.message) {
            const practice = getPracticeLesson(selected.practiceId,decision.nextSupport)!
            extra.recommendedPractice={id:selected.practiceId,lessonId:practice.id,returnLessonId:lesson.id,message:selected.message,reason:'corrective',supportLevel:practice.supportLevel}
            nextBase.recoveryOffered = true
            track('corrective_inserted',lesson.id,{practiceId:selected.practiceId,skillId:decision.skillId || '',supportLevel:practice.supportLevel || '',returnLessonId:lesson.id})
          }
        }
        if (checked.passed && !p.activePractice) {
          extra.completed = [...new Set([...p.completed, lesson.id])]
          extra.bestStars = { ...p.bestStars, ...(stars ? { [lesson.id]: Math.max(stars, p.bestStars?.[lesson.id] || 0) } : {}) }
          extra.introducedConcepts = [...new Set([...(p.introducedConcepts || []), ...(lesson.tutorial || [])])]
          extra.recommendedPractice = undefined
        }
        const code = lesson.extended ? lesson.mode === 'completion' || lesson.mode === 'tokens' ? `${lesson.prefix || ''}${currentAnswer}${lesson.suffix || ''}` : currentAnswer : lesson.mode === 'completion' ? `${lesson.prefix}${currentAnswer}${lesson.suffix}` : renderPython(checked.program)
        const next = { ...nextBase, lastCheck: { passed: checked.passed, message: checked.message, output: checked.result.output, error: checked.result.error, systemError: checked.result.systemError, errorType: checked.result.errorType, affectedSkills: checked.result.affectedSkills, stars, code } }
        persistSession(next, extra)
        setOutcome({ ...checked, stars, code })
        const evidence = { runStartedAt: session.startedAt, supportLevel: lesson.supportLevel || 'blocks_with_code', hintsUsed: session.hintsUsed, solution: session.solutionUsed, independent: !guided && session.hintsUsed === 0 && !session.solutionUsed }
        track('check', lesson.id, { ...evidence, passed: checked.passed, attempt: next.attempts, stars: stars || 0 })
        if (checked.passed && !session.finished) track('lesson_completed', lesson.id, { ...evidence, completionMs: Date.now() - session.startedAt, attempt: next.attempts, stars: stars || 0 })
      } catch { setOutcome({ passed: false, message: 'Не удалось проверить. Прогресс сохранён. Попробуй ещё раз.', result: { output: [], systemError: true }, code: '' }) }
      finally { setChecking(false) }
    }, 80)
  }
  const editSession = (next: Session) => {
    if (outcome && !outcome.passed) {
      setOutcome({ ...outcome, message: 'Решение изменено. Проверь ещё раз.', result: { output: [] }, code: '' })
      persistSession({ ...next, lastCheck: undefined })
    } else persistSession(next)
  }
  const answer = (value: string) => editSession({ ...session, answer: value })
  const changeProgram = (next: Program) => {
    if (editorReady && outcome && !outcome.passed && renderPython(next) !== renderPython(program)) editSession(session)
    setProgram(next)
  }
  const allowed = guide?.target === 'add' ? [guide.block!] : lesson.chapter === 1 ? ['text_print', 'text'] : lesson.allowed || []
  const assistance = guide?.text || (guided ? 'Ты собрал программу. Ниже видно, как она записывается на Python. Нажми «Проверить», чтобы увидеть результат.' : lesson.starterHint)
  const focusSource = (sourceId: string) => {
    if (modal === 'python') {
      pendingSource.current = sourceId
      setModal(null)
    } else editor.current?.focusBlock(sourceId)
  }
  const primaryAction = () => {
    if (outcome?.passed || session.finished) { onContinue(); return }
    if (outcome && progress.recommendedPractice?.reason === 'corrective' && !progress.activePractice) { onContinue(); return }
    verify()
  }
  const primaryLabel = checking ? 'Проверяем…' : outcome?.passed || session.finished ? 'Продолжить' : outcome && progress.recommendedPractice?.reason === 'corrective' && !progress.activePractice ? 'Закрепить на примере' : outcome ? 'Проверить снова' : 'Проверить'
  const pythonPreview = <CodePreview code={renderPython(program)} highlights={selectedLines(program, pythonSource)} sourceIds={lineSources(program)} onLineSelect={focusSource} />
  const resultDetails = outcome && <>{outcome.code && <CodePreview code={outcome.code} />}{outcome.result.output.length > 0 && <div className="output-preview"><span>Программа показала</span><pre>{outcome.result.output.join('\n')}</pre></div>}{lesson.extended?.drawing && <DrawingPreview segments={runCourseProgram(outcome.code, lesson.extended.inputs[0]).segments} />}</>

  return <>
    <article className={`lesson-flow novice-flow support-${lesson.supportLevel || 'blocks_with_code'} ${guided ? 'is-guided' : ''}`} data-lesson-id={lesson.id} aria-label={practiceMessage ? 'Короткая практика' : `Задание ${lessonPosition} из ${lessonTotal}`}>
      <section className="task-intro" aria-labelledby="lesson-title">
        {practiceMessage && <p className="practice-intro" role="status">{practiceMessage}. Это короткое повторение, не откат назад.</p>}
        {session.supportMessage && <p className="support-message" role="status">{session.supportMessage}</p>}
        <div className="exercise-meta"><span>{tutorial ? 'Знакомство · без оценки' : lesson.review ? 'Практика главы' : 'Самостоятельная практика'}</span>{!tutorial && <Stars value={progress.bestStars?.[lesson.id] || 0} />}</div>
        <h1 id="lesson-title" aria-label={lesson.title}>{mobile && <span className="task-icon"><Icon name="document" size={17} /></span>}{mobile ? 'Задание' : lesson.title}</h1><p className="task-copy">{mobile ? mobileGoal(lesson.goal) : lesson.goal}</p>
        <p className="format-explanation">{supportExplanation[lesson.supportLevel || 'blocks_with_code']}</p>
        <details className="task-details"><summary>Подробнее о задании</summary><p className="instruction">{lesson.instruction}</p>{!guided && <p className="next-action">{assistance}</p>}</details>
        <div className="lesson-help"><button disabled={checking} className="text-button help-button" aria-label={mobile ? 'Помощь с заданием' : undefined} onClick={() => setModal('help')}>{mobile ? 'Подробнее' : blocksMode ? 'Как работать с блоками' : 'Как выполнить задание'}</button>{!guided && <button className="text-button hint-button" aria-label={session.hintsUsed ? 'Ещё подсказка' : 'Нужна подсказка?'} onClick={showHint} disabled={checking || session.hintsUsed >= 3}><Icon name="bulb" size={18} />{mobile ? session.hintsUsed ? 'Ещё подсказка' : 'Подсказка' : session.hintsUsed ? 'Ещё подсказка' : 'Нужна подсказка?'}</button>}{tutorFlags.tutor && tutorFlags.explanations && !guided && <button className="text-button" onClick={() => void requestTutor('concept')} disabled={checking || tutorLoading}>Объясни проще</button>}{tutorFlags.tutor && tutorFlags.examples && !guided && <button className="text-button" onClick={() => void requestTutor('example')} disabled={checking || tutorLoading}>Похожий пример</button>}</div>
        {!guided && session.hintsUsed > 0 && <div className="hint-area"><p className="hint-text" role="status"><span>Подсказка {Math.min(session.hintsUsed, 3)}/3</span>{tutorAnswer?.action === 'hint' && tutorAnswer.level === Math.min(session.hintsUsed, 3) ? tutorAnswer.result.response.message : lesson.progressiveHints?.[Math.min(session.hintsUsed - 1, lesson.progressiveHints.length - 1)] || (session.hintsUsed === 1 ? firstHint : lesson.hint)}</p>{session.hintsUsed >= 3 && <button className="text-button" onClick={solution}>Показать готовый вариант{!tutorial ? ' · 1 ★' : ''}</button>}</div>}
        {tutorFlags.tutor && tutorLoading && <p className="ai-tutor-status" role="status">Подбираем объяснение…</p>}
        {tutorFlags.tutor && tutorAnswer && tutorAnswer.action !== 'hint' && tutorAnswer.action !== 'error_explanation' && <div className="ai-tutor-answer" role="status"><strong>{tutorAnswer.action === 'example' ? 'Похожий пример' : 'Объяснение'}</strong><p>{tutorAnswer.result.response.message}</p>{tutorAnswer.result.response.example?.code && <code>{tutorAnswer.result.response.example.code}</code>}{tutorAnswer.result.response.example?.explanation && <p>{tutorAnswer.result.response.example.explanation}</p>}</div>}
      </section>
      <section className={`learning-work ${lesson.id === 1 ? 'first-command' : ''}`} aria-label="Собери решение">
        {guided && <div className="coach" role="status"><span>Шаг {guide ? steps.indexOf(guide) + 1 : steps.length + 1} из {steps.length + 1}</span><p className="desktop-only">{assistance}</p><p className="mobile-only">{mobileGuide(guide)}</p></div>}
        {blocksMode ? <>
          <div className={`block-workspace-grid ${workspaceExpanded ? 'is-expanded' : ''}`}><div className="workspace-section" inert={checking}><div className="workspace-heading"><h2>Программа</h2>{mobile && <button className="icon-button workspace-expand" aria-label={workspaceExpanded ? 'Свернуть редактор' : 'Развернуть редактор'} onClick={() => setWorkspaceExpanded(value => !value)}><Icon name={workspaceExpanded ? 'shrink' : 'expand'} size={19} /></button>}<details className="workspace-menu"><summary aria-label="Действия с программой"><Icon name="more" /></summary><button onClick={() => setModal('clear')}>Очистить программу</button></details></div>
            <Suspense fallback={<div className="blockly-host editor-loading" role="status">Готовим блоки…</div>}><BlocklyEditor ref={editor} lesson={lesson} onChange={changeProgram} onInfo={setInfo} onAction={action} onReady={() => setEditorReady(true)} focusType={guide?.target === 'field' ? guide.block : guide?.block === 'text' ? 'text_print' : undefined} hideTools={guided} /></Suspense>
            <div className="workspace-actions"><button aria-label={editorReady ? 'Добавить блок' : 'Готовим блоки…'} disabled={!editorReady} className={`add-block-button ${guide?.target === 'add' || guide?.target === 'variable' ? 'coach-target' : ''}`} onClick={showBlocks}><Icon name="plus" size={22} /> {editorReady ? 'Добавить блок' : 'Готовим блоки…'}</button></div>
          </div>
          <section className={`live-mirror ${codeExpanded ? 'code-expanded' : 'code-compact'} ${guided && !guide ? 'python-cue' : ''}`} aria-label="Твой Python" data-selected-id={info.selectedId || ''}><div><h2>Python</h2><button className="text-button compact-code-toggle" aria-label={mobile ? 'Показать код' : undefined} aria-expanded={mobile ? modal === 'python' : codeExpanded} onClick={() => { if (mobile) setModal('python'); else setCodeExpanded(value=>!value); track('python_view', lesson.id) }}>{mobile ? 'Посмотреть' : codeExpanded ? 'Свернуть' : 'Показать код'}</button></div><div className="python-inline-preview"><code>{renderPython(program).split('\n')[0] || 'print(...)'}</code></div>{lesson.id === 1 && info.blocks.length > 0 && <p className="mobile-only python-nudge">Твои блоки уже записаны на Python</p>}<div className="code-reveal">{pythonPreview}<p>{lesson.codeNote || 'Те же действия на языке Python. Когда меняются блоки, меняется и код.'}</p>{guide?.id === 'value' && <p className="slot-explanation">Многоточие … — пустое место. Команда ждёт, что ей показать.</p>}</div></section></div>
        </> : <section className="text-exercise" inert={checking}>
          {lesson.mode === 'recognition' && <div className="block-meaning">Напечатать <span>{lesson.skills?.practices.includes('variable') ? 'значение из «имя»' : '«Привет!»'}</span></div>}
          {lesson.mode === 'completion' && <CodePreview code={`${lesson.prefix}${currentAnswer || '___'}${lesson.suffix}`} />}
          {(lesson.mode === 'recognition' || lesson.mode === 'completion') && <fieldset className="code-choices"><legend>{lesson.mode === 'completion' ? 'Выбери пропущенный фрагмент' : 'Выбери строку Python'}</legend>{lesson.choices!.map(choice => <label key={choice} className={currentAnswer === choice ? 'chosen' : ''}><input type="radio" name="code-choice" value={choice} checked={currentAnswer === choice} onChange={() => answer(choice)} /><code>{choice}</code></label>)}</fieldset>}
          {lesson.mode === 'tokens' && <><p>Нажимай части по порядку. Чтобы убрать часть, нажми её ещё раз.</p><div className="token-result" aria-label="Собранная строка">{(session.tokens || []).map((i,pos) => <button key={i} onClick={() => editSession({ ...session, tokens: session.tokens!.filter((_,n) => n !== pos) })}>{lesson.tokens![i]}</button>)}{!session.tokens?.length && <span>Здесь появится твоя строка</span>}</div><div className="token-options">{lesson.tokens!.map((token,i) => <button key={i} disabled={session.tokens?.includes(i)} onClick={() => editSession({ ...session, tokens: [...(session.tokens || []), i] })}>{token}</button>)}</div><CodePreview code={`${lesson.prefix || ''}${currentAnswer || '___'}${lesson.suffix || ''}`} /></>}
          {lesson.mode === 'text' && <><label className="code-label" htmlFor="python-answer">Твой Python</label><MinimalCodeEditor value={currentAnswer} onChange={answer} rows={lesson.extended ? Math.min(8, Math.max(4, lesson.codeAnswer?.split('\n').length || 4)) : lesson.id === 21 ? 5 : 3} /></>}
          {lesson.extended && lesson.extended.inputs[0]?.length > 0 && <p className="lesson-test-inputs">Пример ввода: {lesson.extended.inputs[0].join(' → ')}. Проверим и с другими данными.</p>}
          <button className="text-button" onClick={() => { if (!lesson.extended && !session.referenceUsed) useHint({ referenceUsed: true }); track('theory_open', lesson.id); setModal('example') }}>{lesson.extended ? 'Разбор темы и пример' : 'Вспомнить по блокам'}{!tutorial && !lesson.extended ? ' · подсказка' : ''}</button>
        </section>}
      </section>
    </article>
    {outcome && <section ref={feedback} className={`feedback-panel ${outcome.passed ? 'feedback-success' : 'feedback-error'}`} role="status" aria-live="polite"><div className="feedback-summary"><span className="feedback-mark" aria-hidden="true">{outcome.passed ? '✓' : '!'}</span><div><h2>{outcome.result.systemError ? 'Не удалось проверить' : outcome.passed ? 'Получилось!' : 'Почти получилось'}</h2><p className="feedback-message">{outcome.message}</p></div>{outcome.passed && !tutorial && <Stars value={outcome.stars || 1} />}</div>{!outcome.passed && !outcome.result.systemError && tutorFlags.tutor && tutorFlags.explanations && <button className="text-button ai-error-button" onClick={() => void requestTutor('error_explanation')} disabled={tutorLoading}>{lesson.supportLevel === 'free_code' && session.attempts >= 2 ? 'Что не так с моим кодом?' : 'Почему ошибка?'}</button>}{tutorAnswer?.action === 'error_explanation' && <p className="ai-feedback-answer">{tutorAnswer.result.response.message}</p>}{outcome.passed && tutorial && <p className="intro-complete">Знакомство завершено · без оценки</p>}{(outcome.code || outcome.result.output.length > 0) && (mobile ? <button className="text-button feedback-result-button" onClick={() => setModal('result')}>{outcome.passed ? 'Посмотреть результат' : 'Подробности проверки'}</button> : <details className="feedback-details"><summary>{outcome.passed ? 'Посмотреть результат' : 'Подробности проверки'}</summary>{resultDetails}</details>)}</section>}
    <footer ref={actionRef} className={`primary-action ${outcome ? outcome.passed ? 'action-success' : 'action-retry' : ''}`}><span>{outcome ? outcome.passed ? tutorial ? 'Знакомство завершено' : `${outcome.stars || 1} из 3 звёзд` : 'Исправь решение и проверь ещё раз' : tutorial ? 'Можно пробовать сколько угодно' : `Проверок: ${session.attempts} · подсказок: ${session.hintsUsed}`}</span><button className={guided && !guide ? 'coach-target' : ''} disabled={checking || (guided && !!guide)} onClick={primaryAction}>{primaryLabel}</button></footer>
    {modal === 'blocks' && <Modal title={guide?.target === 'variable' ? 'Создать переменную' : guide?.target === 'add' ? `Выбери «${blockOptions.find(b => b.type === guide.block)?.label}»` : 'Добавить блок'} onClose={() => setModal(null)}><Picker allowed={allowed} fresh={guided ? newBlocks(lesson) : []} canCreateVariable={lesson.allowed?.includes('variables_set') || guide?.target === 'variable'} variableOnly={guide?.target === 'variable'} onVariable={() => setModal('variable')} onAdd={type => { editor.current?.addBlock(type); track('block_added', lesson.id, { type, first: info.blocks.length === 0 }); setModal(null) }} /><p className="sheet-note">Доступны только элементы, которые нужны на этом шаге.</p></Modal>}
    {modal === 'variable' && <Modal title="Подпишем коробку" onClose={() => setModal(null)}><p>Название поможет программе найти сохранённое значение.</p><VariableForm onCreate={name => { action('create_variable'); editor.current?.createVariable(name); setModal(null) }} /></Modal>}
    {modal === 'clear' && <Modal title="Очистить программу?" onClose={() => setModal(null)}><p>Блоки можно вернуть кнопкой «Отменить изменение». Попытка проверки за очистку не расходуется.</p><button className="sheet-primary" onClick={() => { editor.current?.clear(); setModal(null) }}>Очистить</button></Modal>}
    {modal === 'help' && <Modal title={blocksMode ? 'Как собирать программу' : 'Как выполнить задание'} onClose={() => setModal(null)}><p>{lesson.instruction}</p>{guided && <p>{assistance}</p>}<p>{supportExplanation[lesson.supportLevel || 'free_code']}</p>{blocksMode ? <ol className="ui-help"><li>«Добавить блок» открывает команды и значения.</li><li>Сначала добавь команду. Например, «Напечатать».</li><li>В её пустое место добавь значение: текст или число.</li><li>Нажми белое поле, чтобы изменить значение. Новая команда соединится снизу; внутри условия или цикла — займёт свободное место.</li><li>Выбери внешний блок, чтобы продолжить после него. Блоки можно перетаскивать, отменять изменения и удалять.</li></ol> : <p>{lesson.mode === 'tokens' ? 'Нажатие добавляет часть справа. Нажми часть в собранной строке, чтобы убрать её. Ниже видно всю программу.' : lesson.mode === 'text' ? 'Введи команды по одной на строке. Вложенные действия начинаются с четырёх пробелов. Проверка покажет, что исправить.' : 'Нажми один вариант, затем «Проверить». Можно изменить выбор до проверки.'}</p>}<p>Это помощь с интерфейсом. Она не уменьшает звёзды.</p></Modal>}
    {modal === 'python' && <Modal title="Твой Python" onClose={() => setModal(null)}>{pythonPreview}<p>Те же действия, что в блоках. Нажми строку, чтобы найти её блок.</p>{guide?.id === 'value' && <p>Многоточие … — место для текста или числа.</p>}</Modal>}
    {modal === 'result' && outcome && <Modal title={outcome.passed ? 'Результат программы' : 'Подробности проверки'} onClose={() => setModal(null)}>{resultDetails}</Modal>}
    {modal === 'example' && <Modal title={lesson.extended ? 'Разбор темы' : 'Вспомним связь с блоками'} onClose={() => setModal(null)}><ReferenceExample lesson={lesson} /></Modal>}
  </>
}
function ReferenceExample({lesson}:{lesson:Lesson}) {
  if (lesson.extended) {
    const material = courseMaterials[lesson.chapter!]
    return <><p>{material.explanation}</p><CodePreview code={material.code} /><p>{material.plan}</p></>
  }
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
  return <form className="variable-form" onSubmit={e => { e.preventDefault(); if (!validName(name.trim())) { setError('Начни с буквы. Используй буквы, цифры и подчёркивание без пробелов.'); return } onCreate(name.trim()) }}><label htmlFor="variable-name">Название переменной</label><div><input id="variable-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Например, имя" maxLength={40} autoComplete="off" /><button type="submit">Создать</button></div><p role="status">{error}</p></form>
}
