import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
const password = "Journal-browser-pass-321!";
const ORIGIN = "http://127.0.0.1:4186";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST") {
  const res = await r.fetch("/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: ORIGIN }, data: body });
  const value = await res.json();
  expect(res.status(), `${path}: ${JSON.stringify(value)}`).toBe(200);
  return value;
}
async function submitManual(r: APIRequestContext, taskId: string, assignmentId: string, code: string) {
  let job = await call(r, `/tasks/${taskId}/submissions`, { assignment_id: assignmentId, mode: "python", code, request_key: crypto.randomUUID() });
  for (let i = 0; i < 200 && job.status !== "completed"; i++) { await new Promise((x) => setTimeout(x, 25)); job = await call(r, `/submissions/${job.id}`); }
  return job;
}

test("open journal shows new work and another teacher's grade without navigation; keeps filters and page", async ({ page, browser }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const tag = crypto.randomUUID().slice(0, 8);
  await call(page.request, "/auth/register", { school: `Journal ${tag}`, name: "Admin", login: `journal-admin-${tag}`, password });
  const course = await call(page.request, "/courses", { title: "C" }), module = await call(page.request, "/modules", { title: "M", course_id: course.id }), lesson = await call(page.request, "/lessons", { title: "L", module_id: module.id });
  const task = await call(page.request, "/tasks", { lesson_id: lesson.id, title: "Творческая работа", description: "", goal: "Своя программа", theory: "", instruction: "Напиши программу", difficulty: "easy", starter: "", hints: [], check_mode: "manual", manual_criteria: "Программа работает и что-то выводит.", tests: [], reference_solution: "", wrong_solutions: [] });
  const row = (await call(page.request, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
  await call(page.request, `/tasks/${task.id}/verify`, { revision: row.revision });
  await call(page.request, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const student = await call(page.request, "/users", { name: "Миша", login: `journal-kid-${tag}`, password, role: "student" });
  const colleague = await call(page.request, "/users", { name: "Коллега", login: `journal-teacher-${tag}`, password, role: "teacher" });
  const group = await call(page.request, "/groups", { title: "7А" });
  await call(page.request, `/groups/${group.id}/members`, { user_id: student.id });
  await call(page.request, `/groups/${group.id}/teachers`, { items: [{ user_id: colleague.id, kind: "primary" }] }, "PUT");
  const assignment = await call(page.request, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id });

  const kid = await browser.newContext({ baseURL: ORIGIN }), teacher = await browser.newContext({ baseURL: ORIGIN });
  try {
    await call(kid.request, "/auth/login", { login: `journal-kid-${tag}`, password });
    await call(teacher.request, "/auth/login", { login: `journal-teacher-${tag}`, password });

    await page.goto("/#journal");
    const freshness = page.getByTestId("journal-freshness");
    await expect(page.getByText("Работ: 0", { exact: true })).toBeVisible();

    // 1. New work appears in the open journal without any navigation or filter change.
    await submitManual(kid.request, task.id, assignment.id, 'print("Моя первая программа")');
    await expect(page.getByText("Работ: 1", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("tbody tr").first()).toContainText("На проверке");
    await expect(freshness).toContainText("Журнал обновлён в");

    // 2. Another teacher grades it; the open journal shows the new grade.
    const attemptId = (await call(teacher.request, "/state")).attempts[0].id;
    await call(teacher.request, `/attempts/${attemptId}/review`, { status: "passed", feedback: "Хорошо", revision: 0 });
    await expect(page.locator("tbody tr").first()).toContainText("Выполнено", { timeout: 15000 });
    await expect(page.locator("tbody tr").first()).toContainText("Хорошо");

    // 3. Pagination: create enough work for a second page, stay on it while new work arrives.
    for (let i = 0; i < 30; i++) await submitManual(kid.request, task.id, assignment.id, `print(${i})`);
    await expect(page.getByText("Работ: 31", { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Следующая страница", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await submitManual(kid.request, task.id, assignment.id, "print('ещё')");
    await expect(page.getByText("Работ: 32", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Предыдущая страница", exact: true })).toBeEnabled();

    // 4. Filter is kept across the shared "Обновить" button and periodic refresh.
    await page.locator("label", { hasText: "Состояние" }).locator("select").selectOption("passed");
    await expect(page.getByText("Работ: 1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Обновить данные" }).click();
    await expect(page.getByText("Работ: 1", { exact: true })).toBeVisible();
    await expect(page.locator("label", { hasText: "Состояние" }).locator("select")).toHaveValue("passed");

    // 5. A late answer of the previous query never replaces the rows of the new filter.
    let delayOnce = true;
    await page.route("**/api/reports?*", async (route) => {
      if (delayOnce && route.request().url().includes("status=passed")) { delayOnce = false; await new Promise((x) => setTimeout(x, 2500)); }
      await route.continue();
    });
    await page.getByRole("button", { name: "Обновить данные" }).click();
    await page.locator("label", { hasText: "Состояние" }).locator("select").selectOption("pending_review");
    await expect(page.getByText("Работ: 31", { exact: true })).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page.getByText("Работ: 31", { exact: true })).toBeVisible();
    await page.unroute("**/api/reports?*");

    // 6. Connection loss keeps the last good rows and says how old they are.
    await page.route("**/api/reports?*", (route) => route.abort("failed"));
    await expect(freshness).toContainText("Нет связи с сервером. Показаны данные от", { timeout: 15000 });
    await expect(page.getByText("Работ: 31", { exact: true })).toBeVisible();
    await page.unroute("**/api/reports?*");
    await expect(freshness).toContainText("Журнал обновлён в", { timeout: 15000 });
  } finally {
    await kid.close(); await teacher.close();
  }
});
