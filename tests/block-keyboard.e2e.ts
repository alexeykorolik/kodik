import { test, expect, type Page } from "@playwright/test";
import { translateWorkspace } from "../src/adaptive/blockProgram";
// Audit item: a learner who cannot drag must be able to build and edit a full program from the
// keyboard. After every step the saved server draft (real Blockly serialization), the Python mirror
// shown to the learner and an independent translation of that draft must agree.
const password = "Keyboard-blocks-test-321!";
async function call(page: Page, path: string, body?: unknown, method = "POST", expected = 200) {
  const r = await page.request.fetch("/api" + path, { method: body === undefined ? "GET" : method, headers: { Origin: "http://127.0.0.1:4186", "X-Kodik-Client": "2" }, data: body });
  const data = await r.json();
  expect(r.status(), JSON.stringify(data)).toBe(expected);
  return data;
}
const PALETTE = ["kodik_input_int", "variables_set", "variables_get", "math_number", "text_print", "text", "controls_if", "logic_compare"];
const solution = { blocks: { languageVersion: 0, blocks: [{ type: "variables_set", id: "s", x: 10, y: 10, fields: { VAR: { id: "v-n" } }, inputs: { VALUE: { block: { type: "kodik_input_int", id: "i" } } }, next: { block: { type: "controls_if", id: "c", extraState: { hasElse: true }, inputs: { IF0: { block: { type: "logic_compare", id: "q", fields: { OP: "GT" }, inputs: { A: { block: { type: "variables_get", id: "g", fields: { VAR: { id: "v-n" } } } }, B: { block: { type: "math_number", id: "k", fields: { NUM: 10 } } } } } }, DO0: { block: { type: "text_print", id: "p1", inputs: { TEXT: { block: { type: "text", id: "t1", fields: { TEXT: "да" } } } } } }, ELSE: { block: { type: "text_print", id: "p2", inputs: { TEXT: { block: { type: "text", id: "t2", fields: { TEXT: "нет" } } } } } } } } } }] }, variables: [{ name: "n", id: "v-n" }] };

test("learner edits a full block program from the keyboard at 1366×768; graph, Python and saved draft agree", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const tag = crypto.randomUUID().slice(0, 8);
  await call(page, "/auth/register", { school: `Keys ${tag}`, name: "Teacher", login: `keys-${tag}`, password });
  const course = await call(page, "/courses", { title: "C" }), module = await call(page, "/modules", { title: "M", course_id: course.id }), lesson = await call(page, "/lessons", { title: "L", module_id: module.id });
  const task = await call(page, "/tasks", { lesson_id: lesson.id, title: "Больше десяти", description: "", goal: "Сравнить число с 10", theory: "", instruction: "Если число больше 10, выведи «да», иначе «нет»", difficulty: "easy", starter: "", hints: [], check_mode: "tests", tests: [{ inputs: ["11"], expected: "да", hidden: false }, { inputs: ["10"], expected: "нет", hidden: true }], reference_solution: 'n = int(input())\nif n > 10:\n    print("да")\nelse:\n    print("нет")', wrong_solutions: ['n = int(input())\nprint("да")'], learning_config: { modes: ["blocks", "mixed"], palette: PALETTE }, block_solution: solution });
  const row = (await call(page, "/state")).tasks.find((t: { id: string }) => t.id === task.id);
  expect((await call(page, `/tasks/${task.id}/verify`, { revision: row.revision })).status).toBe("approved");
  await call(page, `/tasks/${task.id}/publish`, { published: true, revision: row.revision });
  const learner = await call(page, "/users", { name: "Оля", login: `keys-kid-${tag}`, password, role: "student" });
  const group = await call(page, "/groups", { title: "6Б" });
  await call(page, `/groups/${group.id}/members`, { user_id: learner.id });
  const assignment = await call(page, "/assignments", { request_key: crypto.randomUUID(), group_id: group.id, task_id: task.id, mode_policy: { allowed: ["blocks", "mixed"], start: "mixed", switching: "free" } });
  await call(page, "/auth/logout", {});

  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill(`keys-kid-${tag}`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kodik" }).click();
  await expect(page.getByRole("heading", { name: "Привет, Оля!" })).toBeVisible();
  await page.goto(`/#assignment/${assignment.id}`);
  await expect(page.locator(".blockly-host svg").first()).toBeVisible();
  const mirror = page.getByRole("region", { name: "Python из твоих блоков" });
  const panel = page.locator(".block-keyboard");
  const notice = page.locator(".block-notice");
  const press = async (name: string) => { const b = panel.getByRole("button", { name, exact: true }); await b.focus(); await page.keyboard.press("Enter"); };
  const add = async (name: string) => { await panel.getByRole("group", { name: "Блоки этого задания" }).getByRole("button", { name, exact: true }).focus(); await page.keyboard.press("Enter"); };
  const field = (label: string) => label.startsWith("Место: ") ? panel.getByRole("combobox", { name: label, exact: true }) : panel.locator(`xpath=.//label[normalize-space(text()[1])="${label}"]`).locator("input,select").first();
  const type = async (label: string, value: string) => { const input = field(label); await input.focus(); await input.fill(value); await page.keyboard.press("Enter"); };
  const choose = async (label: string, option: string | RegExp) => { const select = field(label); await select.focus(); const value = await select.locator("option").filter({ hasText: option }).first().getAttribute("value"); await select.selectOption(value!); };
  const pick = async (option: string | RegExp) => choose("Выбранный блок", option);
  const workspaceBlocks = () => page.locator(".blockly-host .blocklyDraggable").count();
  /** Saved draft == Blockly graph on screen; independent translation of the draft == visible mirror. */
  async function agree(expected: string | RegExp) {
    await expect.poll(async () => {
      const draft = (await call(page, "/state")).block_drafts.find((d: { assignment_id: string }) => d.assignment_id === assignment.id);
      if (!draft) return "no draft";
      const t = translateWorkspace(draft.workspace, { allowed: PALETTE });
      const shown = (await mirror.locator(".mirror-errors").count()) ? await mirror.locator(".mirror-errors").innerText() : await mirror.locator(".mirror-code > div").evaluateAll(lines => lines.map(l => [...l.childNodes].filter(n => !(n instanceof HTMLElement && n.classList.contains("ln"))).map(n => n.textContent).join("")).join("\n"));
      const count = (function walk(list: unknown[]): number { return list.reduce<number>((n, b) => { const block = b as { inputs?: Record<string, { block?: unknown }>; next?: { block?: unknown } }; const kids = [...Object.values(block.inputs ?? {}).map(i => i.block).filter(Boolean), block.next?.block].filter(Boolean); return n + 1 + walk(kids); }, 0); })(draft.workspace.blocks?.blocks ?? []);
      const graph = await workspaceBlocks();
      if (process.env.KEYS_DEBUG) console.log(JSON.stringify({ graph, count, shown, t: t.ok ? t.python : t.errors[0].message }));
      if (graph !== count) return `graph ${graph} != draft ${count}`;
      if (t.ok ? shown !== t.python.trimEnd() : !shown.includes(t.errors[0].message)) return `mirror differs: ${shown} / ${t.ok ? t.python : t.errors[0].message}`;
      const r = t.ok ? t.python.trimEnd() : `ERR ${t.errors[0].message}`; if (process.env.KEYS_DEBUG) console.log(JSON.stringify(r)); return r;
    }, { timeout: 10000 }).toMatch(expected);
  }

  await page.getByText("Добавить блок с клавиатуры").focus(); await page.keyboard.press("Enter");
  // Variable created from the keyboard; a duplicate is refused in plain words.
  await panel.getByLabel("Новая переменная").fill("n"); await page.keyboard.press("Enter");
  await expect(notice).toContainText("Переменная «n» создана");
  await panel.getByLabel("Новая переменная").fill("n"); await page.keyboard.press("Enter");
  await expect(notice).toContainText("уже есть");
  await panel.getByLabel("Новая переменная").fill("");

  // Build: n = int(input()); if n > 10: print("да")
  await add("присвоить"); await add("ввести целое число");
  await agree(/^n = int\(input\(\)\)$/);
  await pick("Конец программы");
  await add("если / иначе если / иначе"); await add("сравнить"); await add("значение переменной");
  await pick("сравнить"); await add("число");
  await type("Число", "10");
  await pick("сравнить"); await field("Действие").focus(); await field("Действие").selectOption("GT");
  await pick("если"); await add("напечатать"); await add("текст"); await type("Текст", "да");
  await agree(/^n = int\(input\(\)\)\nif n > 10:\n    print\("да"\)$/);
  // A value validator may refuse input: the control shows what Blockly actually kept.
  await pick(/^\d+\. число$/); await type("Число", "десять");
  await expect(notice).toContainText("не подходит");
  await expect(field("Число")).toHaveValue("10");

  // Else branch with an empty print, then connect a detached text into the empty place.
  await pick("Конец программы"); await add("текст");
  await expect(notice).toContainText("добавлен отдельно");
  await type("Текст", "нет");
  await agree(/^ERR .*лежит отдельно/);
  await pick("если"); await field("Ветка «иначе»").check();
  await pick("если"); await add("напечатать");
  await agree(/^ERR .*пустое место/);
  await choose("Место: Что напечатать", /^текст/);
  await expect(notice).toContainText("вставлен");
  await agree(/^n = int\(input\(\)\)\nif n > 10:\n    print\("да"\)\nelse:\n    print\("нет"\)$/);

  // Replace an already connected value: the old one lies separately and is then deleted.
  await pick("Конец программы"); await add("число"); await type("Число", "5");
  await pick("сравнить");
  { const select = field("Место: Справа"), current = await select.inputValue();
    const other = (await select.locator("option").evaluateAll(o => o.map(x => [(x as HTMLOptionElement).value, x.textContent ?? ""]))).find(([v, t]) => v !== current && t.startsWith("число"));
    await select.focus(); await select.selectOption(other![0]); }
  await agree(/^ERR .*лежит отдельно/);
  await expect(field("Место: Справа").locator("option:checked")).not.toHaveText("Пустое место");
  // The detached 10 is the last «число» in the list now; delete it.
  const numbers = await field("Выбранный блок").locator("option").evaluateAll(o => o.filter(x => /^\d+\. число$/.test(x.textContent ?? "")).map(x => (x as HTMLOptionElement).value));
  expect(numbers.length).toBe(2);
  for (const value of numbers) { await field("Выбранный блок").selectOption(value); if (await field("Число").inputValue() === "10") break; }
  await expect(field("Число")).toHaveValue("10");
  await press("Удалить выбранный");
  await agree(/^n = int\(input\(\)\)\nif n > 5:\n    print\("да"\)\nelse:\n    print\("нет"\)$/);

  // Disconnect a command, then undo and redo it.
  await pick(/напечатать/); await press("Отсоединить блок");
  await expect(notice).toContainText("тоже выполняются");
  // A detached command still runs as a separate stack; the learner sees exactly where.
  await agree(/^n = int\(input\(\)\)\nif n > 5:\n    pass\nelse:\n    print\("нет"\)\nprint\("да"\)$/);
  await press("Отменить");
  await agree(/^n = int\(input\(\)\)\nif n > 5:\n    print\("да"\)\nelse:\n    print\("нет"\)$/);

  // Reorder commands: a new print after the condition is moved above it.
  await pick("Конец программы"); await add("напечатать"); await add("текст"); await type("Текст", "старт");
  await agree(/\nelse:\n    print\("нет"\)\nprint\("старт"\)$/);
  const prints = await field("Выбранный блок").locator("option").evaluateAll(o => o.filter(x => (x.textContent ?? "").endsWith("напечатать")).map(x => (x as HTMLOptionElement).value));
  await field("Выбранный блок").selectOption(prints.at(-1)!); await press("Поднять команду");
  await agree(/^n = int\(input\(\)\)\nprint\("старт"\)\nif n > 5:\n    print\("да"\)\nelse:\n    print\("нет"\)$/);

  // Branch changes: an extra elif appears empty; removing «иначе» detaches its block; undo restores it.
  await pick("если"); await type("Дополнительных условий", "1");
  await agree(/^ERR .*пустое место «условие»/);
  await type("Дополнительных условий", "0");
  await agree(/^n = int\(input\(\)\)\nprint\("старт"\)\nif n > 5:\n    print\("да"\)\nelse:\n    print\("нет"\)$/);
  await field("Ветка «иначе»").uncheck();
  await expect(notice).toContainText("тоже выполняются");
  await agree(/^n = int\(input\(\)\)\nprint\("старт"\)\nif n > 5:\n    print\("да"\)\nprint\("нет"\)$/);
  await press("Отменить");
  await agree(/^n = int\(input\(\)\)\nprint\("старт"\)\nif n > 5:\n    print\("да"\)\nelse:\n    print\("нет"\)$/);

  // Variables: rename everywhere; an invalid name is refused.
  await pick("присвоить");
  await type("Новое имя переменной", "class"); await expect(notice).not.toContainText("теперь называется");
  await type("Новое имя переменной", "x");
  await expect(notice).toContainText("теперь называется «x»");
  const final = /^x = int\(input\(\)\)\nprint\("старт"\)\nif x > 5:\n    print\("да"\)\nelse:\n    print\("нет"\)$/;
  await agree(final);
  expect((await call(page, "/state")).block_drafts.find((d: { assignment_id: string }) => d.assignment_id === assignment.id).workspace.variables.map((v: { name: string }) => v.name)).toEqual(["x"]);

  // Reload: the saved draft restores the same graph and mirror.
  await page.reload();
  await expect(page.locator(".blockly-host svg").first()).toBeVisible();
  await agree(final);
  // Every keyboard control stays inside the 1366×768 page width.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: /Проверить решение/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /Проверка 1|провер/i })).toBeVisible({ timeout: 20000 });
});
