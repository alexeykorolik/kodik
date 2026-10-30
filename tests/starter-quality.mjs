// Graded practice must not be publishable with a start that already passes (audit item 2).
import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./helpers/b2b-harness.mjs";

const PALETTE = ["kodik_input_int", "variables_set", "variables_get", "math_arithmetic", "math_number", "text_print"];
const doubled = (op = "MULTIPLY", withB = true) => ({ blocks: { languageVersion: 0, blocks: [{ type: "variables_set", id: "s", x: 0, y: 0, fields: { VAR: { id: "v" } }, inputs: { VALUE: { block: { type: "kodik_input_int", id: "i" } } }, next: { block: { type: "text_print", id: "p", inputs: { TEXT: { block: { type: "math_arithmetic", id: "m", fields: { OP: op }, inputs: { A: { block: { type: "variables_get", id: "g", fields: { VAR: { id: "v" } } } }, ...(withB ? { B: { block: { type: "math_number", id: "k", fields: { NUM: 2 } } } } : {}) } } } } } } }] }, variables: [{ name: "n", id: "v" }] });

test("a start that already passes blocks publication; incomplete starts are publishable", async (t) => {
  const h = await harness({ verifyPublications: false });
  try {
    const { admin } = await h.school("starter");
    const { lesson } = await h.content(admin);
    const base = { lesson_id: lesson.id, title: "Удвоим", description: "", goal: "Удвоить", theory: "", instruction: "Выведи удвоенное", difficulty: "easy", hints: [], check_mode: "tests", tests: [{ inputs: ["2"], expected: "4", hidden: false }, { inputs: ["21"], expected: "42", hidden: true }], learning_rules: ["input:1"], reference_solution: "n = int(input())\nprint(n * 2)", wrong_solutions: ["n = int(input())\nprint(n + 2)"] };
    const revisionOf = async (id) => (await h.request("/state", undefined, admin)).tasks.find((x) => x.id === id).revision;
    const verify = async (id) => h.request(`/tasks/${id}/verify`, { revision: await revisionOf(id) }, admin);

    await t.test("ready Python start: no approval, no publication, explained", async () => {
      const task = await h.request("/tasks", { ...base, starter: "n = int(input())\nprint(n * 2)\n" }, admin);
      const proof = await verify(task.id);
      assert.equal(proof.status, "solved_starter");
      assert.deepEqual(proof.starter.solved.map((s) => s.mode), ["python"]);
      assert.match(proof.message, /Заготовка уже решает задачу: стартовый код Python\./);
      await h.request(`/tasks/${task.id}/publish`, { published: true, revision: await revisionOf(task.id) }, admin, 409);
      // Commented copy is still a ready solution.
      await h.request(`/tasks/${task.id}`, { ...base, starter: "# готово\nn = int(input())\nprint(n * 2)", revision: await revisionOf(task.id) }, admin, 200, "PUT");
      assert.equal((await verify(task.id)).status, "solved_starter");
    });

    await t.test("ready block start in an allowed block mode: rejected", async () => {
      const task = await h.request("/tasks", { ...base, starter: "", learning_config: { modes: ["blocks", "mixed"], palette: PALETTE, starter_blocks: doubled() }, block_solution: doubled() }, admin);
      const proof = await verify(task.id);
      assert.equal(proof.status, "solved_starter");
      assert.deepEqual(proof.starter.solved.map((s) => s.mode), ["blocks"]);
      assert.match(proof.message, /Заготовка уже решает задачу: стартовые блоки\./);
      await h.request(`/tasks/${task.id}/publish`, { published: true, revision: await revisionOf(task.id) }, admin, 409);
    });

    await t.test("incomplete or rule-violating starts are a normal beginning", async () => {
      for (const [label, fields] of [
        ["empty", { starter: "" }],
        ["half program", { starter: "n = int(input())\n" }],
        ["passes output but breaks the learning rule", { starter: "print(4)" , tests: [{ inputs: ["2"], expected: "4", hidden: false }], wrong_solutions: ["print(5)"], reference_solution: "n = int(input())\nprint(n * 2)" }],
        ["empty socket in blocks", { starter: "", learning_config: { modes: ["blocks"], palette: PALETTE, starter_blocks: doubled("MULTIPLY", false) }, block_solution: doubled() }],
        ["wrong operation in blocks", { starter: "", learning_config: { modes: ["blocks"], palette: PALETTE, starter_blocks: doubled("ADD") }, block_solution: doubled() }],
      ]) {
        const task = await h.request("/tasks", { ...base, ...fields }, admin);
        const proof = await verify(task.id);
        assert.equal(proof.status, "approved", `${label}: ${JSON.stringify(proof.message)}`);
        await h.request(`/tasks/${task.id}/publish`, { published: true, revision: await revisionOf(task.id) }, admin);
      }
    });

    await t.test("manual work is not judged by its start", async () => {
      const task = await h.request("/tasks", { ...base, check_mode: "manual", manual_criteria: "Программа выводит приветствие.", tests: [], learning_rules: [], starter: "print('привет')" }, admin);
      assert.equal((await verify(task.id)).status, "approved");
    });
  } finally {
    await h.close();
  }
});
