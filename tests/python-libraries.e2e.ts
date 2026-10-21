import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
// Library tasks in the real learner workspace: a turtle drawing animates, can be stopped and shown at
// once, a new run starts clean; a failed check shows what is expected; the Robot field is in the task
// and a crash is visible; the help page runs its examples; the teacher's preview uses the task field.
const password = "Libraries-e2e-321!";
const origin = "http://127.0.0.1:4186";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST") {
  const res = await r.fetch(origin + "/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: origin, "X-Kodik-Client": "2" }, data: body });
  const data = await res.json();
  expect(res.status(), `${path}: ${JSON.stringify(data)}`).toBe(200);
  return data;
}
async function signIn(page: Page, login: string, heading: RegExp) {
  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(login);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}
async function setup(r: APIRequestContext) {
  const tag = crypto.randomUUID().slice(0, 8);
  await call(r, "/auth/register", { school: `Libraries ${tag}`, name: "Учитель", login: `lib-t-${tag}`, password });
  const templates = (await call(r, "/task-templates")).items;
  const course = await call(r, "/courses", { title: "Библиотеки" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const group = await call(r, "/groups", { title: "6В" }), kid = await call(r, "/users", { name: "Лиза", login: `lib-k-${tag}`, password, role: "student" });
  await call(r, `/groups/${group.id}/members`, { user_id: kid.id });
  const issue = async (id: string) => {
    const task = await call(r, "/tasks", { ...templates.find((t: { id: string }) => t.id === id).task, lesson_id: lesson.id, learning_config: { modes: [] } });
    const row = (await call(r, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
    expect((await call(r, `/tasks/${task.id}/verify`, { revision: row.revision })).status).toBe("approved");
    await call(r, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
    return { task, assignment: await call(r, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id }) };
  };
  return { tag, turtle: await issue("turtle-square"), robot: await issue("robot-fill") };
}

test("turtle and Robot work in the learner workspace; help examples run", async ({ page, playwright }) => {
  const r = await playwright.request.newContext(), s = await setup(r);
  await signIn(page, `lib-k-${s.tag}`, /Привет, Лиза!/);
  // ---- turtle: animation, stop, show at once, clean new run ----
  await page.goto(`/#assignment/${s.turtle.assignment.id}`);
  await expect(page.getByText("Проверяется: рисунок черепахи.")).toBeVisible();
  await page.locator("#python-answer").fill("import turtle\nt = turtle.Turtle()\nt.speed(1)\nfor i in range(4):\n    t.forward(100)\n    t.left(90)\n");
  await expect(page.getByText("✓ Сохранено", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "▷ Запустить" }).click();
  await expect(page.getByRole("button", { name: "■ Остановить" })).toBeVisible();
  await page.getByRole("button", { name: "■ Остановить" }).click();
  await expect(page.getByText(/Остановлено на/)).toBeVisible();
  const stoppedLines = await page.locator(".turtle-view line").count();
  await page.waitForTimeout(800);
  expect(await page.locator(".turtle-view line").count(), "nothing more is drawn after a stop").toBe(stoppedLines);
  expect(stoppedLines).toBeLessThan(4);
  await page.getByRole("button", { name: "⏭ Сразу результат" }).click();
  await expect(page.locator(".turtle-view line")).toHaveCount(4);
  await expect(page.getByRole("img", { name: /Рисунок черепахи: 4 линий/ })).toBeVisible();
  // A new run of other code replaces the picture with a clean one.
  await page.locator("#python-answer").fill("import turtle\nturtle.speed(0)\nturtle.forward(50)\n");
  await page.getByRole("button", { name: "▷ Запустить" }).click();
  await expect(page.getByRole("img", { name: /Рисунок черепахи: 1 линий/ })).toBeVisible();
  // ---- a wrong drawing is explained and the target picture is shown ----
  await page.locator("#python-answer").fill("import turtle\nt = turtle.Turtle()\nt.speed(0)\nfor i in range(3):\n    t.forward(100)\n    t.left(90)\n");
  await page.getByRole("button", { name: "Проверить решение", exact: true }).click();
  await expect(page.locator(".result-box").getByText(/Рисунок отличается: не хватает части рисунка/).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Должно получиться" }).last()).toBeVisible();
  // ---- the correct drawing passes ----
  await page.locator("#python-answer").fill("import turtle\nt = turtle.Turtle()\nt.speed(0)\nt.color('green')\nfor i in range(4):\n    t.forward(100)\n    t.left(90)\n");
  await page.getByRole("button", { name: "Проверить решение", exact: true }).click();
  await expect(page.getByText("Отлично! Все проверки пройдены.", { exact: true })).toBeVisible({ timeout: 20000 });
  // ---- Robot: the task field and a crash ----
  await page.goto(`/#assignment/${s.robot.assignment.id}`);
  await expect(page.getByRole("img", { name: /Поле Робота 1×6: Робот в строке 1, столбце 1; нужно закрасить клеток: 1/ })).toBeVisible();
  await page.locator("#python-answer").fill("from pyrob.api import *\nwhile True:\n    move_right()\n");
  await page.getByRole("button", { name: "▷ Запустить" }).click();
  await page.getByRole("button", { name: "⏭ Сразу результат" }).click();
  await expect(page.locator(".result-box").getByText(/Робот врезался в стену справа/)).toBeVisible();
  await expect(page.getByRole("img", { name: /Робот врезался в стену/ })).toBeVisible();
  await page.locator("#python-answer").fill("from pyrob.api import *\nwhile not wall_is_on_the_right():\n    move_right()\nfill_cell()\n");
  await page.getByRole("button", { name: "Проверить решение", exact: true }).click();
  await expect(page.getByText("Отлично! Все проверки пройдены.", { exact: true })).toBeVisible({ timeout: 20000 });
  // ---- help: every example runs in the page ----
  await page.getByRole("link", { name: "Справка Python" }).click();
  await expect(page.getByRole("heading", { name: "Python в Kodik: библиотеки и примеры" })).toBeVisible();
  const buttons = page.getByRole("button", { name: "▷ Запустить пример" });
  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(14);
  for (let i = 0; i < count; i++) await buttons.first().click();
  await expect(page.locator(".example-output", { hasText: "Ошибка" })).toHaveCount(0);
  await expect(page.locator(".python-help .scene-view")).toHaveCount(8);
});
