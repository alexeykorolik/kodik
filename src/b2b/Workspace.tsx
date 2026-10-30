import { useEffect,useRef,useState, type CSSProperties } from "react";
import { MinimalCodeEditor } from "../MinimalCodeEditor";
import { api, statusNames, type Row, type State } from "./api";
import { Badge, Glyph } from "./App";
import { useStudentDraft } from "./useStudentDraft";
import { useSubmission } from "./useSubmission";
import { learningRules } from './learningRules';
import { BlockEditor } from "./BlockEditor";
import { useSolvingModes, type SolvingModes } from "./useSolvingModes";
import { MODE_LABEL, type Mode } from "../adaptive/modePolicy";
import {HelpButton} from './PilotPanels';
import { explainDifference, learnerStatus } from "./feedback";
import { PlaybackBar, SceneView, WorldPreview, usePlayback } from "./SceneView";
import { Icon } from "./Icon";
function useWorkspaceController({
  task,
  state,
  refresh,
  onBack,
  nextTask,
  onNext,
  backLabel='← К моим курсам',readOnly:closedLesson=false,lessonContext,onLessonOverview,
}: {
  task: Row;
  state: State;
  refresh: () => Promise<void>;
  onBack: () => void;
  nextTask?:Row;
  onNext?:()=>void;
  backLabel?:string;readOnly?:boolean;lessonContext?:string;onLessonOverview?:()=>void;
}) {
  // An archived group turns the task into a view: the server refuses new runs and checks anyway.
  const archived = !!task.group_archived, readOnly = closedLesson || archived;
  const viewNote = archived ? "Группа в архиве: можно смотреть условие, свой код и результаты. Новые запуски и проверки недоступны, черновик сохранён." : closedLesson ? "Занятие завершено. Работа доступна для просмотра." : "";
  const draft = state.drafts.find((d) => d.assignment_id === task.assignment_id),
    attempts = state.attempts.filter((a) => a.assignment_id === task.assignment_id);
  const studentDraft = useStudentDraft(
    state.user as { id: string; org_id: string },
    task,
    draft,
  );
  const { code, persist, saved, revision, lastSaved } = studentDraft;
  const [inputs, setInputs] = useState(""),
    [result, setResult] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("task"),
    [pane, setPane] = useState(32),
    [fontSize, setFontSize] = useState(16);
  const modes = useSolvingModes(task, state, refresh);
  const submission = useSubmission(
    state.user as { id: string; org_id: string },
    task.id,
    async (response) => {
      setResult(response);
      await refresh();
    },
    task.assignment_id,
  );
  async function run(submit: boolean) {
    if(readOnly){setError(viewNote);return}
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const blocks = modes.requestBody();
      const stored = blocks ? await modes.blocks.persist() : await persist(code, revision.current);
      if (!stored)
        throw new Error(
          "Сначала синхронизируйте черновик или разрешите конфликт вкладок.",
        );
      if (submit) {
        await submission.submit(blocks ?? { mode: "python", code });
        return;
      }
      const response = await api(`/tasks/${task.id}/run`, {
        ...(blocks ?? { mode: "python", code }),
        inputs: inputs === "" ? [] : inputs.split("\n"),
        assignment_id:task.assignment_id,
      }, "POST", undefined, { owner: state.user as { id: string; org_id: string } });
      // The mirror must match what actually ran; a mismatch means an outdated page.
      if (blocks && response.python !== undefined && modes.mirror.ok && response.python !== modes.mirror.python)
        setError("Код на экране отличается от проверенного сервером. Обновите страницу — работа сохранена.");
      setResult(response);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return {modes:modes as SolvingModes|undefined,task,attempts,studentDraft,code,persist,saved,revision,refresh,onBack,nextTask,onNext,backLabel,readOnly,viewNote,lessonContext,onLessonOverview,inputs,setInputs,result,busy,error,tab,setTab,pane,setPane,fontSize,setFontSize,submission,run,previewMode:false,checkLabel:'Проверить решение',nextLabel:'Следующее задание →',referenceAction:undefined as undefined|(()=>void)};
}
export type WorkspaceModel=Omit<ReturnType<typeof useWorkspaceController>,'studentDraft'>&{studentDraft:Pick<ReturnType<typeof useStudentDraft>,'change'|'error'|'conflict'|'resolve'>};
export function Workspace(props:Parameters<typeof useWorkspaceController>[0]){return <WorkspaceView model={useWorkspaceController(props)}/>;}
export function WorkspaceView({model}:{model:WorkspaceModel}){
  const {modes,task,attempts,studentDraft,code,persist,saved,revision,refresh,onBack,nextTask,onNext,backLabel,readOnly,viewNote,lessonContext,onLessonOverview,inputs,setInputs,result,busy,error,tab,setTab,pane,setPane,fontSize,setFontSize,submission,run,previewMode,checkLabel,nextLabel,referenceAction}=model;
  const [inputsExpanded,setInputsExpanded]=useState(false),[hintsShown,setHintsShown]=useState(0),consoleRef=useRef<HTMLDivElement>(null),resultRef=useRef<HTMLDivElement>(null);
  // Phones show one part of the screen at a time (styles.css, data-view); wider screens show all three.
  const [view,setView]=useState<'task'|'code'|'result'>('task');
  // A run's picture replays on its own timeline; every new run starts from a clean scene.
  const playback=usePlayback(result?.scene?.duration??0,result);
  const shownOutput:string[]|undefined=result?.output&&result.output_times&&playback.state!=='done'?result.output.filter((_:string,i:number)=>result.output_times[i]<=playback.t):result?.output;
  // After a run or a check the result comes into view next to the buttons, without jumping the page.
  useEffect(()=>{if(result){setInputsExpanded(false);setView('result');if(consoleRef.current)consoleRef.current.scrollTop=0;resultRef.current?.scrollIntoView?.({block:'nearest'})}},[result]);
  // On-screen keyboard (phones, tablets): keep the field being typed in visible above it.
  useEffect(()=>{const vv=window.visualViewport;if(!vv)return;const keep=()=>{const el=document.activeElement as HTMLElement|null;if(el&&el!==document.body&&(el.closest('.coding-panel')||el.closest('.blocklyWidgetDiv')))el.scrollIntoView?.({block:'center'})};vv.addEventListener('resize',keep);return()=>vv.removeEventListener('resize',keep)},[]);
  const hints:string[]=(task.hints||[]).filter(Boolean),usesInput=(task.examples||[]).some((e:Row)=>e.inputs?.length>0)||/input/.test(`${task.instruction||''} ${task.theory||''} ${code} ${modes?.mirror.python||''}`)||inputs!=='';
  // Two or more unsuccessful checks in a row: the next hint is offered without the child asking.
  const streak=(()=>{let n=0;for(const a of attempts){if(a.status==='passed')break;if(['failed','runtime_error'].includes(a.status))n++}return n})();
  const passedNow=result?.status==='passed',passedBefore=!previewMode&&attempts.some(a=>a.status==='passed'),canGoOn=(passedNow||passedBefore)&&!!onNext&&!previewMode;
  const failedCase=result?.cases?.find((c:Row)=>!c.passed&&!c.hidden);
  const verdict=!result?'':result.status==='passed'?'✓ Всё верно!':result.status==='pending_review'?'Отправлено учителю':result.error||result.status==='runtime_error'?'В коде ошибка — смотри ниже':result.status==='failed'?(failedCase?'Почти! Смотри, что отличается':'Пока не получилось'):'Программа выполнена';
  const resultTone=result?(result.status||(result.error?'runtime_error':'ran')):'';
  const blocksPython=modes&&modes.mode==='python'&&modes.mirror.ok?modes.mirror.python.trim():'';
  const emptyPython=!code.trim()||code.trim()===(task.starter||'').trim();
  return (
    <>
      <div className="workspace-head">
      <div className="workspace-heading">
        <button
          className="link"
          onClick={async () => {
            await persist(code, revision.current);
            await refresh().catch(() => {});
            onBack();
          }}
        >
          {backLabel}
        </button>
        {previewMode&&<span className="muted">{task.group_title}</span>}
        {(previewMode||passedBefore)&&<Badge status={previewMode?result?.status:'passed'}>
          {previewMode?(result?.status?statusNames[result.status]||'Пробная проверка':result?.error?'Ошибка выполнения':'Пробное прохождение'):<><Icon name="check" size="sm" />Выполнено</>}
        </Badge>}
        {previewMode&&onNext&&<button className="primary small" title={nextTask?.title} onClick={async()=>{if(await persist(code,revision.current))onNext()}}>{nextLabel}</button>}
        {previewMode&&referenceAction&&<button className="small" onClick={referenceAction}>Вставить эталон в предпросмотр</button>}
      </div>
      <div className="workspace-title">
        <span className="overline">{previewMode?"ПРЕДПРОСМОТР УЧЕНИКА":lessonContext?lessonContext.toUpperCase():"ПРАКТИКА"}</span>
        <h1>{task.title}</h1>
        {lessonContext&&<button className="steps-link" onClick={onLessonOverview}><Icon name="list" size="sm" />Все шаги урока</button>}
        {!previewMode&&<HelpButton assignmentId={task.assignment_id}/>}
        {readOnly&&viewNote&&<p className="notice view-only-note" role="status" data-testid="view-only-note">{viewNote}</p>}
        {task.due_at&&<p className="workspace-deadline">{Date.parse(task.due_at)<Date.now()?'Срок прошёл:':'Срок:'} {new Date(task.due_at).toLocaleDateString('ru')}</p>}
      </div>
      </div>
      {studentDraft.error && (
        <p className="error" role="alert">
          {studentDraft.error}
        </p>
      )}
      {studentDraft.conflict && (
        <section className="conflict-panel">
          <h2>В другой вкладке сохранён другой код</h2>
          <div className="form-columns">
            <pre>{code}</pre>
            <pre>{studentDraft.conflict.code}</pre>
          </div>
          <button onClick={() => void studentDraft.resolve("server")}>
            Продолжить с серверным кодом
          </button>
          <button onClick={() => void studentDraft.resolve("mine")}>
            Сохранить мой вариант с историей
          </button>
        </section>
      )}
      <div className="workspace-views" aria-label="Часть экрана">
        {([["task","Условие"],["code","Код"],["result","Результат"]] as const).map(([key,name])=>(
          <button key={key} type="button" className={view===key?"active":""} aria-pressed={view===key} onClick={()=>setView(key)}>
            {name}
            {key==="result"&&result&&<span className={`view-dot ${resultTone}`} role="img" aria-label={verdict}/>}
          </button>
        ))}
      </div>
      <div
        className="workspace-grid"
        data-view={view}
        style={{
          gridTemplateColumns: `minmax(260px,${pane}%) 8px minmax(0,1fr)`,
        }}
      >
        <section className="material-panel">
          <div className="tabs">
            {[
              ["task", "Задание"],
              ["theory", "Теория"],
              ["hints", "Подсказки"],
              ["history", attempts.length?`Попытки · ${attempts.length}`:"Попытки"],
            ].map(([key, name]) => (
              <button
                className={tab === key ? "active" : ""}
                key={key}
                onClick={() => setTab(key)}
              >
                {name}
              </button>
            ))}
          </div>
          <article className="task-material">
            {tab === "history" ? (
              <>
                <h2>Мои попытки</h2>
                {attempts.length ? (
                  attempts.map((a, i) => (
                    <div className={`attempt-card ${a.status === "passed" ? "passed" : ""}`} key={a.id}>
                      <b>Попытка {attempts.length - i}{a.status === "passed" ? " · получилось!" : ""}</b>
                      <span className="attempt-status">{learnerStatus[a.status] || a.status}</span>
                      <p>{a.feedback || a.result?.message}</p>
                      <small>
                        {new Date(a.created_at).toLocaleString("ru")}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>Пока нет отправленных решений.</p>
                )}
              </>
            ) : tab === "task" ? (
              <>
                <h2 className="visually-hidden">Твоя задача</h2>
                {task.goal && <p className="learning-goal">{task.goal}</p>}
                <p className="preserve">{task.instruction}</p>
                {task.learning_rules?.length>0&&<section><h3>В решении нужно применить</h3><ul>{learningRules.filter(rule=>task.learning_rules.includes(rule.id)).map(rule=><li key={rule.id}>{rule.label}</li>)}</ul></section>}
                {task.examples?.length > 0 && (
                  <div className="public-examples">
                    <h3>Должно получиться</h3>
                    {task.examples.map((example: Row, i: number) => (
                      <div key={i}>
                        {example.inputs.length > 0 && <><small>Если ввести</small>
                        <pre>{example.inputs.join("\n")}</pre></>}
                        {example.world && <><small>Поле Робота</small><WorldPreview text={example.world} /></>}
                        {(!example.checks || example.checks.includes("output")) && <><small>Программа напечатает</small>
                        <pre className="screen">{example.expected || "(ничего)"}</pre></>}
                        {example.checks?.some((c: string) => c !== "output") && <p className="scene-checks-note">Проверяется: {example.checks.map((c: string) => ({ output: "текст вывода", drawing: "рисунок черепахи", robot: "поле Робота (закрашенные клетки и финиш)", plot: "график" } as Record<string, string>)[c]).join(", ")}.</p>}
                      </div>
                    ))}
                  </div>
                )}
                {task.description && (
                  <p className="muted preserve">{task.description}</p>
                )}
                {task.check_mode === "manual" && (
                  <p className="info-box">
                    Это решение проверит преподаватель. {task.manual_criteria}
                  </p>
                )}
              </>
            ) : tab === "theory" ? (
              <>
                <h2>Шпаргалка</h2>
                <p className="preserve">
                  {task.theory ||
                    "Для этого задания шпаргалки нет. Посмотри пример в уроке или открой подсказку."}
                </p>
              </>
            ) : (
              <>
                <h2>Небольшая помощь</h2>
                <p className="muted">
                  Открывай подсказки по очереди, если застрял.
                </p>
                {hints.map((h: string, i: number) => (
                  <details key={`${i}:${i < hintsShown}`} open={i < hintsShown}>
                    <summary>Подсказка {i + 1}</summary>
                    <p className="preserve">{h}</p>
                  </details>
                ))}
                {!hints.length && (
                  <p>Подсказок пока нет. Можно позвать учителя кнопкой «Нужна помощь».</p>
                )}
              </>
            )}
          </article>
          <button type="button" className="primary to-code" onClick={()=>setView("code")}>К коду<Glyph name="arrow" /></button>
        </section>
        <div
          className="workspace-divider"
          role="separator"
          tabIndex={0}
          aria-label="Ширина условия"
          aria-orientation="vertical"
          aria-valuemin={25}
          aria-valuemax={50}
          aria-valuenow={pane}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.preventDefault();
              setPane((p) =>
                Math.min(
                  50,
                  Math.max(25, p + (e.key === "ArrowLeft" ? -2 : 2)),
                ),
              );
            }
          }}
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={(e) => {
            if (e.buttons === 1) {
              const rect =
                e.currentTarget.parentElement!.getBoundingClientRect();
              setPane(
                Math.max(
                  25,
                  Math.min(
                    50,
                    Math.round(((e.clientX - rect.left) / rect.width) * 100),
                  ),
                ),
              );
            }
          }}
        />
        <section
          className={`coding-panel mode-${modes?.enabled ? modes.mode : "python"}`}
          style={{ "--code-size": `${fontSize}px` } as CSSProperties}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (!busy && !submission.busy && (e.shiftKey || !submission.waiting || submission.phase === "unconfirmed")) void run(!e.shiftKey);
            }
          }}
        >
          {modes?.enabled && <ModeBar modes={modes} readOnly={readOnly} />}
          <div className="editor-toolbar">
            <span>
              <Glyph name="code" />
              {modes && modes.mode !== "python" ? MODE_LABEL[modes.mode] : "main.py"}
            </span>
            <span>
              <button
                aria-label="Уменьшить шрифт кода"
                onClick={() => setFontSize((s) => Math.max(14, s - 1))}
              >
                А−
              </button>
              <span className="visually-hidden">Размер текста {fontSize}</span>
              <button
                aria-label="Увеличить шрифт кода"
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              >
                А+
              </button>
            </span>
          </div>
          {modes && modes.mode !== "python" ? (
            <div className={`block-area ${modes.mode}`}>
              <BlockEditor
                value={modes.blocks.workspace}
                palette={modes.palette}
                readOnly={readOnly}
                onChange={(w) => modes.blocks.change(w)}
                onSelect={(_, statement) => modes.setSelected(statement)}
              />
              {modes.mode === "mixed" && <PythonMirror modes={modes} />}
            </div>
          ) : (
          <fieldset disabled={readOnly || busy || submission.busy || submission.phase === "paused"}>
            {blocksPython && emptyPython && !readOnly && <div className="from-blocks" role="status"><span>Твои блоки сохранены в режиме «{MODE_LABEL.blocks}». Здесь — отдельный черновик на Python.</span><button type="button" className="small" onClick={() => studentDraft.change(blocksPython + "\n")}>Перенести программу из блоков</button></div>}
            <MinimalCodeEditor
              value={code}
              onChange={(v) => {
                studentDraft.change(v);
              }}
              rows={16}
              label="Код на Python"
            />
          </fieldset>
          )}
          {modes?.blocks.error && modes.mode !== "python" && <p className="error" role="alert">{modes.blocks.error}</p>}
          {modes?.blocks.conflict && modes.mode !== "python" && (
            <section className="conflict-panel">
              <h2>В другой вкладке сохранены другие блоки</h2>
              <p>Оба варианта сохранены в истории.</p>
              <button onClick={() => void modes.blocks.resolve("server")}>Открыть блоки из другой вкладки</button>
              <button onClick={() => void modes.blocks.resolve("mine")}>Оставить мои блоки</button>
            </section>
          )}
          <div className="editor-bottom">
            <small
              className={saved === "Не удалось сохранить" ? "error" : "muted"}
            >
              {modes && modes.mode !== "python" ? modes.blocks.saved : saved}
            </small>
            {verdict && <span className={`check-summary ${resultTone}`}>{verdict}</span>}
            <div className="actions">
              <button
                disabled={readOnly || busy || submission.busy || submission.phase === "paused"}
                onClick={() => run(false)}
              >
                <Icon name="play" size="sm" />Запустить
              </button>
              {canGoOn && (
                <button className="primary next-button" title={nextTask?.title} onClick={async () => { if (await persist(code, revision.current)) onNext!(); }}>
                  {nextLabel}
                </button>
              )}
              <button
                className={canGoOn ? "" : "primary"}
                disabled={readOnly || busy || submission.busy || submission.phase === "held" || submission.phase === "reconnecting" || submission.phase === "paused"}
                onClick={() => run(true)}
              >
                {submission.busy || submission.phase === "held" || submission.phase === "reconnecting" || submission.phase === "paused"
                  ? submission.label
                  : submission.phase === "unconfirmed"
                    ? "Отправить то же решение ещё раз"
                  : busy
                    ? "Запускаем…"
                    : task.check_mode === "manual"
                      ? "Отправить преподавателю"
                      : checkLabel}
                <Glyph name="arrow" />
              </button>
            </div>
          </div>
          <div className="console" ref={consoleRef}>
            <div className="console-title">
              <b>Результат</b>
              <span>Результат запуска и проверки</span>
            </div>
            {usesInput && <details className="stdin-details" open={inputsExpanded} onToggle={e=>setInputsExpanded(e.currentTarget.open)}>
              <summary>Ввод для пробного запуска</summary>
              <label className="stdin">
                Ввод для пробного запуска
                <textarea
                  value={inputs}
                  onChange={(e) => setInputs(e.target.value)}
                  rows={2}
                  placeholder="Каждая строка — это один ответ для input()"
                />
              </label>
            </details>}
            {(submission.busy || submission.waiting) && (
              <div className="submission-state" role="status" data-testid="submission-state" data-phase={submission.phase}>
                {submission.label}
                {(submission.phase === "reconnecting" || submission.phase === "held") && (
                  <button onClick={() => submission.retry()}>
                    Узнать результат сейчас
                  </button>
                )}
                {submission.canCancel && (
                  <button onClick={() => void submission.cancel()}>
                    Отменить ожидание
                  </button>
                )}
              </div>
            )}
            {submission.notice && (
              <p role={submission.notice.kind === "refused" ? "alert" : "status"} className={submission.notice.kind === "refused" ? "error submission-refused" : "notice submission-note"} data-testid="submission-notice" data-kind={submission.notice.kind}>
                {submission.notice.text}
                {submission.notice.kind === "held" && submission.sentAt && <> Отправлено в {new Date(submission.sentAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}. В редакторе сейчас черновик: его можно менять, а отправить — после результата.</>}
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {result ? (
              <div
                role="status"
                ref={resultRef}
                className={`result-box ${resultTone}`}
              >
                {result.status === "passed" && <span className="celebrate"><Icon name="check-circle" size="lg" /></span>}<b>{result.message || result.error || "Программа выполнена"}</b>
                {failedCase && failedCase.text_checked !== false && !failedCase.scene_message && <p className="difference">{explainDifference(failedCase.expected, failedCase.output)}</p>}
                {!previewMode && streak >= 2 && result.status !== "passed" && hints.length > hintsShown && <button type="button" className="small hint-offer" onClick={() => { setHintsShown(hintsShown + 1); setTab("hints"); }}>Открыть подсказку {hintsShown + 1}</button>}
                {result.scene && <><PlaybackBar playback={playback} /><SceneView scene={result.scene} t={playback.t} /></>}
                {shownOutput && (shownOutput.length > 0 || !result.scene) && (
                  <pre>{shownOutput.join("\n") || "(нет вывода)"}</pre>
                )}
                {result.cases?.map((c: Row) => (
                  <div className="case-result" key={c.index}>
                    <span>
                      <Icon name={c.passed ? "check" : "x"} size="sm" className={c.passed ? "ok" : "bad"} /> Проверка {c.index}
                      {c.hidden ? " · скрытая" : ""}
                    </span>
                    {!c.hidden && !c.passed && (
                      <>
                        {c.scene_message && <p className="difference">{c.scene_message}</p>}
                        {c.expected_scene && <SceneView scene={c.expected_scene} title="Должно получиться" />}
                        {c.text_checked !== false && <>
                        <small>Ожидается</small>
                        <pre>{c.expected || "(пусто)"}</pre>
                        <small>Твоя программа напечатала</small>
                        <pre>{c.output || "(ничего)"}</pre>
                        </>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="console-empty">
                Нажми «Запустить» — здесь появится то, что напечатает программа.
              </p>
            )}
          </div>
          <details className="runtime-info">
            <summary>Возможности учебного Python</summary>
            <p>
              print, input, int, str, float, len, range, abs, round, pow, min,
              max, sum, переменные, списки, кортежи, срезы, условия, циклы и
              функции. Отступ — 4 пробела. Библиотеки: turtle, pyrob.api, math,
              random, time, numpy, matplotlib.pyplot. Файлы, сеть и классы
              недоступны.
            </p>
            <a href="#python-help" target="_blank" rel="noopener">Справка по библиотекам с примерами</a>
          </details>
        </section>
      </div>
      {attempts.length > 0 && (
        <section className="panel attempt-history">
          <div className="panel-heading">
            <h2>Мои попытки</h2>
          </div>
          {attempts.slice(0, 8).map((a) => (
            <div className="member inset" key={a.id}>
              <span>{new Date(a.created_at).toLocaleString("ru")}</span>
              <span>{a.feedback || statusNames[a.status]}</span>
              <Badge status={a.status} />
            </div>
          ))}
        </section>
      )}
    </>
  );
}

/** Mode switcher: only allowed modes; says who opens the others and that work is kept. */
function ModeBar({ modes, readOnly = false }: { modes: SolvingModes; readOnly?: boolean }) {
  const others = (["blocks", "mixed", "python"] as Mode[]).filter((m) => modes.modes?.supported.includes(m) && !modes.available.includes(m));
  return (
    <div className="mode-bar">
      <div className="mode-switch" role="radiogroup" aria-label="Способ решения" onKeyDown={(e) => {
        // Arrow keys move between the modes the learner may open; Tab leaves the group (one stop).
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        const open = modes.available.filter((m) => m === modes.mode || (!readOnly && modes.canSwitch(m)));
        const at = open.indexOf(modes.mode), next = open[(at + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1) + open.length) % open.length];
        if (next && next !== modes.mode) { void modes.switchTo(next); requestAnimationFrame(() => (e.currentTarget.querySelector(`.mode-${next}`) as HTMLElement | null)?.focus()); }
      }}>
        {modes.available.map((m) => (
          <button key={m} role="radio" tabIndex={modes.mode === m ? 0 : -1} aria-checked={modes.mode === m} className={`mode-${m}`} disabled={modes.mode !== m && (readOnly || !modes.canSwitch(m))} onClick={() => void modes.switchTo(m)}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <small className="muted">
        {modes.modes?.switching === "free" ? "Переключайся сам: работа в каждом режиме сохраняется." : modes.modes?.switching === "teacher" ? "Другие режимы открывает учитель." : "Режим выбрал учитель."}
        {others.length > 0 && ` Пока закрыто: ${others.map((m) => MODE_LABEL[m]).join(", ")}.`}
      </small>
      {modes.offered && !readOnly && (
        <div className="mode-offer" role="status">
          <span>Учитель предлагает перейти в режим «{MODE_LABEL[modes.offered]}».</span>
          {modes.recommendation&&<span>{modes.recommendation.basis.reason}</span>}
          <button className="primary small" onClick={() => void modes.switchTo(modes.offered!)}>Перейти</button>
          <button className="small" onClick={() => void modes.switchTo(modes.offered!, true)}>Позже</button>
        </div>
      )}
      {modes.notice && <p className="mode-notice" role="status">{modes.notice}</p>}
    </div>
  );
}

/** Read-only Python built from the learner's own blocks, with the selected block's lines highlighted. */
function PythonMirror({ modes }: { modes: SolvingModes }) {
  const range = modes.selected ? modes.mirror.lines[modes.selected] : undefined;
  const lines = modes.mirror.python.trimEnd().split("\n");
  return (
    <section className="python-mirror" aria-label="Python из твоих блоков" aria-live="polite">
      <h3>Python из твоих блоков</h3>
      {modes.mirror.ok ? (
        <pre className="mirror-code">{lines.map((line, i) => (
          <div key={i} className={range && i + 1 >= range[0] && i + 1 <= range[1] ? "highlight" : ""}><span className="ln">{i + 1}</span>{line}</div>
        ))}</pre>
      ) : (
        <ul className="mirror-errors">{modes.mirror.errors.slice(0, 4).map((e, i) => <li key={i}>{e.message}</li>)}</ul>
      )}
      <small className="muted">Этот код собран из твоих блоков. Выбери блок — подсветится его строка.</small>
    </section>
  );
}
