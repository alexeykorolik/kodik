import { useEffect, useRef, useState } from "react";
import { api, ApiError, isOwnerMismatch, RequestTimeout, type Owner, type Row } from "./api";
/** What is being submitted: Python code or a block workspace (the server translates blocks itself). */
export type SubmissionPayload = { mode?: "python" | "blocks" | "mixed"; code?: string; workspace?: unknown; client_translator?: string };
/**
 * One client operation, kept in localStorage per school, learner and assignment. Its context (school,
 * learner, assignment, task), key and exact content never change until the server has answered: a lost
 * response is resent unchanged, so the server's request-key protocol returns the same accepted check
 * instead of creating a second result. Records of the earlier format carry no context: the learner
 * and school come from their storage key, which was always scoped to them.
 */
type Pending = SubmissionPayload & {
  v?: 2;
  org_id?: string;
  user_id?: string;
  assignment_id?: string | null;
  task_id?: string;
  request_key: string;
  jobId?: string;
  sent_at?: string;
};
/**
 * Phases follow what actually happened:
 *  idle        — nothing in flight (also after an explicit refusal: the learner fixes and resubmits);
 *  sending     — the request is on its way (at most SUBMIT_TIMEOUT);
 *  unconfirmed — no answer: whether the server accepted the solution is unknown, the same request is resent;
 *  queued / running — accepted (we have its check id) and being checked;
 *  reconnecting — accepted, but the result cannot be fetched right now;
 *  held        — accepted and waiting for the checking environment to be confirmed;
 *  paused      — another child has signed in in this browser: nothing is sent, the operation stays theirs.
 */
export type SubmissionPhase = "idle" | "sending" | "unconfirmed" | "queued" | "running" | "reconnecting" | "held" | "paused";
export type SubmissionNotice = { kind: "refused" | "unconfirmed" | "reconnecting" | "held" | "info" | "owner"; text: string; errors?: Row[] } | null;
/**
 * How long this page waits for one answer. The server accepts a block program only after translating it
 * in the shared executor (it may wait there under a class load, see execution-queue waitMs), so a
 * submission gets 25 s; reading a known check is a single database read, 10 s. Giving up waiting never
 * cancels anything on the server: the same key is resent, or the same check id is asked again.
 */
export const SUBMIT_TIMEOUT = 25000, RESULT_TIMEOUT = 10000;
// A 4xx answer to the submission itself is a decision: the server checked the request key first, so no
// accepted check exists for this operation. 401 (sign in again) and 429 (too frequent) are not decisions,
// and neither is owner_mismatch: that answer is about the session, not about this learner's solution.
const refusal = (e: unknown) => e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 408 && e.status !== 429 && !isOwnerMismatch(e);
const delays = [3000, 5000, 10000, 20000, 40000, 60000];
function explain(e: ApiError) {
  const code = e.details.code, errors = e.details.translation_errors;
  if (code === "translation" || (Array.isArray(errors) && errors.length))
    return `Программа из блоков ещё не готова: ${e.message} Дострой её и нажми «Проверить решение» ещё раз — блоки сохранены.`;
  if (code === "client_outdated") return e.message;
  if (code === "request_key_reused") return "Эта отправка уже связана с другим решением. Нажми «Проверить решение», чтобы отправить текущую программу заново.";
  return `Решение не принято на проверку: ${e.message}`;
}
const OWNER_TEXT = "В этом браузере открыт другой аккаунт. Отправленное решение сохранено за прежним учеником: оно продолжится, когда он снова войдёт.";
export function useSubmission(
  learner: Owner,
  taskId: string,
  onComplete: (result: Row) => Promise<void>,
  assignmentId?:string,
) {
  // The learner is fixed for the life of this editor: every request of its operations names them.
  const [owner] = useState(() => ({ id: learner.id, org_id: learner.org_id }));
  const key = `kodik:submission:${owner.org_id}:${owner.id}:${assignmentId||taskId}`;
  const pending = useRef<Pending | null>(null),
    active = useRef<number | null>(null),
    generation = useRef(0),
    control = useRef<AbortController | null>(null),
    stopped = useRef(false),
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
    unconfirmed: "Ждём подтверждения сервера…",
    queued: "Решение принято, ждёт проверки",
    running: "Проверяем решение…",
    reconnecting: "Решение принято. Получаем результат…",
    held: "Решение принято — результат появится позже",
    paused: "Открыт другой аккаунт",
  };
  const remember = (p: Pending) => { try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* storage unavailable: the in-memory operation still completes */ } };
  /** True while an answer still belongs to this editor, this operation and this learner. */
  const current = (gen: number, p: Pending) => gen === generation.current && pending.current === p && !stopped.current;
  /** End exactly this operation: never one started later in another tab with another key. */
  function finish(p: Pending) {
    if (pending.current === p) pending.current = null;
    try { const stored = JSON.parse(localStorage.getItem(key) || "null"); if (!stored || stored.request_key === p.request_key) localStorage.removeItem(key); } catch { /* nothing stored */ }
    retryAt.current = 0; failures.current = 0;
    setPhase("idle"); setSentAt(null);
  }
  /** Another child's session: stop every request of this editor; the record stays under its learner. */
  function pause() {
    stopped.current = true;
    control.current?.abort();
    setPhase("paused");
    setNotice({ kind: "owner", text: OWNER_TEXT });
  }
  const later = (ms = delays[Math.min(failures.current++, delays.length - 1)]) => { retryAt.current = Date.now() + ms; };
  const request = (path: string, body?: unknown, method?: string, timeout?: number) =>
    api(path, body, method, control.current?.signal, { owner, timeout });
  async function resume(manual = false) {
    const p = pending.current, gen = generation.current;
    if (stopped.current || active.current === gen || !p || (!manual && Date.now() < retryAt.current)) return;
    active.current = gen;
    try {
      if (!p.jobId) {
        setPhase("sending");
        let accepted: Row;
        try {
          accepted = await request(`/tasks/${p.task_id ?? taskId}/submissions`, {
            mode: p.mode ?? "python",
            ...(p.mode && p.mode !== "python" ? { workspace: p.workspace, client_translator: p.client_translator } : { code: p.code }),
            request_key: p.request_key,
            assignment_id: p.assignment_id ?? assignmentId,
          }, "POST", SUBMIT_TIMEOUT);
        } catch (e) {
          if (gen !== generation.current || stopped.current) return;
          if (isOwnerMismatch(e)) return pause();
          if (pending.current !== p) return;
          if (refusal(e)) {
            // Not accepted: the learner fixes the program; the next press is a new operation.
            const err = e as ApiError;
            finish(p);
            setNotice({ kind: "refused", text: explain(err), errors: Array.isArray(err.details.translation_errors) ? (err.details.translation_errors as Row[]) : undefined });
            return;
          }
          setPhase("unconfirmed");
          if (e instanceof ApiError && e.status === 401) { later(5000); setNotice({ kind: "unconfirmed", text: "Нужно снова войти в Kodik. После входа мы отправим это же решение — пока неизвестно, принято ли оно. Черновик сохранён." }); }
          else if (e instanceof ApiError && e.status === 429) { later(15000); setNotice({ kind: "unconfirmed", text: "Слишком много отправок подряд. Через 15 секунд отправим это же решение ещё раз. Черновик сохранён." }); }
          else if (e instanceof RequestTimeout) { later(); setNotice({ kind: "unconfirmed", text: `Сервер не ответил за ${SUBMIT_TIMEOUT / 1000} секунд: подтверждение пока не получено. Мы отправим эту же версию ещё раз — вторая проверка не появится. Редактор свободен, изменения сохраняются как черновик.` }); }
          else { later(); setNotice({ kind: "unconfirmed", text: "Нет ответа сервера: пока неизвестно, принято ли решение. Мы отправим эту же версию, когда связь вернётся. Изменения в редакторе сохраняются как черновик." }); }
          return;
        }
        if (!current(gen, p)) return;
        p.jobId = accepted.id;
        p.sent_at = p.sent_at || new Date().toISOString();
        remember(p);
        failures.current = 0;
        await follow(p, gen, accepted);
      } else await follow(p, gen);
    } finally {
      if (active.current === gen) active.current = null;
    }
  }
  /** Follow THIS accepted check until it is completed or cancelled; never submit again to find it. */
  async function follow(p: Pending, gen: number, first?: Row) {
    let next: Row | undefined = first;
    setSentAt(p.sent_at ?? null);
    while (current(gen, p)) {
      let result: Row;
      if (next) result = next;
      else {
        try { result = await request(`/submissions/${p.jobId}`, undefined, undefined, RESULT_TIMEOUT); }
        catch (e) {
          if (gen !== generation.current || stopped.current) return;
          if (isOwnerMismatch(e)) return pause();
          if (pending.current !== p) return;
          if (e instanceof ApiError && (e.status === 404 || e.status === 403)) { finish(p); setNotice({ kind: "info", text: "Прежняя проверка недоступна. Решение можно отправить заново." }); return; }
          setPhase("reconnecting"); later();
          setNotice({ kind: "reconnecting", text: e instanceof RequestTimeout
            ? "Решение принято на проверку, но сервер долго не отдаёт результат. Мы спросим ещё раз — новую проверку отправлять не нужно. Редактор свободен."
            : "Решение принято на проверку. Связь прервалась — результат появится, когда она вернётся." });
          return;
        }
        if (!current(gen, p)) return;
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
        finish(p); setNotice(null); setJob(null);
        return;
      }
      setPhase(result.status === "running" ? "running" : "queued");
      setNotice(null);
      await new Promise((r) => setTimeout(r, 500));
      next = undefined;
    }
  }
  useEffect(() => {
    const gen = ++generation.current;
    control.current = new AbortController();
    stopped.current = false;
    pending.current = null; retryAt.current = 0; failures.current = 0;
    setPhase("idle"); setNotice(null); setJob(null); setSentAt(null);
    try {
      const stored: Pending | null = JSON.parse(localStorage.getItem(key) || "null");
      // A record names its learner; one of another learner or school is never taken over, nor removed.
      if (stored && typeof stored.request_key === "string" && (stored.user_id ?? owner.id) === owner.id && (stored.org_id ?? owner.org_id) === owner.org_id)
        pending.current = stored;
    } catch { /* unreadable record: left as it is */ }
    void resume(true);
    const timer = setInterval(() => void resume(), 1000);
    const online = () => { retryAt.current = 0; void resume(true); };
    window.addEventListener("online", online);
    return () => {
      if (generation.current === gen) generation.current++;
      control.current?.abort();
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [key]);
  async function submit(payload: SubmissionPayload) {
    if (stopped.current) return;
    // An operation whose acceptance is still unknown is resent with its own key and content: a lost
    // response or a reload never creates a second result, and the newer draft never replaces it.
    if (pending.current?.jobId) return;
    if (!pending.current) {
      pending.current = { v: 2, org_id: owner.org_id, user_id: owner.id, assignment_id: assignmentId ?? null, task_id: taskId, request_key: crypto.randomUUID(), ...payload };
      remember(pending.current);
    }
    setNotice(null);
    retryAt.current = 0;
    await resume(true);
  }
  /** Ask about the same operation now instead of waiting for the next pause. */
  function retry() {
    if (stopped.current) return;
    retryAt.current = 0;
    void resume(true);
  }
  async function cancel() {
    const p = pending.current;
    if (!p?.jobId || stopped.current) return;
    try {
      await request(`/submissions/${p.jobId}`, {}, "DELETE", RESULT_TIMEOUT);
      finish(p); setJob(null); setNotice(null);
    } catch (e) {
      if (isOwnerMismatch(e)) return pause();
      setNotice({ kind: "info", text: e instanceof RequestTimeout ? "Сервер долго не отвечает. Попробуйте отменить ещё раз." : (e as Error).message });
    }
  }
  return {
    submit,
    cancel,
    retry,
    phase,
    notice,
    /** Time an accepted, not yet finished check was sent (held, reconnecting). */
    sentAt,
    // Run and check are blocked only while a request or an accepted check is actively in progress.
    busy: phase === "sending" || phase === "queued" || phase === "running",
    /** An earlier solution waits for confirmation or a result: a new check would not be a new operation. */
    waiting: phase === "unconfirmed" || phase === "reconnecting" || phase === "held" || phase === "paused",
    label: phaseNames[phase],
    error: notice?.text ?? "",
    canCancel: job?.status === "queued",
  };
}
