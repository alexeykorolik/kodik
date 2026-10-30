import { test, expect, type APIRequestContext } from "@playwright/test";
// Free practice: a learner opens «Практика», picks a way of programming and runs code without a task.
// Teaching Python draws its scene; full Python (Pyodide, served by our own server) runs the real
// language with input(), reports errors with a line, and an endless loop can be stopped; drafts
// survive a reload.
const password = "Practice-e2e-321!";
const origin = "http://127.0.0.1:4186";
async function call(r: APIRequestContext, path: string, body?: unknown) {
  const res = await r.fetch(origin + "/api" + path, { method: body === undefined ? "GET" : "POST", headers: { Origin: origin, "X-Kodik-Client": "2" }, data: body });
  const data = await res.json();
  expect(res.status(), `${path}: ${JSON.stringify(data)}`).toBe(200);
  return data;
}

test("learner practises in blocks, teaching Python and full Python without a task", async ({ page, playwright }) => {
  test.setTimeout(180000);
  const r = await playwright.request.newContext(), tag = crypto.randomUUID().slice(0, 8);
  await call(r, "/auth/register", { school: `Practice ${tag}`, name: "Учитель", login: `pr-t-${tag}`, password });
  await call(r, "/users", { name: "Тимур", login: `pr-k-${tag}`, password, role: "student" });
  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(`pr-k-${tag}`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await page.getByRole("link", { name: "Практика", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Практика", exact: true })).toBeVisible();

  // Teaching Python: the starter star is drawn by the turtle.
  await page.getByRole("button", { name: /^Python Пиши код/ }).click();
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect(page.locator(".practice-output .scene-view")).toBeVisible();

  // Full Python: the real language and standard library, served from our origin.
  await page.getByRole("tab", { name: "Полный Python", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Python 3\.[0-9.]+ готов/ })).toBeVisible({ timeout: 90000 });
  const editor = page.getByLabel("Код на полном Python");
  await editor.fill('import json\nname = input("Имя? ")\nprint(f"Привет, {name}!", json.dumps({"n": len(name)}))');
  await page.locator(".practice-stdin textarea").fill("Мира");
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect(page.locator(".practice-console")).toContainText('Привет, Мира! {"n": 4}');
  await editor.fill("print(1)\nprint(undefined_name)");
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Строка 2");
  await expect(page.getByRole("alert")).toContainText("NameError");
  await editor.fill("while True:\n    pass");
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await page.getByRole("button", { name: "Остановить", exact: true }).click();
  await expect(page.getByText("Остановлено.", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /Python 3\.[0-9.]+ готов/ })).toBeVisible({ timeout: 60000 });

  // The draft of each way of solving stays in this browser.
  await page.reload();
  await expect(page.getByLabel("Код на полном Python")).toHaveValue("while True:\n    pass");

  // Blocks: the full palette is split into categories; an empty print explains what is missing.
  await page.getByRole("tab", { name: "Блоки", exact: true }).click();
  await expect(page.getByRole("tablist", { name: "Группы блоков" })).toBeVisible();
  await page.getByRole("button", { name: "Добавить блок «напечатать»" }).click();
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect(page.locator(".practice-error")).toContainText("пустое место");
  await r.dispose();
});
