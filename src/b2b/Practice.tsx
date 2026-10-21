// Free practice: the learner picks a way of programming and writes anything, without a task,
// a check or a mark. Drafts stay in this browser (one per way of solving); nothing is sent away.
import { useEffect, useMemo, useRef, useState } from "react";
import { BlockEditor } from "./BlockEditor";
import { MinimalCodeEditor } from "../MinimalCodeEditor";
import { BLOCKS, translateWorkspace } from "../adaptive/blockProgram";
import { runCourseProgram } from "../pythonExecution";
import type { Scene } from "../python/scene";
import { PlaybackBar, SceneView, usePlayback } from "./SceneView";
import { Icon, type IconName } from "./Icon";
import { runFull, stop as stopFull, subscribe, warmUp, TIME_LIMIT_MS, type FullRun, type FullStatus } from "./practice/fullPython";

export type PracticeMode = "blocks" | "mixed" | "python" | "full";
const MODES: { id: PracticeMode; icon: IconName; title: string; text: string; tags: string }[] = [
  { id: "blocks", icon: "puzzle", title: "Блоки", text: "Собирай программу из блоков: вывод, переменные, условия, циклы и функции.", tags: "Для начала" },
  { id: "mixed", icon: "layers", title: "Блоки + Python", text: "Собирай блоки и смотри, какой код Python из них получается.", tags: "Переход к коду" },
  { id: "python", icon: "code", title: "Python", text: "Пиши код с черепахой, Роботом, графиками и анимацией — как в заданиях.", tags: "turtle · pyrob · numpy · графики" },
  { id: "full", icon: "terminal", title: "Полный Python", text: "Настоящий Python со всей стандартной библиотекой — когда хочется выйти за программу.", tags: "словари · f-строки · классы · модули" },
];
export const isPracticeMode = (id?: string): id is PracticeMode => MODES.some((m) => m.id === id);
const ALL_BLOCKS = BLOCKS.map((b) => b.type);
const EMPTY_BLOCKS = { blocks: { languageVersion: 0, blocks: [] } };
const STARTERS: Record<"python" | "full", string> = {
  python: "# Твоя программа. Нажми «Запустить».\nimport turtle\n\nt = turtle.Turtle()\nfor i in range(5):\n    t.forward(100)\n    t.right(144)\nprint(\"Звезда готова!\")\n",
  full: "# Здесь работает весь Python: словари, f-строки, классы, стандартная библиотека.\nimport random\nfrom collections import Counter\n\nrolls = [random.randint(1, 6) for _ in range(20)]\ncounts = Counter(rolls)\nfor side in sorted(counts):\n    print(f\"{side}: {'■' * counts[side]}\")\nprint(\"Чаще всего выпадало:\", counts.most_common(1)[0][0])\n",
};

// Drafts are a per-browser convenience: storage may be missing (private window), so every access is guarded.
const key = (user: string, slot: string) => `kodik:practice:v1:${user}:${slot}`;
function load<T>(user: string, slot: string, fallback: T): T { try { const raw = localStorage.getItem(key(user, slot)); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; } }
function save(user: string, slot: string, value: unknown) { try { localStorage.setItem(key(user, slot), JSON.stringify(value)); return true; } catch { return false; } }

// Plain-language hints for the most common errors of full Python; the original message stays visible.
const ERROR_HINTS: Record<string, string> = {
  SyntaxError: "Ошибка в записи кода: проверь скобки, кавычки и двоеточия.",
  IndentationError: "Неверный отступ: строки внутри if, for, while и def пишутся с отступом в 4 пробела.",
  NameError: "Python не знает такого имени: проверь, что переменная создана раньше и имя написано так же.",
  TypeError: "Значения не подходят друг к другу: например, текст и число нельзя сложить без str() или int().",
  ValueError: "Неподходящее значение: например, int(\"привет\") не превращается в число.",
  ZeroDivisionError: "Деление на ноль.",
  IndexError: "Такого номера в списке нет — нумерация начинается с 0.",
  KeyError: "Такого ключа в словаре нет.",
  AttributeError: "У этого значения нет такого метода или свойства.",
  EOFError: "Программа ждёт ещё одну строку ввода — добавь её в поле «Ввод».",
  ModuleNotFoundError: "Такой библиотеки здесь нет. Черепаха, Робот, numpy и графики работают в режиме «Python».",
  RecursionError: "Функция вызывает сама себя слишком много раз.",
  LoadError: "Python не загрузился. Проверь интернет и нажми «Запустить» ещё раз.",
};

type Result =
  | { kind: "teaching"; output: string[]; error?: string; scene?: Scene; times?: number[] }
  | { kind: "full"; run: FullRun; running: boolean };

export function Practice({ user, mode, go, ask }: { user: string; mode?: PracticeMode; go: (path: string) => void; ask: (o: { title: string; text?: string; confirm: string; danger?: boolean }) => Promise<boolean> }) {
  if (!mode) return <PracticeHome go={go} />;
  return <PracticeEditor key={mode} user={user} mode={mode} go={go} ask={ask} />;
}

function PracticeHome({ go }: { go: (path: string) => void }) {
  useEffect(() => { warmUp(); }, []);
  return <>
    <header className="page-heading"><div><h1>Практика</h1><p>Пиши что хочешь — без заданий и оценок. Программы сохраняются в этом браузере.</p></div></header>
    <div className="practice-modes">
      {MODES.map((m) => <button key={m.id} type="button" className={`practice-mode mode-${m.id}`} onClick={() => go(`practice/${m.id}`)}>
        <span className="practice-mode-icon"><Icon name={m.icon} size="lg" /></span>
        <span className="practice-mode-text"><b>{m.title}</b><span>{m.text}</span><small>{m.tags}</small></span>
        <Icon name="arrow" className="practice-mode-go" />
      </button>)}
    </div>
  </>;
}

function PracticeEditor({ user, mode, go, ask }: { user: string; mode: PracticeMode; go: (path: string) => void; ask: (o: { title: string; text?: string; confirm: string; danger?: boolean }) => Promise<boolean> }) {
  const blocksMode = mode === "blocks" || mode === "mixed", info = MODES.find((m) => m.id === mode)!;
  const codeSlot = mode === "full" ? "full" : "python";
  const [workspace, setWorkspace] = useState<object>(() => load(user, "blocks", EMPTY_BLOCKS));
  const [code, setCode] = useState(() => load(user, codeSlot, blocksMode ? "" : STARTERS[codeSlot]));
  const [stdin, setStdin] = useState(() => load(user, `${mode}:stdin`, ""));
  const [saved, setSaved] = useState("Сохраняется в этом браузере");
  const [result, setResult] = useState<Result | null>(null);
  const [full, setFull] = useState<FullStatus>({ state: "idle" });
  const [editorKey, setEditorKey] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const mirror = useMemo(() => translateWorkspace(workspace, { allowed: ALL_BLOCKS }), [workspace]);
  const playback = usePlayback(result?.kind === "teaching" ? result.scene?.duration ?? 0 : 0, result);
  useEffect(() => (mode === "full" ? subscribe(setFull) : undefined), [mode]);
  useEffect(() => { if (mode === "full") warmUp(); }, [mode]);
  useEffect(() => () => { if (mode === "full") stopFull("user"); }, [mode]);
  const remember = (slot: string, value: unknown) => setSaved(save(user, slot, value) ? "✓ Сохранено в этом браузере" : "Браузер не даёт сохранить — скопируй код перед закрытием");
  const inputs = stdin === "" ? [] : stdin.replace(/\n$/, "").split("\n");
  const running = result?.kind === "full" && result.running;
  // The input box opens by itself when the program reads input; otherwise it stays folded away.
  const usesInput = /\binput\s*\(/.test(blocksMode ? mirror.python : code) || stdin !== "";

  async function run() {
    if (mode === "full") {
      setResult({ kind: "full", run: { output: [] }, running: true });
      const finished = await runFull(code, inputs, (partial) => setResult({ kind: "full", run: { ...partial, output: [...partial.output] }, running: true }));
      setResult({ kind: "full", run: finished, running: false });
    } else {
      const source = blocksMode ? mirror.python : code;
      if (blocksMode && !mirror.ok) { setResult({ kind: "teaching", output: [], error: mirror.errors[0]?.message || "Собери программу из блоков." }); return; }
      try { const r = runCourseProgram(source, inputs); setResult({ kind: "teaching", output: r.output, error: r.error, scene: r.scene, times: r.outputTimes }); }
      catch (e) { setResult({ kind: "teaching", output: [], error: (e as Error).message }); }
    }
    requestAnimationFrame(() => outputRef.current?.scrollIntoView?.({ block: "nearest" }));
  }
  async function clear() {
    if (!(await ask({ title: "Очистить поле?", text: blocksMode ? "Все блоки на поле удалятся. Это нельзя отменить." : "Весь код в редакторе удалится. Это нельзя отменить.", confirm: "Очистить", danger: true }))) return;
    if (blocksMode) { setWorkspace(EMPTY_BLOCKS); remember("blocks", EMPTY_BLOCKS); setEditorKey((k) => k + 1); }
    else { setCode(""); remember(codeSlot, ""); }
    setResult(null);
  }
  const lines = result?.kind === "teaching" ? (result.times && playback.state !== "done" ? result.output.filter((_, i) => result.times![i] <= playback.t) : result.output) : [];
  const error = result?.kind === "full" ? result.run.error : undefined;

  return <>
    <div className="workspace-head">
      <div className="workspace-heading"><button className="link" onClick={() => go("practice")}>← Практика</button></div>
      <div className="workspace-title"><span className="overline">ПРАКТИКА</span><h1>{info.title}</h1></div>
      <div className="mode-switch practice-switch" role="tablist" aria-label="Способ программирования">
        {MODES.map((m) => <button key={m.id} role="tab" aria-selected={m.id === mode} className={m.id === mode ? "active" : ""} onClick={() => go(`practice/${m.id}`)}>{m.title}</button>)}
      </div>
    </div>
    <div className="workspace-grid practice-grid">
      <section className={`coding-panel mode-${blocksMode ? mode : "python"}`}>
        {blocksMode ? (
          <div className={`block-area ${mode}`}>
            <BlockEditor key={editorKey} value={workspace} palette={ALL_BLOCKS} label="Поле для блоков" onChange={(w) => { setWorkspace(w); remember("blocks", w); }} />
            {mode === "mixed" && <section className="python-mirror" aria-label="Python из твоих блоков" aria-live="polite"><h3>Python из твоих блоков</h3>
              {mirror.ok ? <pre className="mirror-code">{(mirror.python.trimEnd() || "# Добавь блоки — здесь появится код").split("\n").map((line, i) => <div key={i}><span className="ln">{i + 1}</span>{line}</div>)}</pre>
                : <ul className="mirror-errors">{mirror.errors.slice(0, 4).map((e, i) => <li key={i}>{e.message}</li>)}</ul>}
              {mirror.ok && mirror.python.trim() && <button type="button" className="small" onClick={() => { const next = mirror.python.trimEnd() + "\n"; setCode(next); remember("python", next); go("practice/python"); }}>Продолжить этот код в Python</button>}
            </section>}
          </div>
        ) : (
          <fieldset><MinimalCodeEditor value={code} onChange={(v) => { setCode(v); remember(codeSlot, v); }} rows={16} label={mode === "full" ? "Код на полном Python" : "Код на Python"} /></fieldset>
        )}
        <div className="editor-bottom">
          <small className="muted">{saved}</small>
          <div className="actions">
            <button type="button" onClick={() => void clear()}><Icon name="x" size="sm" />Очистить</button>
            {running
              ? <button type="button" className="primary" onClick={() => stopFull("user")}><Icon name="stop" size="sm" />Остановить</button>
              : <button type="button" className="primary" disabled={mode === "full" && full.state === "failed"} onClick={() => void run()}><Icon name="play" size="sm" />Запустить</button>}
          </div>
        </div>
      </section>
      <section className="material-panel practice-output" ref={outputRef} aria-label="Результат">
        <div className="practice-output-head">
          <b>Что напечатает программа</b>
          {mode === "full" && <span className={`full-status ${full.state}`} role="status">{full.state === "ready" ? `Python ${full.version} готов` : full.state === "loading" ? "Загружаем Python… один раз, около 13 МБ" : full.state === "failed" ? "Python не загрузился" : "Python готовится"}</span>}
        </div>
        <details className="practice-stdin" open={usesInput} key={String(usesInput)}><summary>Ввод для input()</summary><label>Каждая строка — один ответ<textarea value={stdin} rows={2} onChange={(e) => { setStdin(e.target.value); remember(`${mode}:stdin`, e.target.value); }} placeholder="Например: Мира" /></label></details>
        <div className="practice-output-body">
          {!result && <p className="console-empty">Нажми «Запустить» — здесь появится результат.{mode === "full" ? ` Программа может работать до ${TIME_LIMIT_MS / 1000} секунд.` : ""}</p>}
          {result?.kind === "teaching" && <>
            {result.scene && <><PlaybackBar playback={playback} /><SceneView scene={result.scene} t={playback.t} /></>}
            {(lines.length > 0 || !result.scene) && !result.error && <pre className="practice-console" aria-label="Вывод программы">{lines.join("\n") || "(программа ничего не напечатала)"}</pre>}
            {result.error && (playback.state === "done" || !result.scene) && <>{lines.length > 0 && <pre className="practice-console">{lines.join("\n")}</pre>}<p className="practice-error" role="alert"><Icon name="x" size="sm" />{result.error}</p></>}
          </>}
          {result?.kind === "full" && <>
            {result.running && result.run.output.length === 0 && <p className="console-empty">{full.state === "ready" ? "Выполняется…" : "Загружаем Python, затем запустим программу…"}</p>}
            {result.run.output.length > 0 && <pre className="practice-console" aria-label="Вывод программы">{result.run.output.map((o, i) => <span key={i} className={o.stream === "stderr" ? "stderr" : undefined}>{o.text + "\n"}</span>)}</pre>}
            {!result.running && !error && !result.run.stopped && result.run.output.length === 0 && <pre className="practice-console">(программа ничего не напечатала)</pre>}
            {result.run.stopped && <p className="practice-error" role="status"><Icon name="stop" size="sm" />{result.run.stopped === "user" ? "Остановлено." : result.run.stopped === "time" ? `Программа работала дольше ${TIME_LIMIT_MS / 1000} секунд и была остановлена. Возможно, цикл не заканчивается.` : "Программа напечатала слишком много строк и была остановлена."}</p>}
            {error && <div className="practice-error" role="alert"><Icon name="x" size="sm" /><div><b>{error.line ? `Строка ${error.line}: ` : ""}{ERROR_HINTS[error.kind] || "Программа остановилась с ошибкой."}</b><code>{error.message}</code></div></div>}
          </>}
        </div>
      </section>
    </div>
  </>;
}
