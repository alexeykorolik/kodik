// Page side of the full Python runner. One worker per page; it is replaced after a stop or a time
// limit, because terminating a worker is the only reliable way to interrupt CPython in WebAssembly.
export type FullStatus = { state: "idle" | "loading" | "ready" | "failed"; version?: string; error?: string };
export type FullError = { kind: string; message: string; line?: number; traceback: string };
export type FullRun = { output: { stream: "stdout" | "stderr"; text: string }[]; error?: FullError; stopped?: "user" | "time" | "output" };

// Set by the Vite plugin (vite.config.ts); absent when the module is imported outside Vite (node tests).
const BASE = (import.meta.env as Record<string, string> | undefined)?.VITE_PYODIDE_BASE || "/pyodide/";
export const TIME_LIMIT_MS = 15000;

let worker: Worker | null = null, status: FullStatus = { state: "idle" }, nextId = 1;
const listeners = new Set<(s: FullStatus) => void>();
const setStatus = (s: FullStatus) => { status = s; listeners.forEach((l) => l(s)); };
let active: { id: number; run: FullRun; finish: (r: FullRun) => void; onOutput: () => void; timer: ReturnType<typeof setTimeout> } | null = null;

function spawn() {
  worker = new Worker(new URL("./fullPython.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event) => {
    const m = event.data;
    if (m.type === "status") setStatus({ state: m.status, version: m.version, error: m.error });
    if (!active || m.id !== active.id) return;
    // The time limit counts only running time: the first download of Python may take longer.
    if (m.type === "started") { const a = active; a.timer = setTimeout(() => { if (active === a) stop("time"); }, TIME_LIMIT_MS); }
    if (m.type === "out") { active.run.output.push({ stream: m.stream, text: m.text }); active.onOutput(); }
    if (m.type === "limit") stop("output");
    if (m.type === "done") { const a = active; clearTimeout(a.timer); active = null; a.finish({ ...a.run, error: m.error }); }
  };
  worker.onerror = () => setStatus({ state: "failed", error: "Python не запустился в этом браузере." });
  worker.postMessage({ type: "load", base: BASE });
}

/** Start loading Python (once per page) so the first run does not wait for the download. */
export function warmUp() { if (!worker) spawn(); }
export function subscribe(listener: (s: FullStatus) => void) { listeners.add(listener); listener(status); return () => { listeners.delete(listener); }; }

export function runFull(code: string, stdin: string[], onOutput: (run: FullRun) => void): Promise<FullRun> {
  warmUp();
  if (active) stop("user");
  return new Promise((finish) => {
    const run: FullRun = { output: [] }, id = nextId++;
    active = { id, run, finish, onOutput: () => onOutput(run), timer: undefined as unknown as ReturnType<typeof setTimeout> };
    worker!.postMessage({ type: "run", id, code, stdin });
  });
}

/** Interrupt the running program: the worker is discarded and a fresh one starts loading. */
export function stop(reason: FullRun["stopped"] = "user") {
  if (!active) return;
  const a = active; active = null; clearTimeout(a.timer);
  worker?.terminate(); worker = null; setStatus({ state: "idle" });
  a.finish({ ...a.run, stopped: reason });
  spawn();
}
