import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
// Recommendation lifecycle in the teacher's and the learner's screens: a proposal or a SENT offer whose
// settings changed is closed with a reason, its invitation disappears, the next proposal appears, and a
// live offer stays reachable whatever the volume of other groups' history.
const password = "Rec-lifecycle-test-321!";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST", expected = 200) {
  const res = await r.fetch("http://127.0.0.1:4186/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await res.json();
  expect(res.status(), JSON.stringify(data)).toBe(expected);
  return data;
}
const ws = (n: number) => ({ blocks: { languageVersion: 0, blocks: [{ type: "text_print", id: "p", x: 10, y: 10, inputs: { TEXT: { block: { type: "math_number", id: "pn", fields: { NUM: n } } } } }] } });
type Made = { t: { id: string }; a: { id: string }; n: number };
async function school(playwright: { request: { newContext: () => Promise<APIRequestContext> } }, tag: string, groupTitle = "6А") {
  const r = await playwright.request.newContext(), kid = await playwright.request.newContext();
  await call(r, "/auth/register", { school: `Rec ${tag}`, name: "Учитель", login: `rec-${tag}`, password });
  const course = await call(r, "/courses", { title: "C" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const learner = await call(r, "/users", { name: "Петя", login: `rec-kid-${tag}`, password, role: "student" });
  const group = await call(r, "/groups", { title: groupTitle });
  await call(r, `/groups/${group.id}/members`, { user_id: learner.id });
  await call(kid, "/auth/login", { login: `rec-kid-${tag}`, password });
  let n = 10;
  const make = async (g = group): Promise<Made> => {
    n++;
    const t = await call(r, "/tasks", { lesson_id: lesson.id, title: `Число ${n}`, description: "", goal: "Вывод", theory: "", instruction: `Выведи ${n}`, difficulty: "easy", starter: "", hints: [], check_mode: "tests", tests: [{ inputs: [], expected: String(n), hidden: false }], reference_solution: `print(${n})`, wrong_solutions: ["print(0)"], learning_config: { modes: ["blocks", "mixed"], palette: ["text_print", "math_number"], skills: ["output"] }, block_solution: ws(n) });
    const row = (await call(r, "/state")).tasks.find((x: { id: string }) => x.id === t.id);
    await call(r, `/tasks/${t.id}/verify`, { revision: row.revision }); await call(r, `/tasks/${t.id}/publish`, { published: true, revision: row.revision });
    const a = await call(r, "/assignments", { request_key: crypto.randomUUID(), group_id: g.id, task_id: t.id, mode_policy: { allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "teacher" } });
    return { t, a, n };
  };
  const solve = async (x: Made) => {
    let job = await call(kid, `/tasks/${x.t.id}/submissions`, { mode: "blocks", workspace: ws(x.n), assignment_id: x.a.id, request_key: crypto.randomUUID() });
    for (let i = 0; i < 100 && job.status !== "completed"; i++) { await new Promise((res) => setTimeout(res, 50)); job = await call(kid, `/submissions/${job.id}`); }
    expect(job.result.status).toBe("passed");
  };
  await solve(await make()); await solve(await make());
  return { r, kid, learner, group, make, solve };
}
async function signIn(page: Page, login: string) {
  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(login);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
}
const lock = { override: { allowed: ["blocks"], start: "blocks", switching: "locked" }, reason: "Закрепляем блоки" };

test("teacher: a sent offer loses force with a reason, its invitation disappears, the next proposal appears", async ({ page, browser, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const tag = crypto.randomUUID().slice(0, 8), s = await school(playwright, tag);
  const A = await s.make();
  await signIn(page, `rec-${tag}`);
  await expect(page.getByRole("heading", { name: "Привет, Учитель!" })).toBeVisible();
  await page.getByRole("link", { name: "Способы решения" }).click();
  const live = page.locator("section.recommendations"), history = page.locator("section.recommendations-history");
  const card = live.getByTestId("recommendation-card").filter({ hasText: "Петя" });
  await expect(card).toHaveCount(1);
  // The card names the learner, the group, the concrete assignment and the transition.
  await expect(card).toContainText("6А");
  await expect(card).toContainText(`«Число ${A.n}»`);
  await expect(card).toContainText("Блоки → Блоки + Python");
  await expect(card).toContainText("Ждёт решения преподавателя");
  await card.getByRole("button", { name: /^Предложить ученику Петя/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Предложение отправлено ученику Петя" })).toBeVisible();
  await expect(card).toContainText("Отправлено ученику · ждёт его решения");

  // The learner sees the invitation and its basis in the task workspace.
  const childContext = await browser.newContext({ baseURL: "http://127.0.0.1:4186", viewport: { width: 1366, height: 768 } }), child = await childContext.newPage();
  await signIn(child, `rec-kid-${tag}`);
  await expect(child.getByRole("heading", { name: "Привет, Петя!" })).toBeVisible();
  await child.goto(`/#assignment/${A.a.id}`);
  await expect(child.locator(".mode-offer")).toContainText("Учитель предлагает перейти в режим «Блоки + Python»");
  await expect(child.locator(".mode-offer")).toContainText("Свежие успешные решения");

  // The teacher locks the mode in this assignment (another tab): the offer is withdrawn with its reason.
  await call(s.r, `/assignments/${A.a.id}/students/${s.learner.id}/mode`, lock, "PUT");
  const closed = history.getByTestId("recommendation-card").filter({ hasText: `«Число ${A.n}»` });
  await expect(closed).toContainText("Снято: основания или настройки изменились", { timeout: 12000 });
  await expect(closed).toContainText("Причина: Преподаватель закрепил режим ученика.");
  await expect(live.getByTestId("recommendation-card")).toHaveCount(0);
  await expect(live).toContainText("Сейчас действующих предложений нет.");
  await expect(child.locator(".mode-offer")).toHaveCount(0, { timeout: 12000 });

  // A new suitable task gets a proposal on the ordinary refresh; returning permissions restores nothing.
  const B = await s.make();
  const next = live.getByTestId("recommendation-card").filter({ hasText: `«Число ${B.n}»` });
  await expect(next).toBeVisible({ timeout: 12000 });
  await call(s.r, `/assignments/${A.a.id}/students/${s.learner.id}/mode`, { clear_override: true }, "PUT");
  await child.reload();
  await expect(child.getByRole("radiogroup", { name: "Способ решения" })).toBeVisible();
  await expect(child.locator(".mode-offer")).toHaveCount(0);

  // "Показать назначение" switches the teacher's assignment to the card's one; keyboard reaches the action.
  await next.getByRole("button", { name: "Показать назначение" }).click();
  await expect(page.getByLabel("Назначение", { exact: true })).toBeFocused();
  await expect(next).toContainText("Это назначение выбрано выше");
  const reject = next.getByRole("button", { name: /^Отклонить предложение для Петя/ });
  // Reached from the keyboard, the action shows a visible focus ring.
  await reject.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(reject).toBeFocused();
  expect(await reject.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(history.getByTestId("recommendation-card").filter({ hasText: `«Число ${B.n}»` })).toContainText("Отклонено преподавателем");
  await page.screenshot({ path: "work/recommendation-lifecycle-1366.png", fullPage: true });

  // A stale proposal fails confirmation with a reason and leaves no active card.
  const C = await s.make();
  const third = live.getByTestId("recommendation-card").filter({ hasText: `«Число ${C.n}»` });
  await expect(third).toBeVisible({ timeout: 12000 });
  await call(s.r, `/assignments/${C.a.id}/students/${s.learner.id}/mode`, lock, "PUT");
  await third.getByRole("button", { name: /^Предложить ученику Петя/ }).click();
  await expect(page.getByRole("alert")).toContainText(/разрешите его вручную|уже не действует/);
  await expect(live.getByTestId("recommendation-card")).toHaveCount(0);
  await childContext.close(); await s.r.dispose(); await s.kid.dispose();
});

test("volume: a live offer of group A stays visible and withdrawable beside 230 closed proposals of group B", async ({ page, browser, playwright }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const tag = crypto.randomUUID().slice(0, 8), s = await school(playwright, tag, "Группа A");
  const A = await s.make();
  const rec = (await call(s.r, "/recommendations")).active.items.find((x: { assignment_id: string }) => x.assignment_id === A.a.id);
  await call(s.r, `/recommendations/${rec.id}/approve`, {});
  // Group B with its own learner and 230 newer closed recommendations.
  const groupB = await call(s.r, "/groups", { title: "Группа B" }), other = await call(s.r, "/users", { name: "Оля", login: `rec-b-${tag}`, password, role: "student" });
  await call(s.r, `/groups/${groupB.id}/members`, { user_id: other.id });
  const B = await s.make(groupB);
  const db = new DatabaseSync("work/browser-test.sqlite");
  try {
    db.exec("PRAGMA busy_timeout=5000");
    const later = new Date(Date.now() + 60000).toISOString(), org = (db.prepare("SELECT org_id FROM users WHERE id=?").get(other.id) as { org_id: string }).org_id;
    const insert = db.prepare("INSERT INTO recommendations(id,org_id,assignment_id,user_id,target_mode,rule_version,basis,status,expires_at,created_at,closed_at,teacher_id,reason) VALUES(?,?,?,?,'mixed',?,?,'dismissed',?,?,?,NULL,'Отклонено преподавателем.')");
    for (let i = 0; i < 230; i++) insert.run(crypto.randomUUID(), org, B.a.id, other.id, `pilot-transition/0.${i}`, JSON.stringify({ reason: "архив", families: [], checks: [], attempts: [] }), later, later, later);
  } finally { db.close(); }

  await signIn(page, `rec-${tag}`);
  await page.getByRole("link", { name: "Способы решения" }).click();
  const live = page.locator("section.recommendations"), history = page.locator("section.recommendations-history");
  await expect(live.getByRole("heading", { name: "Действующие предложения системы: 1" })).toBeVisible();
  const card = live.getByTestId("recommendation-card").filter({ hasText: "Группа A" });
  await expect(card).toContainText("Отправлено ученику · ждёт его решения");
  await expect(history.getByRole("heading", { name: "История предложений: 230" })).toBeVisible();
  await expect(history.getByTestId("recommendation-card")).toHaveCount(10);
  await expect(history.getByText("1–10 из 230")).toBeVisible();
  await history.getByRole("button", { name: "Следующие" }).click();
  await expect(history.getByText("11–20 из 230")).toBeVisible();
  await page.screenshot({ path: "work/recommendation-volume-1920.png", fullPage: true });

  // The learner still receives the offer and its basis.
  const childContext = await browser.newContext({ baseURL: "http://127.0.0.1:4186", viewport: { width: 1920, height: 1080 } }), child = await childContext.newPage();
  await signIn(child, `rec-kid-${tag}`);
  await expect(child.getByRole("heading", { name: "Привет, Петя!" })).toBeVisible();
  await child.goto(`/#assignment/${A.a.id}`);
  await expect(child.locator(".mode-offer")).toContainText("Свежие успешные решения");

  await card.getByRole("button", { name: /^Отозвать предложение для Петя/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "приглашение у ученика снято" })).toBeVisible();
  await expect(live).toContainText("Сейчас действующих предложений нет.");
  await expect(child.locator(".mode-offer")).toHaveCount(0, { timeout: 12000 });
  await childContext.close(); await s.r.dispose(); await s.kid.dispose();
});
