import { test, expect, type Page } from "@playwright/test";
// Audit P1: on the mode-permission screen a late answer for the previously selected assignment
// replaced the data of the newly selected one (switcher: class B, learners: Anna from class A).
const password = "Late-answer-test-321!";
async function call(page: Page, path: string, body?: unknown, method = "POST", expected = 200) {
  const r = await page.request.fetch("/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await r.json();
  expect(r.status(), JSON.stringify(data)).toBe(expected);
  return data;
}

test("mode management: a late answer for the previous assignment never replaces the selected one", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const tag = crypto.randomUUID().slice(0, 8);
  await call(page, "/auth/register", { school: `Late ${tag}`, name: "Учитель", login: `late-${tag}`, password });
  const course = await call(page, "/courses", { title: "C" }), module = await call(page, "/modules", { title: "M", course_id: course.id }), lesson = await call(page, "/lessons", { title: "L", module_id: module.id });
  const task = await call(page, "/tasks", { lesson_id: lesson.id, title: "Выведи 42", description: "", goal: "Вывод", theory: "", instruction: "Выведи 42", difficulty: "easy", starter: "", hints: [], check_mode: "output", tests: [{ inputs: [], expected: "42", hidden: false }], reference_solution: "print(42)", wrong_solutions: ["print(41)"] });
  const row = (await call(page, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
  await call(page, `/tasks/${task.id}/verify`, { revision: row.revision });
  await call(page, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const assignments: Record<string, string> = {};
  for (const [cls, name] of [["Класс A", "Анна"], ["Класс B", "Борис"]]) {
    const kid = await call(page, "/users", { name, login: `late-${name === "Анна" ? "anna" : "boris"}-${tag}`, password, role: "student" });
    const group = await call(page, "/groups", { title: cls });
    await call(page, `/groups/${group.id}/members`, { user_id: kid.id });
    assignments[cls] = (await call(page, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id, mode_policy: { allowed: ["python"], start: "python", switching: "free" } })).id;
  }
  // Every answer for class A arrives 2.5 s late.
  await page.route(`**/api/assignments/${assignments["Класс A"]}/modes`, async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue().catch(() => {}); });
  await page.goto("/#modes");
  await expect(page.getByRole("heading", { name: "Способы решения", exact: true })).toBeVisible();
  const switcher = page.locator("label", { hasText: "Назначение" }).locator("select");
  const lateA = page.waitForResponse((r) => r.url().includes(`/api/assignments/${assignments["Класс A"]}/modes`));
  await switcher.selectOption(assignments["Класс A"]);
  await switcher.selectOption(assignments["Класс B"]);
  await expect(page.getByRole("heading", { name: /^Борис · / })).toBeVisible();
  // Right after the late answer for class A arrives (before the next 5 s polling round could hide a bug).
  await lateA;
  // Sample the screen repeatedly without retrying assertions: a late answer must never be shown, even briefly.
  for (let i = 0; i < 8; i++) {
    expect(await switcher.inputValue()).toBe(assignments["Класс B"]);
    expect(await page.locator("article h2").allTextContents()).toEqual([expect.stringMatching(/^Борис · /)]);
    await page.waitForTimeout(100);
  }
  // And after another polling round.
  await page.waitForTimeout(5500);
  await expect(switcher).toHaveValue(assignments["Класс B"]);
  await expect(page.getByRole("heading", { name: /^Борис · / })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Анна · / })).toHaveCount(0);
  // Switching back shows class A once its own answer arrives, and only then.
  await switcher.selectOption(assignments["Класс A"]);
  await expect(page.getByRole("heading", { name: /^Борис · / })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Анна · / })).toBeVisible({ timeout: 8000 });
});
