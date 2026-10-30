/// <reference lib="webworker" />
// Full CPython (Pyodide) for the practice sandbox. Runs in its own worker so a long or endless
// program never freezes the page: the page stops it by terminating the worker.
import type { PyodideInterface } from "pyodide";

type Run = { type: "run"; id: number; code: string; stdin: string[] };
const post = (message: object) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
const OUTPUT_LIMIT = 2000;
let ready: Promise<PyodideInterface> | null = null;

function load(base: string) {
  ready ??= (async () => {
    post({ type: "status", status: "loading" });
    const { loadPyodide } = await import(/* @vite-ignore */ `${self.location.origin}${base}pyodide.mjs`);
    const py: PyodideInterface = await loadPyodide({ indexURL: `${self.location.origin}${base}`, fullStdLib: false });
    post({ type: "status", status: "ready", version: py.runPython("import sys; sys.version.split()[0]") });
    return py;
  })();
  return ready;
}

self.onmessage = async (event: MessageEvent<Run | { type: "load"; base: string }>) => {
  const message = event.data;
  if (message.type === "load") { try { await load(message.base); } catch (e) { post({ type: "status", status: "failed", error: String((e as Error)?.message || e) }); } return; }
  let py: PyodideInterface;
  try { py = await (ready ?? Promise.reject(new Error("not loaded"))); }
  catch (e) { post({ type: "done", id: message.id, error: { kind: "LoadError", message: String((e as Error)?.message || e), traceback: "" } }); return; }
  post({ type: "started", id: message.id });
  let lines = 0;
  const emit = (stream: "stdout" | "stderr") => (text: string) => {
    if (++lines > OUTPUT_LIMIT) { post({ type: "limit", id: message.id }); return; }
    post({ type: "out", id: message.id, stream, text });
  };
  py.setStdout({ batched: emit("stdout") });
  py.setStderr({ batched: emit("stderr") });
  // input() reads the lines the learner typed in advance and echoes them as a terminal would.
  const stdin = [...message.stdin];
  const globals = py.globals.get("dict")();
  try {
    globals.set("__kodik_stdin__", py.toPy(stdin));
    py.runPython(
      "import builtins as _b\n" +
      "def _kodik_input(prompt=''):\n" +
      "    if not __kodik_stdin__:\n" +
      "        raise EOFError('ввод закончился: добавь строку в поле «Ввод»')\n" +
      "    value = __kodik_stdin__.pop(0)\n" +
      "    print(f'{prompt}{value}')\n" +
      "    return value\n" +
      "_b.input = _kodik_input\n",
      { globals },
    );
    globals.set("__name__", "__main__");
    py.runPython(message.code, { globals, filename: "main.py" });
    post({ type: "done", id: message.id });
  } catch (e) {
    const text = String((e as Error)?.message || e);
    const lineMatch = [...text.matchAll(/File "main\.py", line (\d+)/g)].pop();
    const last = text.trim().split("\n").pop() || text;
    post({ type: "done", id: message.id, error: { kind: last.split(":")[0].trim(), message: last, line: lineMatch ? Number(lineMatch[1]) : undefined, traceback: text } });
  } finally {
    globals.destroy();
  }
};
