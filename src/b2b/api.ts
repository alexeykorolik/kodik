export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: Record<string, unknown>,
  ) {
    super(message);
  }
}
export async function api(
  path: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? { credentials: "same-origin", signal }
      : {
          method,
          signal,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (response.status === 401)
    window.dispatchEvent(new Event("kodik-auth-expired"));
  if (!response.ok)
    throw new ApiError(
      data.error || "Не удалось выполнить запрос.",
      response.status,
      data,
    );
  return data;
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
};
