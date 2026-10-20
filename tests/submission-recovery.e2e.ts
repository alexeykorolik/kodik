import { test, expect, type Page, type APIRequestContext, type Request } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
// Audit of addbb47: an empty or unfinished block program was refused by the server (no check created),
// but the page treated the answer as a lost connection, kept the refused operation, resent it every five
// seconds, locked run and check, and a reload brought the locked state back. These scenarios use the real
// school API and look at what matters: the learner can fix and resubmit, accepted work is recovered once.
const password = "Submission-recovery-321!";
const origin = "http://127.0.0.1:4186";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST", expected = 200) {
  const res = await r.fetch(origin + "/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: origin }, data: body });
  const data = await res.json();
  expect(res.status(), `${path}: ${JSON.stringify(data)}`).toBe(expected);
  return data;
}
const printWs = (n: number) => ({ blocks: { languageVersion: 0, blocks: [{ type: "text_print", id: "p", x: 10, y: 10, inputs: { TEXT: { block: { type: "math_number", id: "pn", fields: { NUM: n } } } } }] } });
const emptyWs = { blocks: { languageVersion: 0, blocks: [] } };
function db<T>(fn: (d: DatabaseSync) => T): T { const d = new DatabaseSync("work/browser-test.sqlite"); try { d.exec("PRAGMA busy_timeout=5000"); return fn(d); } finally { d.close(); } }
const counts = (userId: string) => db((d) => ({
  jobs: (d.prepare("SELECT COUNT(*) n FROM submission_jobs WHERE user_id=?").get(userId) as { n: number }).n,
  attempts: (d.prepare("SELECT COUNT(*) n FROM attempts WHERE user_id=?").get(userId) as { n: number }).n,
}));

type Setup = { r: APIRequestContext; tag: string; org: string; task: { id: string }; assignment: { id: string }; group: { id: string }; kids: { id: string; login: string }[] };
async function setup(playwright: { request: { newContext: () => Promise<APIRequestContext> } }, policy: { allowed: string[]; start: string; switching: string }, learners = 1): Promise<Setup> {
  const tag = crypto.randomUUID().slice(0, 8), r = await playwright.request.newContext();
  const reg = await call(r, "/auth/register", { school: `Send ${tag}`, name: "Учитель", login: `send-${tag}`, password });
  const course = await call(r, "/courses", { title: "C" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const task = await call(r, "/tasks", { lesson_id: lesson.id, title: "Напечатай семь", description: "", goal: "Вывод", theory: "", instruction: "Выведи число 7", difficulty: "easy", starter: "", hints: [], check_mode: "tests", tests: [{ inputs: [], expected: "7", hidden: false }], reference_solution: "print(7)", wrong_solutions: ["print(8)"], learning_config: { modes: ["blocks", "mixed"], palette: ["text_print", "math_number"], skills: ["output"] }, block_solution: printWs(7) });
  const row = (await call(r, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
  expect((await call(r, `/tasks/${task.id}/verify`, { revision: row.revision })).status).toBe("approved");
  await call(r, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const group = await call(r, "/groups", { title: "5А" }), kids: { id: string; login: string }[] = [];
  for (let i = 0; i < learners; i++) { const login = `send-kid${i}-${tag}`, u = await call(r, "/users", { name: i ? "Лёва" : "Маша", login, password, role: "student" }); await call(r, `/groups/${group.id}/members`, { user_id: u.id }); kids.push({ id: u.id, login }); }
  const assignment = await call(r, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id, mode_policy: policy });
  return { r, tag, org: reg.user.org_id, task, assignment, group, kids };
}
async function signIn(page: Page, login: string, name = "Маша") {
  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(login);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole("heading", { name: `Привет, ${name}!` })).toBeVisible();
}
function submissions(page: Page) {
  const sent: { key: string; body: Record<string, unknown> }[] = [];
  page.on("request", (q: Request) => { if (q.method() === "POST" && /\/api\/tasks\/[^/]+\/submissions$/.test(q.url())) { const body = q.postDataJSON(); sent.push({ key: body.request_key, body }); } });
  return sent;
}
const storedOp = (page: Page, s: Setup, kid = 0) => page.evaluate((k) => localStorage.getItem(k), `kodik:submission:${s.org}:${s.kids[kid].id}:${s.assignment.id}`);
const checkButton = (page: Page) => page.getByRole("button", { name: "Проверить решение", exact: true });
async function openPanel(page: Page) {
  const panel = page.locator(".block-keyboard");
  if (!(await panel.evaluate((e) => (e as HTMLDetailsElement).open))) { await page.getByText("Добавить блок с клавиатуры").focus(); await page.keyboard.press("Enter"); }
  return panel;
}
async function buildPrint(page: Page, n?: number) {
  const panel = await openPanel(page);
  const add = async (name: string) => { await panel.getByRole("group", { name: "Блоки этого задания" }).getByRole("button", { name, exact: true }).focus(); await page.keyboard.press("Enter"); };
  if (n === undefined) { await add("напечатать"); return; }
  await add("число");
  const input = panel.locator('xpath=.//label[normalize-space(text()[1])="Число"]').locator("input").first();
  await input.focus(); await input.fill(String(n)); await page.keyboard.press("Enter");
}

test("blocks: refused empty and unfinished programs free the learner; the fixed program is sent and passes", async ({ page, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const s = await setup(playwright, { allowed: ["blocks", "mixed"], start: "blocks", switching: "free" });
  await signIn(page, s.kids[0].login);
  await page.goto(`/#assignment/${s.assignment.id}`);
  await expect(page.locator(".blockly-host svg").first()).toBeVisible();
  const sent = submissions(page);

  // Empty blocks: the real school API refuses; no check and no attempt are created.
  const refused = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/submissions"));
  await checkButton(page).click();
  const answer = await refused;
  expect(answer.status()).toBeGreaterThanOrEqual(400); expect(answer.status()).toBeLessThan(500);
  // Behaviour first: the refused request is not resent, run and check are free, nothing stays stored.
  await page.waitForTimeout(6500);
  expect(sent, "the refused request is not resent in the background").toHaveLength(1);
  await expect(page.getByRole("button", { name: "▷ Запустить", exact: true })).toBeEnabled();
  expect(await storedOp(page, s), "no stuck operation is kept").toBeNull();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "refused");
  expect(counts(s.kids[0].id)).toEqual({ jobs: 0, attempts: 0 });
  await expect(checkButton(page)).toBeEnabled();
  await expect(page.getByRole("button", { name: "▷ Запустить", exact: true })).toBeEnabled();

  // An unfinished program (print without a value): 422 translation, explained, nothing repeats in the background.
  await buildPrint(page);
  const unfinished = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/submissions"));
  await checkButton(page).click();
  const second = await unfinished;
  expect(second.status()).toBe(422); expect((await second.json()).code).toBe("translation");
  await expect(page.getByTestId("submission-notice")).toContainText("Программа из блоков ещё не готова");
  await expect(page.getByTestId("submission-notice")).toContainText("Дострой");
  expect(sent).toHaveLength(2); expect(sent[0].key).not.toBe(sent[1].key);
  await page.waitForTimeout(7000);
  expect(sent, "a refused request is never resent by itself").toHaveLength(2);
  expect(await storedOp(page, s)).toBeNull();
  expect(counts(s.kids[0].id)).toEqual({ jobs: 0, attempts: 0 });

  // A reload brings back the blocks, not a locked state.
  await page.reload();
  await expect(page.locator(".blockly-host svg").first()).toBeVisible();
  await expect(checkButton(page)).toBeEnabled();
  await expect(page.getByTestId("submission-state")).toHaveCount(0);
  await expect(page.locator(".blockly-host .blocklyDraggable")).toHaveCount(1);

  // Fix with the editor and send again: the new request carries the fixed program and passes.
  await (await openPanel(page)).getByRole("combobox", { name: "Выбранный блок" }).selectOption({ index: 1 });
  await buildPrint(page, 7);
  await expect(page.locator(".blockly-host .blocklyDraggable")).toHaveCount(2);
  await checkButton(page).click();
  await expect(page.getByText("Отлично! Все тесты пройдены.", { exact: true })).toBeVisible({ timeout: 15000 });
  const last = sent.at(-1)!;
  expect(JSON.stringify(last.body.workspace)).toContain('"NUM":7');
  expect(counts(s.kids[0].id)).toEqual({ jobs: 1, attempts: 1 });
  await page.screenshot({ path: "work/submission-recovery-1366.png", fullPage: true });
  await s.r.dispose();
});

test("mixed mode at 1920: a stored operation of the previous version without a check id leaves the stuck state by itself", async ({ page, playwright }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const s = await setup(playwright, { allowed: ["blocks", "mixed"], start: "mixed", switching: "free" });
  await signIn(page, s.kids[0].login);
  // What the faulty release left in this browser: a key and an empty block program, no check id.
  await page.evaluate(([k, ws]) => localStorage.setItem(k, JSON.stringify({ request_key: "legacy-empty-blocks-1", mode: "mixed", workspace: ws, client_translator: "x" })), [`kodik:submission:${s.org}:${s.kids[0].id}:${s.assignment.id}`, emptyWs] as const);
  const sent = submissions(page);
  await page.goto(`/#assignment/${s.assignment.id}`);
  await expect(page.getByRole("region", { name: "Python из твоих блоков" })).toBeVisible();
  await page.waitForTimeout(7000);
  expect(sent.map((x) => x.key), "the stale operation is sent once and then let go").toEqual(["legacy-empty-blocks-1"]);
  expect(await storedOp(page, s)).toBeNull();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "refused");
  expect(await storedOp(page, s)).toBeNull();
  await expect(checkButton(page)).toBeEnabled();
  expect(counts(s.kids[0].id)).toEqual({ jobs: 0, attempts: 0 });

  // Unfinished program in mixed mode, refused, then a reload, then the fix.
  await buildPrint(page);
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toContainText("Программа из блоков ещё не готова");
  await page.reload();
  await expect(page.getByRole("region", { name: "Python из твоих блоков" })).toBeVisible();
  await expect(checkButton(page)).toBeEnabled();
  await (await openPanel(page)).getByRole("combobox", { name: "Выбранный блок" }).selectOption({ index: 1 });
  await buildPrint(page, 7);
  await expect(page.getByRole("region", { name: "Python из твоих блоков" })).toContainText("print(7)");
  await checkButton(page).click();
  await expect(page.getByText("Отлично! Все тесты пройдены.", { exact: true })).toBeVisible({ timeout: 15000 });
  expect(counts(s.kids[0].id)).toEqual({ jobs: 1, attempts: 1 });
  await page.screenshot({ path: "work/submission-recovery-mixed-1920.png", fullPage: true });
  await s.r.dispose();
});

test("accepted work is recovered once: stored record without a check id, lost response, offline, rate limit, session expiry", async ({ page, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const s = await setup(playwright, { allowed: ["python", "blocks", "mixed"], start: "python", switching: "free" });
  const kid = await playwright.request.newContext();
  await call(kid, "/auth/login", { login: s.kids[0].login, password });
  // 1. Accepted on the server, but the old release lost the response and stored no check id.
  const accepted = await call(kid, `/tasks/${s.task.id}/submissions`, { mode: "python", code: "print(7)", assignment_id: s.assignment.id, request_key: "legacy-accepted-key-1" });
  await signIn(page, s.kids[0].login);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ request_key: "legacy-accepted-key-1", mode: "python", code: "print(7)" })), `kodik:submission:${s.org}:${s.kids[0].id}:${s.assignment.id}`);
  await page.goto(`/#assignment/${s.assignment.id}`);
  await expect(page.getByText("Отлично! Все тесты пройдены.", { exact: true })).toBeVisible({ timeout: 15000 });
  expect(counts(s.kids[0].id)).toEqual({ jobs: 1, attempts: 1 });
  expect(db((d) => (d.prepare("SELECT id FROM submission_jobs WHERE request_key='legacy-accepted-key-1' AND user_id=?").get(s.kids[0].id) as { id: string }).id)).toBe(accepted.id);

  // 2. Response lost after acceptance; the learner edits meanwhile: the same key and the same code are resent.
  const sent = submissions(page);
  await page.locator("#python-answer").fill("print(7) # вторая");
  await expect(page.getByText("Сохранено на сервере", { exact: true })).toBeVisible();
  await page.route("**/api/tasks/*/submissions", async (route) => { await route.fetch(); await route.abort("failed"); }, { times: 1 });
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
  await expect(page.getByTestId("submission-notice")).toContainText("пока неизвестно, принято ли решение");
  await page.locator("#python-answer").fill("print(8) # новая правка");
  await expect(page.getByText("Отлично! Все тесты пройдены.", { exact: true })).toBeVisible({ timeout: 20000 });
  expect(new Set(sent.map((x) => x.key)).size).toBe(1);
  expect(sent.every((x) => x.body.code === "print(7) # вторая")).toBe(true);
  expect(counts(s.kids[0].id)).toEqual({ jobs: 2, attempts: 2 });
  await expect(page.locator("#python-answer")).toHaveValue("print(8) # новая правка");

  // 3. Offline, then online: unknown acceptance, then exactly one new attempt.
  sent.length = 0;
  await page.context().setOffline(true);
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
  await expect(page.getByRole("button", { name: "Отправить то же решение ещё раз", exact: true })).toBeEnabled();
  await page.context().setOffline(false);
  await expect(page.getByText("Нужны исправления", { exact: false }).or(page.getByText("Ожидается", { exact: false })).first()).toBeVisible({ timeout: 20000 });
  expect(counts(s.kids[0].id)).toEqual({ jobs: 3, attempts: 3 });

  // 4. Rate limit is not a refusal: the same operation is resent later and accepted once.
  sent.length = 0;
  await page.locator("#python-answer").fill("print(7)");
  await expect(page.getByText("Сохранено на сервере", { exact: true })).toBeVisible();
  await page.route("**/api/tasks/*/submissions", (route) => route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Слишком много запросов." }) }), { times: 1 });
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toContainText("Слишком много отправок подряд");
  await expect(page.getByText("Отлично! Все тесты пройдены.", { exact: true })).toBeVisible({ timeout: 25000 });
  expect(new Set(sent.map((x) => x.key)).size).toBe(1);
  expect(counts(s.kids[0].id)).toEqual({ jobs: 4, attempts: 4 });

  // 5. Session ends while the answer is unknown: after signing in again the same operation completes once.
  sent.length = 0;
  await page.context().setOffline(true);
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
  const key = JSON.parse((await storedOp(page, s))!).request_key;
  await page.context().setOffline(false);
  await page.request.fetch(origin + "/api/auth/logout", { method: "POST", headers: { Origin: origin }, data: {} });
  await page.reload();
  await page.getByLabel("Логин", { exact: true }).fill(s.kids[0].login);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole("heading", { name: "Привет, Маша!" })).toBeVisible();
  await page.goto(`/#assignment/${s.assignment.id}`);
  await expect(page.getByText("Отлично! Все тесты пройдены.", { exact: true })).toBeVisible({ timeout: 20000 });
  expect(new Set(sent.map((x) => x.key))).toEqual(new Set([key]));
  expect(counts(s.kids[0].id)).toEqual({ jobs: 5, attempts: 5 });
  await kid.dispose(); await s.r.dispose();
});

test("held, Python errors, refusals by mode and archive, and a shared computer", async ({ page, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const s = await setup(playwright, { allowed: ["python", "blocks", "mixed"], start: "python", switching: "free" }, 2);
  await signIn(page, s.kids[0].login);
  await page.goto(`/#assignment/${s.assignment.id}`);

  // A Python syntax error is accepted and checked: a finished result, not a refusal or a lost connection.
  await page.locator("#python-answer").fill("print(");
  await expect(page.getByText("Сохранено на сервере", { exact: true })).toBeVisible();
  await checkButton(page).click();
  await expect(page.locator(".console")).toContainText("Не закрыт вызов функции", { timeout: 15000 });
  await expect(page.getByTestId("submission-notice")).toHaveCount(0);
  expect(counts(s.kids[0].id)).toEqual({ jobs: 1, attempts: 1 });

  // An accepted check held for environment confirmation keeps its snapshot; the editor stays a draft.
  db((d) => {
    const done = d.prepare("SELECT * FROM submission_jobs WHERE user_id=?").get(s.kids[0].id) as Record<string, unknown>;
    d.prepare("INSERT INTO submission_jobs(id,org_id,user_id,task_id,request_key,code,snapshot,status,result,created_at,updated_at,assignment_id,version_id,mode,source,translator,policy) VALUES(?,?,?,?,?,?,?,'held',?,?,?,?,?,?,?,?,?)")
      .run(`held-${s.tag}`, done.org_id as string, done.user_id as string, done.task_id as string, `held-key-${s.tag}`, "print(7)", done.snapshot as string, JSON.stringify({ status: "held", reason: "runtime_unconfirmed", message: "Решение принято и сохранено. Kodik обновил проверяющую среду — результат появится после подтверждения. Это не ошибка вашей программы." }), new Date().toISOString(), new Date().toISOString(), done.assignment_id as string, done.version_id as string, "python", null, null, null);
  });
  await page.evaluate(([k, id, key]) => localStorage.setItem(k, JSON.stringify({ request_key: key, mode: "python", code: "print(7)", jobId: id, sent_at: new Date().toISOString() })), [`kodik:submission:${s.org}:${s.kids[0].id}:${s.assignment.id}`, `held-${s.tag}`, `held-key-${s.tag}`] as const);
  const sent = submissions(page);
  await page.reload();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "held");
  await expect(page.getByTestId("submission-notice")).toContainText("В редакторе сейчас черновик");
  await expect(page.getByRole("button", { name: "Решение принято — результат появится позже", exact: true })).toBeDisabled();
  await page.locator("#python-answer").fill("print(7) # черновик");
  await expect(page.getByText("Сохранено на сервере", { exact: true })).toBeVisible();
  expect(sent, "no new submission while an accepted one waits").toHaveLength(0);
  db((d) => d.prepare("UPDATE submission_jobs SET status='completed',result=(SELECT result FROM submission_jobs WHERE user_id=? AND status='completed' LIMIT 1),updated_at=? WHERE id=?").run(s.kids[0].id, new Date().toISOString(), `held-${s.tag}`));
  await expect(page.getByTestId("submission-notice")).toHaveCount(0, { timeout: 30000 });
  await expect(checkButton(page)).toBeEnabled();

  // The teacher closes Python for this learner: the refusal explains it and frees the page.
  await call(s.r, `/assignments/${s.assignment.id}/mode-policy`, { allowed: ["blocks", "mixed"], start: "blocks", switching: "teacher" }, "PUT");
  const before = counts(s.kids[0].id);
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "refused");
  await expect(page.getByTestId("submission-notice")).toContainText("Решение не принято на проверку");
  expect(counts(s.kids[0].id)).toEqual(before);
  await call(s.r, `/assignments/${s.assignment.id}/mode-policy`, { allowed: ["python", "blocks", "mixed"], start: "python", switching: "free" }, "PUT");

  // Archived group: refused with the reason; nothing is resent.
  await call(s.r, `/groups/${s.group.id}/archive`, { archived: true });
  sent.length = 0;
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toContainText("архив");
  await page.waitForTimeout(4000);
  expect(sent).toHaveLength(1);
  expect(counts(s.kids[0].id)).toEqual(before);
  await call(s.r, `/groups/${s.group.id}/archive`, { archived: false });
  await expect(page.getByTestId("view-only-note")).toHaveCount(0, { timeout: 12000 });

  // Shared computer: Маша's unconfirmed operation is never sent as Лёва; it completes when Маша returns.
  await page.locator("#python-answer").fill("print(7)");
  await expect(page.getByText("Сохранено на сервере", { exact: true })).toBeVisible();
  await page.context().setOffline(true);
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
  // The connection returns but the answers keep getting lost: acceptance stays unknown.
  await page.route("**/api/tasks/*/submissions", (route) => route.abort("failed"));
  await page.context().setOffline(false);
  const mashaKey = JSON.parse((await storedOp(page, s, 0))!).request_key;
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page.unroute("**/api/tasks/*/submissions");
  sent.length = 0;
  await signIn(page, s.kids[1].login, "Лёва");
  await page.goto(`/#assignment/${s.assignment.id}`);
  await expect(checkButton(page)).toBeEnabled();
  await page.waitForTimeout(3000);
  expect(sent, "Лёва's page sends nothing of Маша's").toHaveLength(0);
  expect(counts(s.kids[1].id)).toEqual({ jobs: 0, attempts: 0 });
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await signIn(page, s.kids[0].login);
  await page.goto(`/#assignment/${s.assignment.id}`);
  await expect(page.getByText("Отлично! Все тесты пройдены.", { exact: true })).toBeVisible({ timeout: 20000 });
  expect(sent.map((x) => x.key)).toEqual([mashaKey]);
  await s.r.dispose();
});
