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
function useWorkspaceController({
  task,
  state,
  refresh,
  onBack,
  nextTask,
  onNext,
  backLabel='← К моим курсам',readOnly=false,lessonContext,onLessonOverview,
}: {
  task: Row;
  state: State;
  refresh: () => Promise<void>;
  onBack: () => void;
  nextTask?:Row;
  onNext?:()=>void;
  backLabel?:string;readOnly?:boolean;lessonContext?:string;onLessonOverview?:()=>void;
}) {
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
    [pane, setPane] = useState(35),
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
    if(readOnly){setError('Занятие завершено. Работа доступна для просмотра.');return}
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
      });
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
  return {modes:modes as SolvingModes|undefined,task,attempts,studentDraft,code,persist,saved,revision,refresh,onBack,nextTask,onNext,backLabel,readOnly,lessonContext,onLessonOverview,inputs,setInputs,result,busy,error,tab,setTab,pane,setPane,fontSize,setFontSize,submission,run,previewMode:false,checkLabel:'Проверить решение',nextLabel:'Следующее задание →',referenceAction:undefined as undefined|(()=>void)};
}
export type WorkspaceModel=Omit<ReturnType<typeof useWorkspaceController>,'studentDraft'>&{studentDraft:Pick<ReturnType<typeof useStudentDraft>,'change'|'error'|'conflict'|'resolve'>};
export function Workspace(props:Parameters<typeof useWorkspaceController>[0]){return <WorkspaceView model={useWorkspaceController(props)}/>;}
export function WorkspaceView({model}:{model:WorkspaceModel}){
  const {modes,task,attempts,studentDraft,code,persist,saved,revision,refresh,onBack,nextTask,onNext,backLabel,readOnly,lessonContext,onLessonOverview,inputs,setInputs,result,busy,error,tab,setTab,pane,setPane,fontSize,setFontSize,submission,run,previewMode,checkLabel,nextLabel,referenceAction}=model;
  const [inputsExpanded,setInputsExpanded]=useState(false),consoleRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(result){setInputsExpanded(false);if(consoleRef.current)consoleRef.current.scrollTop=0}},[result]);
  return (
    <>
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
        <span className="muted">{task.group_title} · <span>Попыток: {attempts.length}</span></span>
        <Badge status={previewMode?result?.status:undefined}>
          {previewMode?(result?.status?statusNames[result.status]||'Пробная проверка':result?.error?'Ошибка выполнения':'Пробное прохождение'):attempts.some((a) => a.status === "passed")
            ? "✓ Выполнено"
            : "Учебная практика"}
        </Badge>
        {(previewMode||result?.status==='passed'||attempts.some(a=>a.status==='passed'))&&onNext&&<button className="primary small" title={nextTask?.title} onClick={async()=>{if(await persist(code,revision.current))onNext()}}>{nextLabel}</button>}
        {previewMode&&referenceAction&&<button className="small" onClick={referenceAction}>Вставить эталон в предпросмотр</button>}
      </div>
      <div className="workspace-title">
        <span className="overline">{previewMode?"ПРЕДПРОСМОТР УЧЕНИКА":"ПРАКТИКА PYTHON"}</span>
        <h1>{task.title}</h1>
        {lessonContext&&<button className="link" onClick={onLessonOverview}>{lessonContext} · шаги урока</button>}
        {task.due_at&&<p className="workspace-deadline">{Date.parse(task.due_at)<Date.now()?'Срок прошёл:':'Срок:'} {new Date(task.due_at).toLocaleDateString('ru')}</p>}
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
      <div
        className="workspace-grid"
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
              ["history", "Попытки"],
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
                  attempts.map((a) => (
                    <div className="result-box" key={a.id}>
                      <Badge status={a.status} />
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
                <Badge>
                  {task.difficulty === "easy"
                    ? "Начальный уровень"
                    : task.difficulty === "medium"
                      ? "Средний уровень"
                      : "Продвинутый уровень"}
                </Badge>
                <h2>Твоя задача</h2>
                {task.goal && <p className="learning-goal">{task.goal}</p>}
                <p className="preserve">{task.instruction}</p>
                {task.learning_rules?.length>0&&<section><h3>В решении нужно применить</h3><ul>{learningRules.filter(rule=>task.learning_rules.includes(rule.id)).map(rule=><li key={rule.id}>{rule.label}</li>)}</ul></section>}
                {task.examples?.length > 0 && (
                  <div className="public-examples">
                    <h3>Примеры</h3>
                    {task.examples.map((example: Row, i: number) => (
                      <div key={i}>
                        <small>Ввод</small>
                        <pre>{example.inputs.join("\n") || "Не требуется"}</pre>
                        <small>Вывод</small>
                        <pre>{example.expected || "(пусто)"}</pre>
                      </div>
                    ))}
                  </div>
                )}
                {task.description && (
                  <p className="muted preserve">{task.description}</p>
                )}
                <div className="practice-tip">
                  <span>✦</span>
                  <p>
                    Пробуй, запускай, исправляй.
                    <br />
                    Так рождается работающий код.
                  </p>
                </div>
                {task.check_mode === "manual" && (
                  <p className="info-box">
                    Это решение проверит преподаватель. {task.manual_criteria}
                  </p>
                )}
              </>
            ) : tab === "theory" ? (
              <>
                <h2>Разберёмся в теме</h2>
                <p className="preserve">
                  {task.theory ||
                    "Дополнительной теории для этого задания нет."}
                </p>
              </>
            ) : (
              <>
                <h2>Небольшая помощь</h2>
                <p className="muted">
                  Открывай подсказки по очереди, если застрял.
                </p>
                {task.hints.filter(Boolean).map((h: string, i: number) => (
                  <details key={i}>
                    <summary>Подсказка {i + 1}</summary>
                    <p className="preserve">{h}</p>
                  </details>
                ))}
                {!task.hints.filter(Boolean).length && (
                  <p>Преподаватель пока не добавил подсказки.</p>
                )}
              </>
            )}
          </article>
          <div className="material-footer">↗ Каждая попытка — это опыт</div>
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
          className="coding-panel"
          style={{ "--code-size": `${fontSize}px` } as CSSProperties}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (!busy && !submission.busy) void run(!e.shiftKey);
            }
          }}
        >
          {modes?.enabled && <ModeBar modes={modes} />}
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
                A−
              </button>
              <span>{fontSize}px</span>
              <button
                aria-label="Увеличить шрифт кода"
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              >
                A+
              </button>
              Python <span className="live-dot" />
            </span>
          </div>
          {modes && modes.mode !== "python" ? (
            <div className={`block-area ${modes.mode}`}>
              <BlockEditor
                value={modes.blocks.workspace}
                palette={modes.palette}
                readOnly={readOnly || busy || submission.busy}
                onChange={(w) => modes.blocks.change(w)}
                onSelect={(_, statement) => modes.setSelected(statement)}
              />
              {modes.mode === "mixed" && <PythonMirror modes={modes} />}
            </div>
          ) : (
          <fieldset disabled={readOnly || busy || submission.busy}>
            <MinimalCodeEditor
              value={code}
              onChange={(v) => {
                studentDraft.change(v);
              }}
              rows={16}
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
            <div className="actions">
              <button
                disabled={readOnly || busy || submission.busy}
                onClick={() => run(false)}
              >
                ▷ Запустить
              </button>
              <button
                className="primary"
                disabled={readOnly || busy || submission.busy}
                onClick={() => run(true)}
              >
                {submission.busy
                  ? submission.label
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
              <b>Консоль</b>
              <span>Результат запуска и проверки</span>
            </div>
            <details className="stdin-details" open={inputsExpanded} onToggle={e=>setInputsExpanded(e.currentTarget.open)}>
              <summary>Ввод для пробного запуска</summary>
              <label className="stdin">
                Ввод для пробного запуска
                <textarea
                  value={inputs}
                  onChange={(e) => setInputs(e.target.value)}
                  rows={2}
                  placeholder="Каждая строка — отдельный input"
                />
              </label>
            </details>
            {submission.busy && (
              <div className="submission-state" role="status">
                {submission.label}
                {submission.canCancel && (
                  <button onClick={() => void submission.cancel()}>
                    Отменить ожидание
                  </button>
                )}
              </div>
            )}
            {submission.error && (
              <p role="alert" className="error">
                {submission.error}
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
                className={`result-box ${result.status || ""}`}
              >
                <b>{result.message || result.error || "Программа выполнена"}</b>
                {result.output && (
                  <pre>{result.output.join("\n") || "(нет вывода)"}</pre>
                )}
                {result.cases?.map((c: Row) => (
                  <div className="case-result" key={c.index}>
                    <span>
                      {c.passed ? "✓" : "×"} Тест {c.index}
                      {c.hidden ? " · скрытый" : ""}
                    </span>
                    {!c.hidden && !c.passed && (
                      <>
                        <small>Ожидается</small>
                        <pre>{c.expected || "(пусто)"}</pre>
                        <small>Ваш вывод</small>
                        <pre>{c.output || "(пусто)"}</pre>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="console-empty">
                Здесь появится результат вашей программы.
              </p>
            )}
          </div>
          <details className="runtime-info">
            <summary>Возможности учебного Python</summary>
            <p>
              print, input, int, str, len для списков, range, переменные,
              списки, условия, циклы, функции. Отступ — 4 пробела. Импорты,
              библиотеки, файлы и сеть не поддерживаются.
            </p>
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
function ModeBar({ modes }: { modes: SolvingModes }) {
  const others = (["blocks", "mixed", "python"] as Mode[]).filter((m) => modes.modes?.supported.includes(m) && !modes.available.includes(m));
  return (
    <div className="mode-bar">
      <div className="mode-switch" role="radiogroup" aria-label="Способ решения">
        {modes.available.map((m) => (
          <button key={m} role="radio" aria-checked={modes.mode === m} className={`mode-${m}`} disabled={modes.mode !== m && !modes.canSwitch(m)} onClick={() => void modes.switchTo(m)}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <small className="muted">
        {modes.modes?.switching === "free" ? "Переключайся сам: работа в каждом режиме сохраняется." : modes.modes?.switching === "teacher" ? "Другие режимы открывает учитель." : "Режим выбрал учитель."}
        {others.length > 0 && ` Пока закрыто: ${others.map((m) => MODE_LABEL[m]).join(", ")}.`}
      </small>
      {modes.offered && (
        <div className="mode-offer" role="status">
          <span>Учитель предлагает перейти в режим «{MODE_LABEL[modes.offered]}».</span>
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
