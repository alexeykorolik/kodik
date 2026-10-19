import { test, expect, type APIRequestContext } from "@playwright/test";
// A proposal whose settings changed is closed with a reason, no longer blocks the next proposal, and a
// failed confirmation never leaves an active card with two dead buttons.
const password = "Rec-lifecycle-test-321!";
async function call(r: APIRequestContext, path: string, body?: unknown, method = "POST", expected = 200) {
  const res = await r.fetch("http://127.0.0.1:4186/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await res.json();
  expect(res.status(), JSON.stringify(data)).toBe(expected);
  return data;
}
const ws = (n: number) => ({ blocks: { languageVersion: 0, blocks: [{ type: "text_print", id: "p", x: 10, y: 10, inputs: { TEXT: { block: { type: "math_number", id: "pn", fields: { NUM: n } } } } }] } });

test("teacher: a stale proposal is closed with its reason and the next one appears", async ({ page, playwright }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const tag = crypto.randomUUID().slice(0, 8), r = await playwright.request.newContext(), kid = await playwright.request.newContext();
  await call(r, "/auth/register", { school: `Rec ${tag}`, name: "Учитель", login: `rec-${tag}`, password });
  const course = await call(r, "/courses", { title: "C" }), module = await call(r, "/modules", { title: "M", course_id: course.id }), lesson = await call(r, "/lessons", { title: "L", module_id: module.id });
  const learner = await call(r, "/users", { name: "Петя", login: `rec-kid-${tag}`, password, role: "student" });
  const group = await call(r, "/groups", { title: "6А" });
  await call(r, `/groups/${group.id}/members`, { user_id: learner.id });
  await call(kid, "/auth/login", { login: `rec-kid-${tag}`, password });
  let n = 10;
  const make = async () => {
    n++;
    const t = await call(r, "/tasks", { lesson_id: lesson.id, title: `Число ${n}`, description: "", goal: "Вывод", theory: "", instruction: `Выведи ${n}`, difficulty: "easy", starter: "", hints: [], check_mode: "tests", tests: [{ inputs: [], expected: String(n), hidden: false }], reference_solution: `print(${n})`, wrong_solutions: ["print(0)"], learning_config: { modes: ["blocks", "mixed"], palette: ["text_print", "math_number"], skills: ["output"] }, block_solution: ws(n) });
    const row = (await call(r, "/state")).tasks.find((x: { id: string }) => x.id === t.id);
    await call(r, `/tasks/${t.id}/verify`, { revision: row.revision }); await call(r, `/tasks/${t.id}/publish`, { published: true, revision: row.revision });
    const a = await call(r, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: t.id, mode_policy: { allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "teacher" } });
    return { t, a, n };
  };
  const solve = async (x: { t: { id: string }; a: { id: string }; n: number }) => {
    let job = await call(kid, `/tasks/${x.t.id}/submissions`, { mode: "blocks", workspace: ws(x.n), assignment_id: x.a.id, request_key: crypto.randomUUID() });
    for (let i = 0; i < 100 && job.status !== "completed"; i++) { await new Promise((res) => setTimeout(res, 50)); job = await call(kid, `/submissions/${job.id}`); }
    expect(job.result.status).toBe("passed");
  };
  await solve(await make()); await solve(await make());
  const A = await make();
  const proposals = async () => (await call(r, "/recommendations")).items.filter((x: { status: string }) => x.status === "proposed");
  expect((await proposals()).map((x: { assignment_id: string }) => x.assignment_id)).toEqual([A.a.id]);
  // The teacher locks the mode in assignment A (e.g. from another tab).
  await call(r, `/assignments/${A.a.id}/students/${learner.id}/mode`, { override: { allowed: ["blocks"], start: "blocks", switching: "locked" }, reason: "Закрепляем блоки" }, "PUT");

  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(`rec-${tag}`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole("heading", { name: "Привет, Учитель!" })).toBeVisible();
  await page.getByRole("link", { name: "Способы решения" }).click();
  const panel = page.locator("section.recommendations");
  await expect(panel).toContainText("Сейчас предложений нет.");
  await panel.getByText("Недавно закрытые предложения").click();
  await expect(panel).toContainText("Снято как неактуальное");
  await expect(panel).toContainText("Преподаватель закрепил режим ученика.");

  // A new suitable task gets a proposal on the next refresh.
  const B = await make();
  const card = panel.locator("article").filter({ hasText: "Петя → Блоки + Python" });
  await expect(card).toBeVisible({ timeout: 12000 });
  // Grounds change right before the click: the confirmation fails with a reason and no active card remains.
  await call(r, `/assignments/${B.a.id}/students/${learner.id}/mode`, { override: { allowed: ["blocks"], start: "blocks", switching: "locked" }, reason: "Закрепляем и здесь" }, "PUT");
  await card.getByRole("button", { name: "Предложить ученику" }).click();
  await expect(page.getByRole("alert")).toContainText("разрешите его вручную");
  await expect(panel.locator("article")).toHaveCount(0);
  await expect(panel).toContainText("Сейчас предложений нет.");
  await page.screenshot({ path: "work/recommendation-lifecycle-1366.png", fullPage: true });
  await r.dispose(); await kid.dispose();
});
