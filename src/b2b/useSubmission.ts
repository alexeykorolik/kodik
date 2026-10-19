import { useEffect, useRef, useState } from "react";
import { api, type Row } from "./api";
/** What is being submitted: Python code or a block workspace (the server translates blocks itself). */
export type SubmissionPayload = { mode?: "python" | "blocks" | "mixed"; code?: string; workspace?: unknown; client_translator?: string };
type Pending = SubmissionPayload & { request_key: string; jobId?: string };
export function useSubmission(
  owner: { id: string; org_id: string },
  taskId: string,
  onComplete: (result: Row) => Promise<void>,
  assignmentId?:string,
) {
  const key = `kodik:submission:${owner.org_id}:${owner.id}:${assignmentId||taskId}`;
  const pending = useRef<Pending | null>(null),
    active = useRef(false),
    mounted = useRef(true),
    complete = useRef(onComplete);
  complete.current = onComplete;
  const [phase, setPhase] = useState("idle"),
    [error, setError] = useState(""),
    [job, setJob] = useState<Row | null>(null);
  const phaseNames: Record<string, string> = {
    idle: "",
    sending: "Отправляем решение…",
    queued: "Решение в очереди проверки",
    running: "Проверяем решение…",
    reconnecting: "Решение сохранено. Восстанавливаем связь…",
  };
  const remember = () => {
    if (pending.current)
      localStorage.setItem(key, JSON.stringify(pending.current));
  };
  async function resume() {
    if (active.current || !pending.current) return;
    active.current = true;
    setError("");
    try {
      let current = pending.current;
      setPhase(current.jobId ? "queued" : "sending");
      let result = current.jobId
        ? await api(`/submissions/${current.jobId}`)
        : await api(`/tasks/${taskId}/submissions`, {
            mode: current.mode ?? "python",
            ...(current.mode && current.mode !== "python" ? { workspace: current.workspace, client_translator: current.client_translator } : { code: current.code }),
            request_key: current.request_key,
            assignment_id:assignmentId,
          });
      current.jobId = result.id;
      remember();
      while (mounted.current) {
        setJob(result);
        setPhase(result.status);
        if (["completed", "cancelled"].includes(result.status)) {
          if (result.result) await complete.current(result.result);
          pending.current = null;
          localStorage.removeItem(key);
          setPhase("idle");
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
        if (!mounted.current) return;
        result = await api(`/submissions/${current.jobId}`);
      }
    } catch (e) {
      if (mounted.current) {
        setPhase("reconnecting");
        setError(
          e instanceof Error
            ? e.message
            : "Не удалось получить результат. Работа сохранена.",
        );
      }
    } finally {
      active.current = false;
    }
  }
  useEffect(() => {
    mounted.current = true;
    try {
      pending.current = JSON.parse(localStorage.getItem(key) || "null");
    } catch {}
    void resume();
    const timer = setInterval(() => {
      if (navigator.onLine) void resume();
    }, 5000);
    const online = () => void resume();
    window.addEventListener("online", online);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [key]);
  async function submit(payload: SubmissionPayload) {
    // A pending submission keeps its key and exact content until it completes, so a lost
    // response or a reload never creates a second result.
    if (!pending.current) {
      pending.current = { request_key: crypto.randomUUID(), ...payload };
      remember();
    }
    await resume();
  }
  async function cancel() {
    if (!pending.current?.jobId) return;
    try {
      await api(`/submissions/${pending.current.jobId}`, {}, "DELETE");
      pending.current = null;
      localStorage.removeItem(key);
      setPhase("idle");
      setJob(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return {
    submit,
    cancel,
    phase,
    busy: phase !== "idle",
    label: phaseNames[phase] || "Получаем результат…",
    error,
    canCancel: job?.status === "queued",
  };
}
