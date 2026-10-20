import { test, expect, type Page, type APIRequestContext, type Request, type Route, type BrowserContext } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
// Audit of 32fc6fd. (1) On a shared computer Аня's old tab repeated her unconfirmed operation after Боря
// had signed in from a neighbouring tab: the server took it as Боря's new check, with Аня's code and key.
// (2) A submission or a result request that never answered kept the workplace locked without a limit.
// These scenarios use the real school API, two tabs of one browser (one cookie jar), and look at both
// learners' data: Аня keeps exactly one accepted check, Боря gets no foreign check, attempt or draft.
const password = "Submission-owner-321!";
const origin = "http://127.0.0.1:4186";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST", expected = 200) {
  const res = await r.fetch(origin + "/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: origin, "X-Kodik-Client": "2" }, data: body });
  const data = await res.json();
  expect(res.status(), `${path}: ${JSON.stringify(data)}`).toBe(expected);
  return data;
}
function db<T>(fn: (d: DatabaseSync) => T): T { const d = new DatabaseSync("work/browser-test.sqlite"); try { d.exec("PRAGMA busy_timeout=5000"); return fn(d); } finally { d.close(); } }
const n = (d: DatabaseSync, sql: string, ...args: string[]) => (d.prepare(sql).get(...args) as { n: number }).n;
/** Everything of one learner that a foreign operation could create. */
const footprint = (userId: string) => db((d) => ({
  jobs: n(d, "SELECT COUNT(*) n FROM submission_jobs WHERE user_id=?", userId),
  attempts: n(d, "SELECT COUNT(*) n FROM attempts WHERE user_id=?", userId),
  drafts: n(d, "SELECT COUNT(*) n FROM assignment_drafts WHERE user_id=?", userId) + n(d, "SELECT COUNT(*) n FROM assignment_block_drafts WHERE user_id=?", userId),
}));
const draftOf = (userId: string) => db((d) => (d.prepare("SELECT code FROM assignment_drafts WHERE user_id=?").get(userId) as { code: string } | undefined)?.code);

type Kid = { id: string; login: string; name: string };
type Setup = { r: APIRequestContext; tag: string; org: string; task: { id: string }; assignment: { id: string }; anya: Kid; borya: Kid };
async function setup(playwright: { request: { newContext: () => Promise<APIRequestContext> } }): Promise<Setup> {
  const tag = crypto.randomUUID().slice(0, 8), r = await playwright.request.newContext();
  const reg = await call(r, "/auth/register", { school: `Owner ${tag}`, name: "Учитель", login: `own-${tag}`, password });
  const course = await call(r, "/courses", { title: "C" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const task = await call(r, "/tasks", { lesson_id: lesson.id, title: "Напечатай семь", description: "", goal: "Вывод", theory: "", instruction: "Выведи число 7", difficulty: "easy", starter: "", hints: [], check_mode: "tests", tests: [{ inputs: [], expected: "7", hidden: false }], reference_solution: "print(7)", wrong_solutions: ["print(8)"] });
  const row = (await call(r, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
  expect((await call(r, `/tasks/${task.id}/verify`, { revision: row.revision })).status).toBe("approved");
  await call(r, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const group = await call(r, "/groups", { title: "5Б" }), kids: Kid[] = [];
  for (const name of ["Аня", "Боря"]) { const login = `own-${name === "Аня" ? "anya" : "borya"}-${tag}`, u = await call(r, "/users", { name, login, password, role: "student" }); await call(r, `/groups/${group.id}/members`, { user_id: u.id }); kids.push({ id: u.id, login, name }); }
  // One assignment shared by both children: the ordinary access check passes for either of them.
  const assignment = await call(r, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id });
  return { r, tag, org: reg.user.org_id, task, assignment, anya: kids[0], borya: kids[1] };
}
async function signIn(page: Page, kid: Kid) {
  await page.getByLabel("Логин", { exact: true }).fill(kid.login);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole("heading", { name: `Привет, ${kid.name}!` })).toBeVisible();
}
/** The neighbouring tab: Аня signs out there and Боря signs in, as children do at a shared computer. */
async function switchTo(page: Page, kid: Kid) {
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await signIn(page, kid);
}
function submissions(page: Page) {
  const sent: { key: string; body: Record<string, unknown>; at: number }[] = [];
  page.on("request", (q: Request) => { if (q.method() === "POST" && /\/api\/tasks\/[^/]+\/submissions$/.test(q.url())) { const body = q.postDataJSON(); sent.push({ key: body.request_key, body, at: Date.now() }); } });
  return sent;
}
const storedOp = (page: Page, s: Setup, kid: Kid) => page.evaluate((k) => localStorage.getItem(k), `kodik:submission:${s.org}:${kid.id}:${s.assignment.id}`);
const checkButton = (page: Page) => page.getByRole("button", { name: "Проверить решение", exact: true });
const passed = (page: Page) => page.getByText("Отлично! Все проверки пройдены.", { exact: true });
async function openTask(page: Page, s: Setup, code: string) {
  await page.goto(`/#assignment/${s.assignment.id}`);
  await page.locator("#python-answer").fill(code);
  await expect(page.getByText("✓ Сохранено", { exact: true })).toBeVisible();
}
/** Аня's tab and the neighbouring tab, both signed in as Аня in one browser. */
async function twoTabs(context: BrowserContext, page: Page, s: Setup) {
  await page.goto("/"); await signIn(page, s.anya);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "Привет, Аня!" })).toBeVisible();
  return other;
}
/** Lose the answer after the server has really accepted Аня's solution. */
const loseAnswer = async (route: Route) => { await route.fetch(); await route.abort("failed"); };

test("old tab: Аня's unconfirmed operation is not repeated as Боря's after he signs in from the neighbouring tab", async ({ page, context, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const s = await setup(playwright);
  const other = await twoTabs(context, page, s);
  await openTask(page, s, "print(7)");
  const sentA = submissions(page), sentB = submissions(other);
  // Ordinary tabs: nothing in this tab is stopped or slowed. Start right after its regular refresh,
  // so that the automatic repeat comes before the next one, as it does in a busy classroom.
  await page.waitForResponse((res) => res.url().endsWith("/api/state"));
  await page.route("**/api/tasks/*/submissions", loseAnswer, { times: 1 });
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
  const anyaKey = JSON.parse((await storedOp(page, s, s.anya))!).request_key;
  await switchTo(other, s.borya);
  // Long enough for every automatic repeat and refresh of Аня's tab.
  await page.waitForTimeout(9000);
  expect(footprint(s.borya.id), "Боря got no check, attempt or draft from Аня's tab").toEqual({ jobs: 0, attempts: 0, drafts: 0 });
  expect(footprint(s.anya.id)).toEqual({ jobs: 1, attempts: 1, drafts: 1 });
  expect(db((d) => n(d, "SELECT COUNT(*) n FROM submission_jobs WHERE request_key=?", anyaKey)), "Аня's key belongs to one check").toBe(1);
  // Аня's tab says which account is open now, and keeps her operation under her own record.
  await expect(page.getByTestId("account-switched")).toContainText("Боря");
  await expect(page.getByTestId("account-switched")).toContainText("Аня");
  expect(JSON.parse((await storedOp(page, s, s.anya))!).request_key).toBe(anyaKey);
  expect(sentA.filter((x) => x.key !== anyaKey)).toHaveLength(0);
  // Боря's own tab works normally and shows his own empty task, not Аня's code.
  await other.goto(`/#assignment/${s.assignment.id}`);
  await expect(other.locator("#python-answer")).toHaveValue("");
  expect(sentB).toHaveLength(0);
  await page.screenshot({ path: "work/account-switched-1366.png", fullPage: true });
  // Keyboard: the only action of the old tab opens the current account; Боря's session is kept.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Привет, Боря!" })).toBeVisible();
  await expect(other.getByRole("heading", { name: "Напечатай семь" }).first()).toBeVisible();
  // Аня comes back: her accepted work is recovered by the same key, without a new check or attempt.
  await switchTo(other, s.anya);
  await other.goto(`/#assignment/${s.assignment.id}`);
  await expect(passed(other)).toBeVisible({ timeout: 20000 });
  expect(sentB.map((x) => x.key)).toEqual([anyaKey]);
  expect(footprint(s.anya.id)).toEqual({ jobs: 1, attempts: 1, drafts: 1 });
  expect(footprint(s.borya.id)).toEqual({ jobs: 0, attempts: 0, drafts: 0 });
  expect(await storedOp(other, s, s.anya)).toBeNull();
  await s.r.dispose();
});

test("server protection alone: delayed refresh, no cross-tab notice, Аня's unsaved draft and an earlier-release tab", async ({ page, context, playwright }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const s = await setup(playwright);
  // This tab never hears about the other tab, and its refresh of the account answers late.
  await page.addInitScript(() => { const add = window.addEventListener; window.addEventListener = function (this: Window, type: string, ...rest: unknown[]) { if (type === "storage") return; return (add as (...a: unknown[]) => void).call(this, type, ...rest); } as typeof window.addEventListener; });
  const other = await twoTabs(context, page, s);
  await openTask(page, s, "print(7)");
  const sentA = submissions(page);
  await page.route("**/api/state", async (route) => { await new Promise((r) => setTimeout(r, 20000)); await route.continue().catch(() => {}); });
  await page.route("**/api/tasks/*/submissions", loseAnswer, { times: 1 });
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
  // Аня keeps typing; the draft is saved only on this computer while the session belongs to Боря.
  const refusals: string[] = [];
  page.on("response", async (res) => { if (res.status() === 409 && /\/(draft|submissions)$/.test(res.url())) refusals.push((await res.json()).code); });
  await switchTo(other, s.borya);
  await page.locator("#python-answer").fill("print(7) # Аня ещё пишет");
  // The draft save goes out under Боря's session, still naming Аня: the server refuses it, and the tab
  // learns of the switch from that answer alone.
  await page.waitForTimeout(8000);
  expect(footprint(s.borya.id), "Боря got no check, attempt or draft from Аня's tab").toEqual({ jobs: 0, attempts: 0, drafts: 0 });
  expect(refusals[0]).toBe("owner_mismatch");
  await expect(page.getByTestId("account-switched")).toContainText("Боря");
  expect(footprint(s.anya.id)).toEqual({ jobs: 1, attempts: 1, drafts: 1 });
  expect(draftOf(s.anya.id)).toBe("print(7)");
  expect(new Set(sentA.map((x) => x.key)).size).toBeLessThanOrEqual(1);
  // Neither the operation nor the newest draft is lost: both stay under Аня's own keys on this computer.
  const anyaKey = JSON.parse((await storedOp(page, s, s.anya))!).request_key;
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null")?.code, `kodik:student-draft:${s.org}:${s.anya.id}:${s.assignment.id}`)).toBe("print(7) # Аня ещё пишет");
  await page.unroute("**/api/state");

  // A tab of the earlier release sends no protocol header and names nobody. Even so it cannot repeat
  // Аня's operation under Боря's session (401 keeps its local record), nor write anything new.
  const legacy = await context.newPage();
  await legacy.route("**/api/**", (route) => { const h = { ...route.request().headers() }; delete h["x-kodik-client"]; delete h["x-kodik-user"]; delete h["x-kodik-org"]; return route.continue({ headers: h }); });
  const replay = await legacy.request.fetch(origin + `/api/tasks/${s.task.id}/submissions`, { method: "POST", headers: { Origin: origin }, data: { mode: "python", code: "print(7)", request_key: anyaKey, assignment_id: s.assignment.id } });
  expect(replay.status()).toBe(401);
  const fresh = await legacy.request.fetch(origin + `/api/tasks/${s.task.id}/draft`, { method: "PUT", headers: { Origin: origin }, data: { code: "print(1)", revision: 0, assignment_id: s.assignment.id } });
  expect(fresh.status()).toBe(409); expect((await fresh.json()).code).toBe("client_outdated");
  await legacy.goto("/");
  await expect(legacy.getByText("Kodik обновился", { exact: false }).first()).toBeVisible();
  expect(footprint(s.borya.id)).toEqual({ jobs: 0, attempts: 0, drafts: 0 });
  // Боря's session is not ended by any of this.
  await other.reload();
  await expect(other.getByRole("heading", { name: "Привет, Боря!" })).toBeVisible();
  await legacy.close();

  // Аня returns in her own tab: the stored operation completes once; her local draft is back in the editor.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Привет, Боря!" })).toBeVisible();
  await switchTo(page, s.anya);
  await page.goto(`/#assignment/${s.assignment.id}`);
  await expect(passed(page)).toBeVisible({ timeout: 20000 });
  await expect(page.locator("#python-answer")).toHaveValue("print(7) # Аня ещё пишет");
  expect(footprint(s.anya.id).attempts).toBe(1);
  await s.r.dispose();
});

test("background tab and network return: Аня's tab stops before it sends anything for Боря", async ({ page, context, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const s = await setup(playwright);
  // A tab in the background does not refresh the account (it is not visible).
  await page.addInitScript(() => { Object.defineProperty(document, "visibilityState", { get: () => "hidden" }); Object.defineProperty(document, "hidden", { get: () => true }); });
  const other = await twoTabs(context, page, s);
  await openTask(page, s, "print(7)");
  const sentA = submissions(page);
  await page.route("**/api/tasks/*/submissions", loseAnswer, { times: 1 });
  await checkButton(page).click();
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
  const anyaKey = JSON.parse((await storedOp(page, s, s.anya))!).request_key;
  // Аня's tab loses the network; meanwhile Боря signs in next door; then the network returns.
  await page.route("**/api/**", (route) => route.abort("internetdisconnected"));
  await switchTo(other, s.borya);
  await context.setOffline(true);
  await page.unroute("**/api/**");
  await context.setOffline(false);
  await page.waitForTimeout(6000);
  expect(footprint(s.borya.id)).toEqual({ jobs: 0, attempts: 0, drafts: 0 });
  expect(footprint(s.anya.id)).toEqual({ jobs: 1, attempts: 1, drafts: 1 });
  expect(sentA.filter((x) => x.at > 0 && x.key === anyaKey).length).toBeLessThanOrEqual(2);
  await expect(page.getByTestId("account-switched")).toBeVisible();
  expect(JSON.parse((await storedOp(page, s, s.anya))!).request_key).toBe(anyaKey);
  await s.r.dispose();
});

test("a hanging answer frees the workplace in time; the accepted check is recovered exactly once", async ({ page, playwright }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const s = await setup(playwright);
  await page.goto("/"); await signIn(page, s.anya);
  await openTask(page, s, "print(7)");
  const sent = submissions(page);
  const notice = page.getByTestId("submission-notice");

  // 1. The server accepted and finished the check, but its answer to the submission hangs.
  let release: (() => Promise<void>) | undefined;
  await page.route("**/api/tasks/*/submissions", async (route) => { const answer = await route.fetch(); await new Promise<void>((r) => { release = async () => { await route.fulfill({ response: answer }).catch(() => {}); r(); }; }); }, { times: 1 });
  const started = Date.now();
  await checkButton(page).click();
  await expect(page.locator("#python-answer")).toBeDisabled();
  await expect(notice).toHaveAttribute("data-kind", "unconfirmed", { timeout: 30000 });
  expect(Date.now() - started, "the wait ends at the client limit (25 s)").toBeLessThan(29000);
  await expect(notice).toContainText("подтверждение пока не получено");
  // The editor is a draft again; the sent snapshot is what will be repeated.
  await page.locator("#python-answer").fill("print(7) # правка после отправки");
  await expect(page.getByRole("button", { name: "▷ Запустить", exact: true })).toBeEnabled();
  await expect(passed(page)).toBeVisible({ timeout: 20000 });
  // The late answer of the first request arrives after recovery has started: it changes nothing.
  await release?.();
  await page.waitForTimeout(1500);
  expect(new Set(sent.map((x) => x.key)).size).toBe(1);
  expect(sent.every((x) => x.body.code === "print(7)")).toBe(true);
  expect(footprint(s.anya.id)).toMatchObject({ jobs: 1, attempts: 1 });
  await expect(page.locator("#python-answer")).toHaveValue("print(7) # правка после отправки");

  // 2. The submission hangs before the server has accepted it; after the limit the same program is
  // sent again with the same key, and the network answering again brings exactly one result.
  sent.length = 0;
  await page.locator("#python-answer").fill("print(8)");
  await expect(page.getByText("✓ Сохранено", { exact: true })).toBeVisible();
  await page.route("**/api/tasks/*/submissions", () => new Promise<void>(() => {}), { times: 1 });
  await checkButton(page).click();
  await expect(notice).toHaveAttribute("data-kind", "unconfirmed", { timeout: 30000 });
  expect(footprint(s.anya.id).jobs, "not accepted yet").toBe(1);
  await expect(page.getByText("Нужны исправления", { exact: false }).or(page.getByText("Ожидается", { exact: false })).first()).toBeVisible({ timeout: 20000 });
  expect(sent.length).toBe(2);
  expect(new Set(sent.map((x) => x.key)).size).toBe(1);
  expect(sent.every((x) => x.body.code === "print(8)")).toBe(true);
  expect(footprint(s.anya.id)).toMatchObject({ jobs: 2, attempts: 2 });

  // 3. The check is accepted, but reading its result hangs: no new submission, the same check is asked again.
  sent.length = 0;
  await page.locator("#python-answer").fill("print(7)");
  await expect(page.getByText("✓ Сохранено", { exact: true })).toBeVisible();
  await page.route("**/api/tasks/*/submissions", async (route) => { const answer = await route.fetch(); const body = await answer.json(); await route.fulfill({ response: answer, json: { ...body, status: "queued", result: null } }); }, { times: 1 });
  await page.route("**/api/submissions/*", () => new Promise<void>(() => {}), { times: 1 });
  await checkButton(page).click();
  await expect(notice).toHaveAttribute("data-kind", "reconnecting", { timeout: 15000 });
  await expect(notice).toContainText("сервер долго не отдаёт результат");
  await expect(page.locator("#python-answer")).toBeEnabled();
  const ask = page.getByRole("button", { name: "Узнать результат сейчас", exact: true });
  await ask.focus(); await page.keyboard.press("Enter");
  await expect(passed(page)).toBeVisible({ timeout: 15000 });
  await page.locator("#python-answer").fill("print(7) # черновик");
  expect(sent).toHaveLength(1);
  expect(footprint(s.anya.id)).toMatchObject({ jobs: 3, attempts: 3 });
  await page.screenshot({ path: "work/submission-timeout-1366.png", fullPage: true });
  await s.r.dispose();
});

test("a hanging submission and an account switch next door at 1920: nothing reaches Боря, Аня's check stays hers", async ({ page, context, playwright }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const s = await setup(playwright);
  // Аня's tab hears nothing from the other tab and refreshes late: only the server can stop it.
  await page.addInitScript(() => { const add = window.addEventListener; window.addEventListener = function (this: Window, type: string, ...rest: unknown[]) { if (type === "storage") return; return (add as (...a: unknown[]) => void).call(this, type, ...rest); } as typeof window.addEventListener; });
  const other = await twoTabs(context, page, s);
  await openTask(page, s, "print(7)");
  const sentA = submissions(page);
  // Every background read of this tab (account, help, recommendations) answers late, so the switch can
  // reach it only through the repeat of the submission itself.
  const late = async (route: Route) => { if (route.request().method() !== "GET" || route.request().url().includes("/api/submissions/")) return route.fallback(); await new Promise((r) => setTimeout(r, 60000)); await route.continue().catch(() => {}); };
  await page.route("**/api/**", late);
  await page.route("**/api/tasks/*/submissions", async (route) => { await route.fetch(); await new Promise(() => {}); }, { times: 1 });
  const started = Date.now();
  await checkButton(page).click();
  await expect(page.getByTestId("submission-state")).toHaveAttribute("data-phase", "sending");
  const anyaKey = JSON.parse((await storedOp(page, s, s.anya))!).request_key;
  await switchTo(other, s.borya);
  // The hanging answer stops holding the page at the limit…
  await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed", { timeout: 30000 });
  expect(Date.now() - started).toBeLessThan(29000);
  // …and the repeat that follows names Аня, so Боря's session refuses it and the tab stops.
  const refused = await page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/submissions"), { timeout: 15000 });
  expect(refused.status()).toBe(409); expect((await refused.json()).code).toBe("owner_mismatch");
  await expect(page.getByTestId("account-switched")).toContainText("Боря");
  await page.waitForTimeout(8000);
  expect(footprint(s.borya.id)).toEqual({ jobs: 0, attempts: 0, drafts: 0 });
  expect(footprint(s.anya.id)).toEqual({ jobs: 1, attempts: 1, drafts: 1 });
  expect(sentA.map((x) => x.key)).toEqual([anyaKey, anyaKey]);
  expect(JSON.parse((await storedOp(page, s, s.anya))!).request_key).toBe(anyaKey);
  await page.screenshot({ path: "work/account-switched-1920.png", fullPage: true });
  await page.unroute("**/api/**", late);
  // Back as Аня in the neighbouring tab: the same check, by the same key.
  await switchTo(other, s.anya);
  await other.goto(`/#assignment/${s.assignment.id}`);
  await expect(passed(other)).toBeVisible({ timeout: 20000 });
  expect(footprint(s.anya.id)).toEqual({ jobs: 1, attempts: 1, drafts: 1 });
  await s.r.dispose();
});
