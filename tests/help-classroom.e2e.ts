import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
// Teacher's main path on the help screen during a lesson: who is waiting comes first with group, task and
// message; a typed answer survives the periodic refresh; answering moves the request to history; old
// history is reachable by paging.
const password = "Help-classroom-test-321!";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST", expected = 200) {
  const res = await r.fetch("http://127.0.0.1:4186/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await res.json();
  expect(res.status(), JSON.stringify(data)).toBe(expected);
  return data;
}

test("help screen: waiting first with context, answer survives refresh, history is paged", async ({ page, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const tag = crypto.randomUUID().slice(0, 8), r = await playwright.request.newContext(), kid = await playwright.request.newContext();
  await call(r, "/auth/register", { school: `Help ${tag}`, name: "Учитель", login: `help-${tag}`, password });
  const course = await call(r, "/courses", { title: "C" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const task = await call(r, "/tasks", { lesson_id: lesson.id, title: "Сумма двух чисел", description: "", goal: "Сумма", theory: "", instruction: "Выведи 3", difficulty: "easy", starter: "", hints: [], check_mode: "output", tests: [{ inputs: [], expected: "3", hidden: false }], reference_solution: "print(1 + 2)", wrong_solutions: ["print(2)"] });
  const row = (await call(r, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
  await call(r, `/tasks/${task.id}/verify`, { revision: row.revision }); await call(r, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const learner = await call(r, "/users", { name: "Вася", login: `help-kid-${tag}`, password, role: "student" });
  const group = await call(r, "/groups", { title: "5Б" });
  await call(r, `/groups/${group.id}/members`, { user_id: learner.id });
  const assignment = await call(r, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id });
  await call(kid, "/auth/login", { login: `help-kid-${tag}`, password });
  // 25 processed requests (more than one page) and then one that is waiting now.
  for (let i = 0; i < 25; i++) { const h = await call(kid, "/help", { assignment_id: assignment.id, message: `Старый вопрос ${i}` }); await call(r, `/help/${h.id}`, { answer: `Старый ответ ${i}` }, "PUT"); }
  await call(kid, "/help", { assignment_id: assignment.id, message: "Почему у меня выводится 12?" });

  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(`help-${tag}`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole("heading", { name: "Привет, Учитель!" })).toBeVisible();
  await page.getByRole("link", { name: "Запросы помощи" }).click();
  const waiting = page.locator("section.help-waiting");
  await expect(waiting.getByRole("heading", { name: "Ждут помощи: 1" })).toBeVisible();
  const card = waiting.getByRole("article", { name: "Запрос: Вася" });
  await expect(card).toContainText("Ждёт помощи");
  await expect(card).toContainText("Группа «5Б»");
  await expect(card).toContainText("Задание «Сумма двух чисел»");
  await expect(card).toContainText("Почему у меня выводится 12?");
  // The waiting list comes before history on the page.
  const [wy, hy] = await Promise.all([waiting.boundingBox(), page.locator("section.help-history").boundingBox()]);
  expect(wy!.y).toBeLessThan(hy!.y);

  // Typing an answer, then a refresh round: the text stays.
  const answer = card.getByLabel(/Короткий ответ/);
  await answer.focus(); await page.keyboard.type("Ты сложил строки, а не числа");
  await page.waitForTimeout(5600);
  await expect(page.getByTestId("live-freshness")).toContainText("Запросы обновлены");
  await expect(answer).toHaveValue("Ты сложил строки, а не числа");
  await answer.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Помощь ученику Вася отмечена" })).toBeVisible();
  await expect(waiting.getByRole("heading", { name: "Ждут помощи: 0" })).toBeVisible();
  await expect(waiting).toContainText("Сейчас никто не ждёт помощи.");

  // History: newest first, 26 in total, older ones reachable by paging.
  const history = page.locator("section.help-history");
  await expect(history.getByRole("heading", { name: "Обработанные запросы: 26" })).toBeVisible();
  await expect(history.locator(".help-card").first()).toContainText("Ты сложил строки, а не числа");
  await expect(history).toContainText("1–20 из 26");
  await history.getByRole("button", { name: "Более старые" }).click();
  await expect(history).toContainText("21–26 из 26");
  await expect(history).toContainText("Старый вопрос 0");
  await page.screenshot({ path: "work/help-classroom-1366.png", fullPage: true });

  // The learner sees the teacher's answer next to the task.
  const learnerPage = await (await page.context().browser()!.newContext({ baseURL: "http://127.0.0.1:4186", viewport: { width: 1366, height: 768 } })).newPage();
  await learnerPage.goto("/");
  await learnerPage.getByLabel("Логин", { exact: true }).fill(`help-kid-${tag}`);
  await learnerPage.getByLabel("Пароль", { exact: true }).fill(password);
  await learnerPage.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(learnerPage.getByRole("heading", { name: "Привет, Вася!" })).toBeVisible();
  await learnerPage.goto(`/#assignment/${assignment.id}`);
  await learnerPage.getByText("Нужна помощь").click();
  await expect(learnerPage.getByRole("status").filter({ hasText: "Ответ учителя: Ты сложил строки, а не числа" })).toBeVisible();
  await r.dispose(); await kid.dispose();
});
