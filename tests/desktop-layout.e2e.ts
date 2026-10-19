import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
// Audit item: school desktops — 1366×768 and 1920×1080, also with Windows scaling 125% and 150%
// (the browser then has a smaller CSS viewport). Teacher screens used during a lesson must fit
// without horizontal scrolling, keep their main action reachable and unobscured, and show the same
// freshness state.
const password = "Desktop-layout-test-321!";
const SCREENS = [
  { name: "1366x768", viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 },
  { name: "1920x1080", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  { name: "1366x768@125%", viewport: { width: 1093, height: 614 }, deviceScaleFactor: 1.25 },
  { name: "1920x1080@125%", viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 },
  { name: "1920x1080@150%", viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 },
];
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST", expected = 200) {
  const res = await r.fetch("http://127.0.0.1:4186/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await res.json();
  expect(res.status(), JSON.stringify(data)).toBe(expected);
  return data;
}
async function fits(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label}: horizontal scroll`).toBeLessThanOrEqual(0);
}
async function reachable(page: Page, button: ReturnType<Page["getByRole"]>, label: string) {
  await button.scrollIntoViewIfNeeded();
  await expect(button, label).toBeVisible();
  const free = await button.evaluate((e) => { const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && e.contains(hit) && r.right <= window.innerWidth && r.left >= 0; });
  expect(free, `${label}: covered or cut off`).toBeTruthy();
}

let tag = "", owner = "", admin = "", student = "", assignmentId = "";
test.beforeAll(async ({ playwright }) => {
  tag = crypto.randomUUID().slice(0, 8);
  const r = await playwright.request.newContext();
  const reg = await call(r, "/auth/register", { school: `Desk ${tag}`, name: "Учитель", login: (admin = `desk-${tag}`), password });
  const course = await call(r, "/courses", { title: "C" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const task = await call(r, "/tasks", { lesson_id: lesson.id, title: "Выведи 42", description: "", goal: "Вывод", theory: "", instruction: "Выведи 42", difficulty: "easy", starter: "", hints: [], check_mode: "output", tests: [{ inputs: [], expected: "42", hidden: false }], reference_solution: "print(42)", wrong_solutions: ["print(41)"] });
  const row = (await call(r, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
  await call(r, `/tasks/${task.id}/verify`, { revision: row.revision });
  await call(r, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const kid = await call(r, "/users", { name: "Ученик с длинным именем Константинопольский", login: (student = `desk-kid-${tag}`), password, role: "student" });
  const group = await call(r, "/groups", { title: "7А — информатика, вторая подгруппа" });
  await call(r, `/groups/${group.id}/members`, { user_id: kid.id });
  assignmentId = (await call(r, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id, mode_policy: { allowed: ["python"], start: "python", switching: "free" } })).id;
  await call(r, "/auth/logout", {});
  await call(r, "/auth/login", { login: student, password });
  await call(r, `/tasks/${task.id}/submissions`, { assignment_id: assignmentId, code: "print(41)", request_key: crypto.randomUUID() });
  await call(r, "/help", { assignment_id: assignmentId, message: "Не понимаю, почему тест не проходит" });
  await call(r, "/auth/logout", {});
  const o = await call(r, "/auth/register", { school: `Desk owner ${tag}`, name: "Владелец", login: (owner = `desk-owner-${tag}`), password });
  const db = new DatabaseSync("work/browser-test.sqlite");
  try { db.prepare("UPDATE users SET platform_owner=1 WHERE id=?").run(o.user.id); } finally { db.close(); }
  void reg;
  await r.dispose();
});

for (const screen of SCREENS) test(`desktop ${screen.name}: lesson screens fit, actions reachable, same freshness state`, async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4186", viewport: screen.viewport, deviceScaleFactor: screen.deviceScaleFactor });
  const page = await context.newPage();
  try {
    await call(context.request, "/auth/login", { login: admin, password });
    const teacherScreens: [string, string, string | RegExp, RegExp][] = [
      ["journal", "Журнал и ручная проверка", /Выведи 42 · версия/, /Журнал обновлён в/],
      ["classroom", "Помощь на занятии", "Помощь оказана", /Запросы обновлены в/],
      ["modes", "Способы решения", "Сохранить разрешения", /Данные обновлены в/],
      ["school", "Управление школой", "Проверить список", /./],
    ];
    for (const [hash, heading, action, fresh] of teacherScreens) {
      await page.goto(`/#${hash}`);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      if (hash !== "school") await expect(page.getByRole("status").filter({ hasText: fresh }).first()).toBeVisible();
      await fits(page, `${screen.name} ${hash}`);
      await reachable(page, page.getByRole("button", { name: action }).first(), `${screen.name} ${hash}`);
      await reachable(page, page.getByRole("button", { name: "Обновить данные" }), `${screen.name} ${hash} refresh`);
    }
    await page.goto("/#classroom");
    await page.getByRole("button", { name: "Помощь оказана" }).first().click();
    await expect(page.getByRole("status").filter({ hasText: /Помощь ученику .* отмечена/ })).toBeVisible();
    await page.screenshot({ path: `work/desktop-${screen.name.replace("%", "pct")}-classroom.png` });
    // Re-open the request for the next screen size.
    await call(context.request, "/auth/logout", {});

    // Learner workspace: the check button is reachable at this size.
    await call(context.request, "/auth/login", { login: student, password });
    await page.goto(`/#assignment/${assignmentId}`);
    await expect(page.locator(".coding-panel textarea").first()).toBeVisible();
    await fits(page, `${screen.name} learner`);
    await reachable(page, page.getByRole("button", { name: /Проверить решение/ }), `${screen.name} learner check`);
    await page.getByText("Нужна помощь").click();
    await page.getByLabel("Что не получается?").fill("Снова нужна помощь");
    await page.getByRole("button", { name: "Позвать преподавателя" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Учитель увидит твой запрос" })).toBeVisible();
    await call(context.request, "/auth/logout", {});

    // Owner cabinet.
    await call(context.request, "/auth/login", { login: owner, password });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Клиенты и лицензии", exact: true })).toBeVisible();
    await fits(page, `${screen.name} owner`);
    await reachable(page, page.getByRole("button", { name: "Добавить компанию" }), `${screen.name} owner add`);
    await page.screenshot({ path: `work/desktop-${screen.name.replace("%", "pct")}-owner.png` });
  } finally { await context.close(); }
});
