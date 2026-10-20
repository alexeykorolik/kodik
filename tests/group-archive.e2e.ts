import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { taskFixture } from "./helpers/task-fixture.mjs";
// The group is archived from another tab while a learner has the lesson open: the lesson turns into a
// view with a short explanation, late actions are refused by the server, typed work is kept, the teacher
// keeps the journal but cannot open the lesson; restoring the group resumes from the same place.
const password = "Archive-browser-test-321!";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST", expected = 200) {
  if (path === "/tasks" && body) body = taskFixture(body as object);
  const res = await r.fetch("http://127.0.0.1:4186/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await res.json();
  expect(res.status(), `${path}: ${JSON.stringify(data)}`).toBe(expected);
  return data;
}
async function signIn(page: Page, login: string) {
  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(login);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
}

test("archiving the group during an open lesson: view for the learner and teacher, late actions refused, work kept", async ({ page, browser, playwright }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const tag = crypto.randomUUID().slice(0, 8), r = await playwright.request.newContext();
  await call(r, "/auth/register", { school: `Archive ${tag}`, name: "Учитель", login: `arch-${tag}`, password });
  const course = await call(r, "/courses", { title: "Архивный курс" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const learner = await call(r, "/users", { name: "Ира", login: `arch-kid-${tag}`, password, role: "student" }), group = await call(r, "/groups", { title: "5Б" });
  await call(r, `/groups/${group.id}/members`, { user_id: learner.id });
  const material = async (title: string, expected: string) => { const t = await call(r, "/tasks", { lesson_id: lesson.id, title, description: "", goal: "Вывод", theory: "", instruction: `Выведи ${expected}`, difficulty: "easy", starter: "", hints: [], check_mode: "output", tests: [{ inputs: [], expected, hidden: false }] }); const row = (await call(r, "/state")).tasks.find((x: { id: string }) => x.id === t.id); await call(r, `/tasks/${t.id}/verify`, { revision: row.revision }); await call(r, `/tasks/${t.id}/publish`, { published: true, revision: row.revision }); return t; };
  const practice = await material("Выведи 42", "42"), final = await material("Выведи 43", "43");
  await call(r, `/lesson-content/${lesson.id}`, { title: "Вывод значения", goal: "Показать значение", description: "", duration: 40, teacher_notes: "", revision: 1, steps: [
    { id: "text", type: "text", title: "Объяснение", body: "print выводит значение." },
    { id: "code", type: "code", title: "Пример", body: "Одна команда.", code: "print(42)" },
    { id: "practice", type: "practice", title: "Практика", body: "Выведи 42", task_id: practice.id },
    { id: "question", type: "question", title: "Вопрос", body: "Что выведет print(42)?", choices: ["42", "43"], correct_index: 0, explanation: "Верно." },
    { id: "final", type: "final", title: "Итоговая работа", body: "Выведи 43", task_id: final.id },
    { id: "summary", type: "summary", title: "Итог", body: "Готово." }] }, "PUT");
  await call(r, `/lesson-content/${lesson.id}/publish`, { revision: 2 });
  const body = { group_id: group.id, scope: "course", source_id: course.id, request_key: `archive-${tag}-program` }, preview = await call(r, "/programs/preview", body);
  await call(r, "/programs", { ...body, preview_hash: preview.preview_hash });
  const run = (await call(r, "/state")).programs[0].lessons[0];

  // The learner opens the lesson and reads the explanation.
  const childContext = await browser.newContext({ baseURL: "http://127.0.0.1:4186", viewport: { width: 1366, height: 768 } }), child = await childContext.newPage();
  await signIn(child, `arch-kid-${tag}`);
  await child.getByRole("button", { name: "Продолжить занятие", exact: true }).click();
  await expect(child.getByRole("heading", { name: "Объяснение", exact: true })).toBeVisible();
  await child.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(child.locator(".lesson-code")).toHaveText("print(42)");

  // Archived from another tab while this tab has not refreshed yet (its lesson reads are held back):
  // the late click is refused by the server with a plain reason.
  const held: (() => Promise<void>)[] = [];
  await child.route("**/api/lesson-runs/*", (route) => { held.push(() => route.continue()); });
  await call(r, `/groups/${group.id}/archive`, { archived: true });
  await child.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(child.getByRole("alert")).toContainText("Группа в архиве");
  await child.unroute("**/api/lesson-runs/*");
  for (const release of held) await release().catch(() => {});
  await expect(child.getByTestId("view-only-note")).toContainText("занятие доступно для просмотра");
  await expect(child.getByRole("button", { name: "Продолжить", exact: true })).toBeDisabled();
  // Materials and earlier results stay readable.
  await child.locator(".lesson-outline").getByRole("button", { name: /^1\. Объяснение/ }).click();
  await expect(child.locator(".lesson-prose")).toContainText("print выводит значение.");
  await expect(child.locator(".lesson-outline")).toContainText("✓ Завершено");
  await child.screenshot({ path: "work/group-archive-learner-1366.png", fullPage: true });

  // Teacher: the journal of the group is visible, opening the lesson is not offered.
  await signIn(page, `arch-${tag}`);
  await expect(page.getByRole("heading", { name: "Привет, Учитель!" })).toBeVisible();
  await page.goto(`/#lesson-run/${run.id}`);
  await expect(page.getByTestId("view-only-note")).toContainText("Открыть занятие нельзя");
  await expect(page.getByRole("button", { name: "Открыть занятие", exact: true })).toBeDisabled();
  const row = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Ира", exact: true }) });
  await expect(row.getByRole("button", { name: "✓ Завершено", exact: true })).toHaveCount(1);
  await page.screenshot({ path: "work/group-archive-teacher-1920.png", fullPage: true });
  expect((await call(r, `/lesson-runs/${(await call(r, "/state")).programs[0].lessons[0].id}/state`, { state: "open", revision: 0 }, "POST", 409)).code).toBe("group_archived");

  // Restore: the same lesson resumes where the learner stopped, after the ordinary refresh.
  await call(r, `/groups/${group.id}/archive`, { archived: false });
  await expect(child.getByTestId("view-only-note")).toHaveCount(0, { timeout: 12000 });
  await child.locator(".lesson-outline").getByRole("button", { name: /^2\. Пример/ }).click();
  await child.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(child.locator("#python-answer")).toBeVisible();
  // Typed work survives an archive during practice: the editor becomes read-only and keeps the text.
  await child.locator("#python-answer").fill("print(42) # моё решение");
  await call(r, `/groups/${group.id}/archive`, { archived: true });
  await expect(child.getByTestId("view-only-note")).toBeVisible({ timeout: 12000 });
  await expect(child.locator("#python-answer")).toHaveValue("print(42) # моё решение");
  await expect(child.getByRole("button", { name: "Проверить решение", exact: true })).toBeDisabled();
  await expect(child.getByRole("button", { name: "▷ Запустить", exact: true })).toBeDisabled();
  await child.reload();
  await call(r, `/groups/${group.id}/archive`, { archived: false });
  await child.reload();
  await expect(child.locator("#python-answer")).toHaveValue("print(42) # моё решение");
  await childContext.close(); await r.dispose();
});
