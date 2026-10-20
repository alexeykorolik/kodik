import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Row } from "./api";
/** What is being submitted: Python code or a block workspace (the server translates blocks itself). */
export type SubmissionPayload = { mode?: "python" | "blocks" | "mixed"; code?: string; workspace?: unknown; client_translator?: string };
/**
 * One client operation, kept in localStorage per school, learner and assignment. Its key and its exact
 * content never change until the server has answered: a lost response is resent unchanged, so the
 * server's request-key protocol returns the same accepted check instead of creating a second result.
 */
type Pending = SubmissionPayload & { request_key: string; jobId?: string; sent_at?: string };
/**
 * Phases follow what actually happened:
 *  idle        — nothing in flight (also after an explicit refusal: the learner fixes and resubmits);
 *  sending     — the request is on its way;
 *  unconfirmed — no answer: whether the server accepted the solution is unknown, the same request is resent;
 *  queued / running — accepted (we have its check id) and being checked;
 *  reconnecting — accepted, but the result cannot be fetched right now;
 *  held        — accepted and waiting for the checking environment to be confirmed.
 */
export type SubmissionPhase = "idle" | "sending" | "unconfirmed" | "queued" | "running" | "reconnecting" | "held";
export type SubmissionNotice = { kind: "refused" | "unconfirmed" | "reconnecting" | "held" | "info"; text: string; errors?: Row[] } | null;
// A 4xx answer to the submission itself is a decision: the server checked the request key first, so no
// accepted check exists for this operation. 401 (sign in again) and 429 (too frequent) are not decisions.
const refusal = (e: unknown) => e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 408 && e.status !== 429;
const delays = [3000, 5000, 10000, 20000, 40000, 60000];
function explain(e: ApiError) {
  const code = e.details.code, errors = e.details.translation_errors;
  if (code === "translation" || (Array.isArray(errors) && errors.length))
    return `Программа из блоков ещё не готова: ${e.message} Дострой её и нажми «Проверить решение» ещё раз — блоки сохранены.`;
  if (code === "client_outdated") return e.message;
  if (code === "request_key_reused") return "Эта отправка уже связана с другим решением. Нажми «Проверить решение», чтобы отправить текущую программу заново.";
  return `Решение не принято на проверку: ${e.message}`;
}
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
    retryAt = useRef(0),
    failures = useRef(0),
    complete = useRef(onComplete);
  complete.current = onComplete;
  const [phase, setPhase] = useState<SubmissionPhase>("idle"),
    [notice, setNotice] = useState<SubmissionNotice>(null),
    [job, setJob] = useState<Row | null>(null),
    [sentAt, setSentAt] = useState<string | null>(null);
  const phaseNames: Record<SubmissionPhase, string> = {
    idle: "",
    sending: "Отправляем решение…",
    unconfirmed: "Ждём ответа сервера…",
    queued: "Решение принято, ждёт проверки",
    running: "Проверяем решение…",
    reconnecting: "Решение принято. Получаем результат…",
    held: "Решение принято — результат появится позже",
  };
  const remember = (p: Pending) => { try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* storage unavailable: the in-memory operation still completes */ } };
  /** End exactly this operation: never one started later in another tab with another key. */
  function finish(p: Pending) {
    if (pending.current === p) pending.current = null;
    try { const stored = JSON.parse(localStorage.getItem(key) || "null"); if (!stored || stored.request_key === p.request_key) localStorage.removeItem(key); } catch { /* nothing stored */ }
    retryAt.current = 0; failures.current = 0;
    if (mounted.current) { setPhase("idle"); setSentAt(null); }
  }
  const later = (ms = delays[Math.min(failures.current++, delays.length - 1)]) => { retryAt.current = Date.now() + ms; };
  async function resume(manual = false) {
    const current = pending.current;
    if (active.current || !current || (!manual && Date.now() < retryAt.current)) return;
    active.current = true;
    try {
      if (!current.jobId) {
        if (mounted.current) setPhase("sending");
        let accepted: Row;
        try {
          accepted = await api(`/tasks/${taskId}/submissions`, {
            mode: current.mode ?? "python",
            ...(current.mode && current.mode !== "python" ? { workspace: current.workspace, client_translator: current.client_translator } : { code: current.code }),
            request_key: current.request_key,
            assignment_id: assignmentId,
          });
        } catch (e) {
          if (!mounted.current) return;
          if (refusal(e)) {
            // Not accepted: the learner fixes the program; the next press is a new operation.
            const err = e as ApiError;
            finish(current);
            setNotice({ kind: "refused", text: explain(err), errors: Array.isArray(err.details.translation_errors) ? (err.details.translation_errors as Row[]) : undefined });
            return;
          }
          setPhase("unconfirmed");
          if (e instanceof ApiError && e.status === 401) { later(5000); setNotice({ kind: "unconfirmed", text: "Нужно снова войти в Kodik. После входа мы отправим это же решение — пока неизвестно, принято ли оно. Черновик сохранён." }); }
          else if (e instanceof ApiError && e.status === 429) { later(15000); setNotice({ kind: "unconfirmed", text: "Слишком много отправок подряд. Через 15 секунд отправим это же решение ещё раз. Черновик сохранён." }); }
          else { later(); setNotice({ kind: "unconfirmed", text: "Нет ответа сервера: пока неизвестно, принято ли решение. Мы отправим эту же версию, когда связь вернётся. Изменения в редакторе сохраняются как черновик." }); }
          return;
        }
        current.jobId = accepted.id;
        current.sent_at = current.sent_at || new Date().toISOString();
        remember(current);
        failures.current = 0;
        await follow(current, accepted);
      } else await follow(current);
    } finally {
      active.current = false;
    }
  }
  /** Follow THIS accepted check until it is completed or cancelled. */
  async function follow(current: Pending, first?: Row) {
    let next: Row | undefined = first;
    if (mounted.current) setSentAt(current.sent_at ?? null);
    while (mounted.current) {
      let result: Row;
      if (next) result = next;
      else {
        try { result = await api(`/submissions/${current.jobId}`); }
        catch (e) {
          if (!mounted.current) return;
          if (e instanceof ApiError && (e.status === 404 || e.status === 403)) { finish(current); setNotice({ kind: "info", text: "Прежняя проверка недоступна. Решение можно отправить заново." }); return; }
          setPhase("reconnecting"); later();
          setNotice({ kind: "reconnecting", text: "Решение принято на проверку. Связь прервалась — результат появится, когда она вернётся." });
          return;
        }
      }
      failures.current = 0;
      setJob(result);
      if (result.status === "held") {
        // Accepted but waiting for the checking environment: no result yet, not the learner's error.
        setPhase("held"); later(20000);
        setNotice({ kind: "held", text: result.result?.message || "Решение принято. Результат появится после проверки совместимости." });
        return;
      }
      if (["completed", "cancelled"].includes(result.status)) {
        if (result.result) await complete.current(result.result);
        finish(current); setNotice(null); setJob(null);
        return;
      }
      setPhase(result.status === "running" ? "running" : "queued");
      setNotice(null);
      await new Promise((r) => setTimeout(r, 500));
      next = undefined;
    }
  }
  useEffect(() => {
    mounted.current = true;
    pending.current = null; retryAt.current = 0; failures.current = 0;
    setPhase("idle"); setNotice(null); setJob(null); setSentAt(null);
    try {
      pending.current = JSON.parse(localStorage.getItem(key) || "null");
    } catch {}
    void resume(true);
    const timer = setInterval(() => void resume(), 1000);
    const online = () => { retryAt.current = 0; void resume(true); };
    window.addEventListener("online", online);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [key]);
  async function submit(payload: SubmissionPayload) {
    // An operation whose acceptance is still unknown is resent with its own key and content: a lost
    // response or a reload never creates a second result, and the newer draft never replaces it.
    if (pending.current?.jobId) return;
    if (!pending.current) {
      pending.current = { request_key: crypto.randomUUID(), ...payload };
      remember(pending.current);
    }
    setNotice(null);
    await resume(true);
  }
  async function cancel() {
    const current = pending.current;
    if (!current?.jobId) return;
    try {
      await api(`/submissions/${current.jobId}`, {}, "DELETE");
      finish(current); setJob(null); setNotice(null);
    } catch (e) {
      setNotice({ kind: "info", text: (e as Error).message });
    }
  }
  return {
    submit,
    cancel,
    phase,
    notice,
    /** Check id and time of an accepted, not yet finished check (held, reconnecting). */
    sentAt,
    // Run and check are blocked only while a request or an accepted check is actively in progress.
    busy: phase === "sending" || phase === "queued" || phase === "running",
    /** An earlier solution waits for confirmation or a result: a new check would not be a new operation. */
    waiting: phase === "unconfirmed" || phase === "reconnecting" || phase === "held",
    label: phaseNames[phase],
    error: notice?.text ?? "",
    canCancel: job?.status === "queued",
  };
}
