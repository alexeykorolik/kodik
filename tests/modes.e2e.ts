import { test, expect, type Page } from "@playwright/test";
const password = "Modes-browser-test-321!";
async function call(page: Page, path: string, body?: unknown, method = "POST", expected = 200) {
  const r = await page.request.fetch("/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await r.json();
  expect(r.status(), JSON.stringify(data)).toBe(expected);
  return data;
}
const ws = (vars: string[], ...roots: object[]) => ({ blocks: { languageVersion: 0, blocks: roots }, variables: vars.map((name) => ({ name, id: `v-${name}` })) });
const solution = ws(["n"], { type: "variables_set", id: "s", x: 10, y: 10, fields: { VAR: { id: "v-n" } }, inputs: { VALUE: { block: { type: "kodik_input_int", id: "i" } } }, next: { block: { type: "text_print", id: "p", inputs: { TEXT: { block: { type: "math_arithmetic", id: "m", fields: { OP: "MULTIPLY" }, inputs: { A: { block: { type: "variables_get", id: "g", fields: { VAR: { id: "v-n" } } } }, B: { block: { type: "math_number", id: "k", fields: { NUM: 2 } } } } } } } } } });
const PALETTE = ["kodik_input_int", "variables_set", "variables_get", "math_arithmetic", "math_number", "text_print"];

for(const width of [1366,1920]) test(`learner: keyboard blocks, restore, mirror and separate Python draft at ${width}`, async ({ page }) => {
  await page.setViewportSize({width,height:width===1366?768:1080});
  const tag = crypto.randomUUID().slice(0, 8);
  await call(page, "/auth/register", { school: `Modes ${tag}`, name: "Teacher", login: `modes-${tag}`, password });
  const course = await call(page, "/courses", { title: "Course" }), module = await call(page, "/modules", { title: "M", course_id: course.id }), lesson = await call(page, "/lessons", { title: "L", module_id: module.id });
  const task = await call(page, "/tasks", { lesson_id: lesson.id, title: "Удвоим число", description: "", goal: "Удвоить число", theory: "", instruction: "Выведи удвоенное число", difficulty: "easy", starter: "", hints: [], check_mode: "tests", tests: [{ inputs: ["2"], expected: "4", hidden: false }, { inputs: ["21"], expected: "42", hidden: true }], reference_solution: "n = int(input())\nprint(n * 2)", wrong_solutions: ["n = int(input())\nprint(n + 2)"], learning_config: { modes: ["blocks", "mixed"], palette: PALETTE }, block_solution: solution });
  const state = await call(page, "/state");
  const row = state.tasks.find((t: { id: string }) => t.id === task.id);
  expect((await call(page, `/tasks/${task.id}/verify`, { revision: row.revision })).status).toBe("approved");
  await call(page, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const learner = await call(page, "/users", { name: "Миша", login: `modes-kid-${tag}`, password, role: "student" });
  const group = await call(page, "/groups", { title: "7А" });
  await call(page, `/groups/${group.id}/members`, { user_id: learner.id });
  const assignment = await call(page, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id, mode_policy: { allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "free" } });
  await call(page, "/auth/logout", {});

  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(`modes-kid-${tag}`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole('heading', {name: 'Привет, Миша!'})).toBeVisible();
  await page.goto(`/#assignment/${assignment.id}`);
  const modeSwitch = page.getByRole("radiogroup", { name: "Способ решения" });
  await expect(modeSwitch.getByRole("radio", { name: "Блоки", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".blockly-host svg").first()).toBeVisible();

  // Keyboard path: add blocks with buttons; each connects into the selected block.
  await page.getByText("Добавить блок с клавиатуры").focus(); await page.keyboard.press("Enter");
  const add = async (name: string) => {await page.getByRole("group", { name: "Блоки этого задания" }).getByRole("button", { name, exact: true }).focus();await page.keyboard.press("Enter");};
  await add("присвоить");
  await add("ввести целое число");
  await expect(page.getByText("Блоки сохранены на сервере")).toBeVisible({ timeout: 10000 });

  // Incomplete program survives a reload (server draft), then is explained, not run.
  await page.reload();
  await modeSwitch.getByRole("radio", { name: "Блоки + Python" }).click();
  const mirror = page.getByRole("region", { name: "Python из твоих блоков" });
  await expect(mirror).toContainText("int(input())");
  await page.getByText("Добавить блок с клавиатуры").focus(); await page.keyboard.press("Enter");
  await add("напечатать");
  await expect(mirror).toContainText("пустое место");
  await page.getByRole("button", { name: "▷ Запустить" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "пустое место" })).toBeVisible();
  await add("значение переменной");
  await expect(mirror).toContainText("print(");
  await page.getByRole("button", { name: /Проверить решение/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /Тест 1/ })).toBeVisible({ timeout: 20000 });

  // Python mode: a separate draft. The block program is not copied into it.
  await modeSwitch.getByRole("radio", { name: "Python", exact: true }).click();
  const editor = page.locator(".coding-panel textarea").first();
  await expect(editor).not.toHaveValue(/int\(input\(\)\)/);
  await editor.fill("n = int(input())\nprint(n * 2)\n");
  await page.getByRole("button", { name: /Проверить решение/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Отлично! Все тесты пройдены." })).toBeVisible({ timeout: 20000 });

  // Back to blocks after a reload: the block work is intact.
  await page.reload();
  await modeSwitch.getByRole("radio", { name: "Блоки + Python" }).click();
  await expect(page.getByRole("region", { name: "Python из твоих блоков" })).toContainText("int(input())");
  for(const name of ["▷ Запустить","Проверить решение"]){const button=page.getByRole("button",{name,exact:true}),r=await button.boundingBox();expect(r!.y+r!.height).toBeLessThanOrEqual(width===1366?768:1080);expect(await button.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBeTruthy()}
  await page.screenshot({path:"work/modes-"+width+".png"});
  const attempts = (await call(page, "/state")).attempts.filter((a: { assignment_id: string }) => a.assignment_id === assignment.id).map((a: { mode: string }) => a.mode).sort();
  expect(attempts).toEqual(["mixed", "python"]);
});
