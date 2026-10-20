export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: Record<string, unknown>,
  ) {
    super(message);
  }
}
/** The client stopped waiting for this request: the server may still have done the work. Not a refusal. */
export class RequestTimeout extends Error {
  constructor(public ms: number) {
    super("Сервер долго не отвечает.");
  }
}
/** Protocol version of this client: requests without it come from a tab of an earlier release. */
export const CLIENT_PROTOCOL = "2";
/**
 * The learner this tab shows. Every request names it, so the server refuses (owner_mismatch) instead of
 * acting for another child who has signed in from a neighbouring tab of the same browser.
 */
let sessionUser: { id: string; org_id: string } | null = null;
export const setSessionUser = (user: { id: string; org_id: string } | null) => {
  sessionUser = user ? { id: user.id, org_id: user.org_id } : null;
};
export type Owner = { id: string; org_id: string };
export type ApiOptions = { owner?: Owner; timeout?: number; keepalive?: boolean };
export const isOwnerMismatch = (e: unknown) => e instanceof ApiError && e.details.code === "owner_mismatch";
export async function api(
  path: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
  { owner = sessionUser ?? undefined, timeout, keepalive }: ApiOptions = {},
) {
  const headers: Record<string, string> = { "X-Kodik-Client": CLIENT_PROTOCOL };
  if (owner) {
    headers["X-Kodik-User"] = owner.id;
    headers["X-Kodik-Org"] = owner.org_id;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const control = new AbortController();
  let expired = false;
  const timer = timeout ? setTimeout(() => { expired = true; control.abort(); }, timeout) : undefined;
  const forward = () => control.abort();
  signal?.addEventListener("abort", forward, { once: true });
  if (signal?.aborted) control.abort();
  try {
    const response = await fetch(
      `/api${path}`,
      body === undefined
        ? { credentials: "same-origin", signal: control.signal, headers }
        : { method, signal: control.signal, credentials: "same-origin", headers, body: JSON.stringify(body), keepalive },
    );
    const data = await response.json();
    if (response.status === 401)
      window.dispatchEvent(new Event("kodik-auth-expired"));
    if (!response.ok) {
      const error = new ApiError(data.error || "Не удалось выполнить запрос.", response.status, data);
      if (isOwnerMismatch(error))
        window.dispatchEvent(new CustomEvent("kodik-owner-mismatch", { detail: { expected: owner?.id, session: data.session_user } }));
      throw error;
    }
    return data;
  } catch (e) {
    if (expired) throw new RequestTimeout(timeout!);
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}
export type Row = Record<string, any>;
export type State = {
  user: Row;
  organization: Row;
  courses: Row[];
  modules: Row[];
  lessons: Row[];
  tasks: Row[];
  users: Row[];
  groups: Row[];
  members: Row[];
  assignments: Row[];
  attempts: Row[];
  drafts: Row[];
  programs:Row[];
};
export const statusNames: Record<string, string> = {
  passed: "Выполнено",
  failed: "Нужны исправления",
  runtime_error: "Ошибка выполнения",
  pending_review: "На проверке",
  checker_error: "Ошибка проверки",
  cancelled: "Проверка отменена",
};
