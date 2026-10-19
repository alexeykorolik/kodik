import { test, expect, type Page, type Route } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
// Audit item: in the owner cabinet a lost response must not turn into a false failure or a double
// change on retry, and a second tab must see a conflict with current data instead of overwriting.
const password = "Owner-conflicts-test-321!";
async function call(page: Page, path: string, body?: unknown, method = "POST", expected = 200) {
  const r = await page.request.fetch("/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186" }, data: body });
  const data = await r.json();
  expect(r.status(), JSON.stringify(data)).toBe(expected);
  return data;
}
/** The server receives and applies the request, but the browser never gets the answer. */
const loseResponse = async (route: Route) => { await route.fetch(); await route.abort("connectionreset"); };

test("owner: lost responses are retried safely; a second tab gets a conflict with current terms", async ({ page, context }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const tag = crypto.randomUUID().slice(0, 8);
  const owner = await call(page, "/auth/register", { school: `Owner ${tag}`, name: "Owner", login: `conflict-owner-${tag}`, password });
  const db = new DatabaseSync("work/browser-test.sqlite");
  try { db.prepare("UPDATE users SET platform_owner=1 WHERE id=?").run(owner.user.id); } finally { db.close(); }
  const company = await call(page, "/owner/companies", { name: `Клиент ${tag}`, request_key: `create-${tag}-0001` });
  const school = await call(page, `/owner/companies/${company.id}/connect`, { request_key: `connect-${tag}-0001`, name: "Админ", login: `conflict-admin-${tag}`, password });
  const revisions = () => { const d = new DatabaseSync("work/browser-test.sqlite"); try { return (d.prepare("SELECT COUNT(*) n FROM licenses WHERE org_id=?").get(school.org_id) as { n: number }).n; } finally { d.close(); } };
  const open = async (p: Page) => {
    await p.goto("/");
    await expect(p.getByRole("heading", { name: "Клиенты и лицензии", exact: true })).toBeVisible();
    await p.getByRole("combobox", { name: "Клиент", exact: true }).selectOption(company.id);
    await expect(p.getByRole("heading", { name: "Лицензия школы", exact: true })).toBeVisible();
  };
  const fillLicence = async (p: Page, limit: string) => {
    await p.getByLabel("Лимит активных учеников", { exact: true }).fill(limit);
    await p.getByLabel("Действует до", { exact: true }).fill("2099-01-01");
    await p.getByLabel("Состояние", { exact: true }).selectOption("active");
  };
  await open(page);
  const before = revisions();

  // 1. The answer is lost: no success is claimed, and the retry neither fails nor applies twice.
  await page.route("**/api/owner/schools/*/licenses", (route) => route.request().method() === "POST" ? loseResponse(route) : route.continue(), { times: 1 });
  await fillLicence(page, "30");
  await page.getByRole("button", { name: "Выдать или продлить лицензию", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Условия лицензии сохранены" })).toHaveCount(0);
  expect(revisions()).toBe(before + 1);
  await page.getByRole("button", { name: "Выдать или продлить лицензию", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Условия лицензии сохранены" })).toBeVisible();
  await expect(page.getByText("Использовано 0 из 30 мест.", { exact: false })).toBeVisible();
  expect(revisions()).toBe(before + 1);

  // 2. Two tabs: the first saves, the second (stale) gets a conflict and sees the current terms.
  const second = await context.newPage();
  await second.setViewportSize({ width: 1366, height: 768 });
  await open(second);
  await fillLicence(page, "40");
  await page.getByRole("button", { name: "Выдать или продлить лицензию", exact: true }).click();
  await expect(page.getByText("Использовано 0 из 40 мест.", { exact: false })).toBeVisible();
  await fillLicence(second, "50");
  await second.getByRole("button", { name: "Выдать или продлить лицензию", exact: true }).click();
  await expect(second.getByRole("alert")).toContainText("уже изменили");
  await expect(second.getByText("Использовано 0 из 40 мест.", { exact: false })).toBeVisible();
  await expect(second.getByLabel("Лимит активных учеников", { exact: true })).toHaveValue("40");
  await expect(second.getByRole("status").filter({ hasText: "сохранены" })).toHaveCount(0);
  expect(revisions()).toBe(before + 2);

  // 3. Client card: a lost answer is retried without a false conflict.
  await page.route(`**/api/owner/companies/${company.id}`, (route) => route.request().method() === "PUT" ? loseResponse(route) : route.continue(), { times: 1 });
  await page.getByLabel("Следующее действие", { exact: true }).fill("Позвонить директору");
  await page.getByRole("button", { name: "Сохранить карточку", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Сохранить карточку", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Карточка сохранена" })).toBeVisible();
  const card = (await call(page, "/owner/companies")).items.find((c: { id: string }) => c.id === company.id);
  expect(card.next_action).toBe("Позвонить директору");
  await page.screenshot({ path: "work/owner-conflicts-1366.png" });
});
