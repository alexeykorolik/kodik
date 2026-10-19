// One published task, three solving modes, through the real HTTP API, queue and executor.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { harness } from "./helpers/b2b-harness.mjs";

let seq = 0;
const B = (type, fields = {}, inputs = {}, extra = {}) => ({ type, id: `b${++seq}`, ...(Object.keys(fields).length ? { fields } : {}), ...(Object.keys(inputs).length ? { inputs: Object.fromEntries(Object.entries(inputs).filter(([, v]) => v).map(([k, v]) => [k, { block: v }])) } : {}), ...extra });
const chain = (...bs) => { for (let i = bs.length - 2; i >= 0; i--) bs[i].next = { block: bs[i + 1] }; return bs[0]; };
const ws = (vars, ...roots) => ({ blocks: { languageVersion: 0, blocks: roots.map((r, i) => ({ x: 10, y: 10 + i * 100, ...r })) }, variables: vars.map((name) => ({ name, id: `v-${name}` })) });
const V = (name) => ({ id: `v-${name}` });
const set = (n, v) => B("variables_set", { VAR: V(n) }, { VALUE: v });
const get = (n) => B("variables_get", { VAR: V(n) });
const print = (v) => B("text_print", {}, { TEXT: v });
const num = (n) => B("math_number", { NUM: n });
const mul = (a, b, op = "MULTIPLY") => B("math_arithmetic", { OP: op }, { A: a, B: b });
const doubled = (op = "MULTIPLY", varName = "n") => ws([varName], chain(set(varName, B("kodik_input_int")), print(mul(get(varName), num(2), op))));
const PALETTE = ["kodik_input_int", "variables_set", "variables_get", "math_arithmetic", "math_number", "text_print"];
const tests = [{ inputs: ["2"], expected: "4", hidden: false }, { inputs: ["0"], expected: "0", hidden: false }, { inputs: ["21"], expected: "42", hidden: true }];

test("one task, three modes: publication proof, policy, drafts, queue, isolation", async (t) => {
  const h = await harness();
  try {
    const { admin } = await h.school("modes-a"), other = await h.school("modes-b");
    const { lesson } = await h.content(admin);
    const mkStudent = async (login, client = admin) => { const s = {}; const id = (await h.request("/users", { name: login, login, password: h.password, role: "student" }, client)).id; await h.request("/auth/login", { login, password: h.password }, s); return { s, id }; };
    const { s: student, id: uid } = await mkStudent("modes-student");
    const { s: classmate, id: classmateId } = await mkStudent("modes-classmate");
    const group = await h.request("/groups", { title: "7A" }, admin);
    const otherGroup = await h.request("/groups", { title: "7B" }, admin);
    await h.request(`/groups/${group.id}/members`, { user_id: uid }, admin);
    await h.request(`/groups/${otherGroup.id}/members`, { user_id: classmateId }, admin);
    const base = { lesson_id: lesson.id, title: "Удвоим число", description: "", goal: "Удвоить", theory: "", instruction: "Выведи удвоенное число", difficulty: "easy", starter: "", hints: [], check_mode: "tests", tests, learning_rules: ["input:1"], reference_solution: "n = int(input())\nprint(n * 2)", wrong_solutions: ["n = int(input())\nprint(n + 2)"] };

    let blockTask;
    await t.test("publication needs a block solution that passes through the learner path", async () => {
      const config = { modes: ["blocks", "mixed"], palette: PALETTE, skills: ["input", "variables", "arithmetic", "output"] };
      blockTask = await h.request("/tasks", { ...base, learning_config: config }, admin);
      let state = await h.request("/state", undefined, admin);
      let row = state.tasks.find((x) => x.id === blockTask.id);
      await h.request(`/tasks/${blockTask.id}/publish`, { published: true, revision: row.revision }, admin, 400);
      // Wrong block solution: rejected by the same tests.
      await h.request(`/tasks/${blockTask.id}`, { ...base, learning_config: config, block_solution: doubled("ADD"), revision: row.revision }, admin, 200, "PUT");
      state = await h.request("/state", undefined, admin); row = state.tasks.find((x) => x.id === blockTask.id);
      let proof = await h.request(`/tasks/${blockTask.id}/verify`, { revision: row.revision }, admin);
      assert.equal(proof.status, "bad_block_solution"); assert.match(proof.block.message, /не проходит тесты/);
      // Block outside the palette.
      await h.request(`/tasks/${blockTask.id}`, { ...base, learning_config: { ...config, palette: PALETTE.filter((p) => p !== "math_arithmetic") }, block_solution: doubled(), revision: row.revision }, admin, 200, "PUT");
      state = await h.request("/state", undefined, admin); row = state.tasks.find((x) => x.id === blockTask.id);
      proof = await h.request(`/tasks/${blockTask.id}/verify`, { revision: row.revision }, admin);
      assert.equal(proof.status, "bad_block_solution"); assert.match(proof.block.message, /не входит в набор/);
      // Correct: approved; publish succeeds (harness verifies again before publishing).
      await h.request(`/tasks/${blockTask.id}`, { ...base, learning_config: config, block_solution: doubled("MULTIPLY", "секретобразца"), revision: row.revision }, admin, 200, "PUT");
      await h.request(`/tasks/${blockTask.id}/publish`, { published: true }, admin);
      state = await h.request("/state", undefined, admin); row = state.tasks.find((x) => x.id === blockTask.id);
      const history = await h.request(`/tasks/${blockTask.id}/verifications`, undefined, admin);
      assert.equal(history.items[0].block_result.status, "approved");
      assert.match(history.items[0].runtime_hash, /^py:[a-f0-9]{32}\+bl:/);
      // Changing the palette invalidates the approval.
      await h.request(`/tasks/${blockTask.id}`, { ...base, learning_config: { ...config, palette: [...PALETTE, "text"] }, block_solution: doubled("MULTIPLY", "секретобразца"), revision: row.revision }, admin, 200, "PUT");
      state = await h.request("/state", undefined, admin); row = state.tasks.find((x) => x.id === blockTask.id);
      assert.equal(row.verification, null, "palette change requires a new check");
      await h.request(`/tasks/${blockTask.id}/publish`, { published: true }, admin);
    });

    await t.test("Python reference that has no block form can still get a block mode via an equivalent block solution", async () => {
      const ref = "n = int(input())\nfor i in range(n):\n    print(n)";
      const whileSolution = ws(["n", "k"], chain(set("n", B("kodik_input_int")), set("k", num(0)), B("controls_whileUntil", { MODE: "WHILE" }, { BOOL: B("logic_compare", { OP: "LT" }, { A: get("k"), B: get("n") }), DO: chain(print(get("n")), B("math_change", { VAR: V("k") }, { DELTA: num(1) })) })));
      const tsk = await h.request("/tasks", { ...base, title: "n раз", tests: [{ inputs: ["2"], expected: "2\n2", hidden: false }, { inputs: ["3"], expected: "3\n3\n3", hidden: true }], learning_rules: [], reference_solution: ref, wrong_solutions: ["print(1)"], learning_config: { modes: ["blocks"], palette: ["kodik_input_int", "variables_set", "variables_get", "math_number", "text_print", "controls_whileUntil", "logic_compare", "math_change"] }, block_solution: whileSolution }, admin);
      await h.request(`/tasks/${tsk.id}/publish`, { published: true }, admin);
    });

    const legacy = await h.task(admin, lesson);
    await h.request(`/tasks/${legacy.id}/publish`, { published: true }, admin);
    const assignment = await h.request("/assignments", { group_id: group.id, task_id: blockTask.id, mode_policy: { allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "free" } }, admin);
    const legacyAssignment = await h.request("/assignments", { group_id: group.id, task_id: legacy.id }, admin);
    const mine = async () => (await h.request("/state", undefined, student)).tasks.find((x) => x.assignment_id === assignment.id);

    await t.test("learner data: modes, palette and starter only; nothing private", async () => {
      const state = await h.request("/state", undefined, student);
      const row = state.tasks.find((x) => x.assignment_id === assignment.id);
      assert.deepEqual(row.modes, { supported: ["blocks", "mixed", "python"], allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "free", current: "blocks", offered: null });
      assert.ok(row.learning.palette.includes("math_arithmetic") && row.learning.palette.includes("text"), "palette of the published version");
      const raw = JSON.stringify(state);
      for (const secret of ["секретобразца", "block_solution", "reference_solution", "wrong_solutions", '"skills"', "n + 2", '"21"', '"42"']) assert.ok(!raw.includes(secret), `learner state leaks ${secret}`);
      const legacyRow = state.tasks.find((x) => x.assignment_id === legacyAssignment.id);
      assert.deepEqual(legacyRow.modes, { supported: ["python"], allowed: ["python"], start: "python", switching: "locked", current: "python", offered: null }, "old Python tasks stay Python-only");
    });

    await t.test("blocks: incomplete draft is saved and restored; run explains; tabs conflict keeps both", async () => {
      const incomplete = ws(["n"], chain(set("n", B("kodik_input_int")), B("text_print")));
      const saved = await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "blocks", workspace: incomplete, revision: 0 }, student, 200, "PUT");
      const state = await h.request("/state", undefined, student);
      assert.deepEqual(state.block_drafts.find((d) => d.assignment_id === assignment.id).workspace, incomplete);
      const run = await h.request(`/tasks/${blockTask.id}/run`, { assignment_id: assignment.id, mode: "blocks", workspace: incomplete, inputs: ["2"] }, student, 422);
      assert.match(run.error, /пустое место/);
      await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "blocks", workspace: doubled("ADD"), revision: 0 }, student, 409, "PUT");
      await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "blocks", workspace: { blocks: { blocks: [{ type: "evil" }] } }, revision: saved.revision }, student, 400, "PUT");
      const ok = await h.request(`/tasks/${blockTask.id}/run`, { assignment_id: assignment.id, mode: "blocks", workspace: doubled("ADD"), inputs: ["5"], code: "print(10)" }, student);
      assert.deepEqual(ok.output, ["7"], "client Python is ignored; the blocks ran");
      assert.equal(ok.python, "n = int(input())\nprint(n + 2)\n", "mirror equals the program that ran");
      const outdated = await h.request(`/tasks/${blockTask.id}/run`, { assignment_id: assignment.id, mode: "blocks", workspace: doubled(), inputs: ["5"], client_translator: "blocks-py/0" }, student, 409);
      assert.equal(outdated.code, "client_outdated");
      await h.request(`/tasks/${blockTask.id}/run`, { assignment_id: assignment.id, mode: "blocks", workspace: doubled(), inputs: ["5"], client_translator: "blocks-py/1" }, student);
    });

    const submit = async (body, client = student, key = randomUUID(), expected = 200) => {
      let job = await h.request(`/tasks/${blockTask.id}/submit`, { assignment_id: assignment.id, request_key: key, ...body }, client, expected);
      if (expected !== 200) return job;
      while (!["completed", "cancelled"].includes(job.status)) { await new Promise((r) => setTimeout(r, 25)); job = await h.request(`/submissions/${job.id}`, undefined, client); }
      return { ...job, key };
    };

    await t.test("submission: forged Python ignored, three modes recorded, idempotent keys", async () => {
      const forged = await submit({ mode: "blocks", workspace: doubled("ADD"), code: "n = int(input())\nprint(n * 2)" });
      assert.equal(forged.result.status, "failed");
      const exact = doubled();
      const passed = await submit({ mode: "blocks", workspace: exact });
      assert.equal(passed.result.status, "passed");
      const replay = await h.request(`/tasks/${blockTask.id}/submit`, { assignment_id: assignment.id, request_key: passed.key, mode: "blocks", workspace: exact }, student);
      assert.equal(replay.id, passed.id, "same key, same blocks → same operation");
      const conflict = await h.request(`/tasks/${blockTask.id}/submit`, { assignment_id: assignment.id, request_key: passed.key, mode: "blocks", workspace: doubled("ADD") }, student, 409);
      assert.equal(conflict.code, "request_key_reused");
      await h.request(`/tasks/${blockTask.id}/submit`, { assignment_id: assignment.id, request_key: passed.key, mode: "mixed", workspace: exact }, student, 409);
      const mixed = await submit({ mode: "mixed", workspace: doubled() });
      assert.equal(mixed.result.status, "passed");
      await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "python", code: "n = int(input())\n", revision: 0 }, student, 200, "PUT");
      const py = await submit({ mode: "python", code: "n = int(input())\nprint(2 * n)" });
      assert.equal(py.result.status, "passed");
      const attempts = h.db.prepare("SELECT mode,code,source,translator,policy,version_id FROM attempts WHERE assignment_id=? ORDER BY created_at").all(assignment.id);
      assert.deepEqual(attempts.map((a) => a.mode), ["blocks", "blocks", "mixed", "python"]);
      assert.equal(attempts[0].code, "n = int(input())\nprint(n + 2)\n", "attempt stores server-generated Python");
      assert.ok(attempts[0].source && attempts[0].translator === "blocks-py/1" && JSON.parse(attempts[0].policy).current === "blocks");
      assert.equal(attempts[3].source, null);
      const st = await h.request("/state", undefined, student);
      assert.ok(st.drafts.find((d) => d.assignment_id === assignment.id).code.startsWith("n = int"), "Python draft is separate");
      assert.ok(st.block_drafts.find((d) => d.assignment_id === assignment.id), "block draft untouched by Python work");
    });

    await t.test("policy: closed mode keeps the draft, blocks run/submit; teacher offer and override", async () => {
      await h.request(`/assignments/${assignment.id}/mode-policy`, { allowed: ["blocks"], start: "python", switching: "locked" }, admin, 400, "PUT");
      await h.request(`/assignments/${legacyAssignment.id}/mode-policy`, { allowed: ["blocks", "python"], start: "python", switching: "free" }, admin, 400, "PUT");
      await h.request(`/assignments/${assignment.id}/mode-policy`, { allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "teacher", reason: "Сначала блоки" }, admin, 200, "PUT");
      let row = await mine();
      assert.equal(row.modes.current, "blocks");
      const sw = await h.request(`/assignments/${assignment.id}/mode`, { mode: "python" }, student, 409);
      assert.equal(sw.code, "mode_switch_required");
      const blockedRun = await h.request(`/tasks/${blockTask.id}/run`, { assignment_id: assignment.id, mode: "python", code: "print(1)", inputs: [] }, student, 409);
      assert.equal(blockedRun.code, "mode_switch_required");
      await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "python", code: "n = int(input())\nprint(n)", revision: (await h.request("/state", undefined, student)).drafts.find((d) => d.assignment_id === assignment.id).revision }, student, 200, "PUT");
      await h.request(`/assignments/${assignment.id}/students/${uid}/mode`, { offer: "mixed", reason: "Готов увидеть код" }, admin, 200, "PUT");
      row = await mine(); assert.equal(row.modes.offered, "mixed"); assert.equal(row.modes.current, "blocks", "an offer never switches by itself");
      await h.request(`/assignments/${assignment.id}/mode`, { mode: "mixed" }, student);
      row = await mine(); assert.equal(row.modes.current, "mixed"); assert.equal(row.modes.offered, null);
      await h.request(`/assignments/${assignment.id}/mode-policy`, { allowed: ["blocks"], start: "blocks", switching: "locked" }, admin, 200, "PUT");
      row = await mine(); assert.equal(row.modes.current, "blocks", "closed mode → back to an allowed one only in the effective view");
      const closed = await h.request(`/tasks/${blockTask.id}/submit`, { assignment_id: assignment.id, request_key: randomUUID(), mode: "python", code: "print(1)" }, student, 409);
      assert.equal(closed.code, "mode_not_allowed");
      await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "python", code: "print('мой код')", revision: (await h.request("/state", undefined, student)).drafts.find((d) => d.assignment_id === assignment.id).revision }, student, 200, "PUT");
      await h.request(`/assignments/${assignment.id}/students/${uid}/mode`, { override: { allowed: ["blocks", "python"], switching: "free" }, reason: "Индивидуально" }, admin, 200, "PUT");
      await h.request(`/assignments/${assignment.id}/mode`, { mode: "python" }, student);
      assert.equal((await submit({ mode: "python", code: "n = int(input())\nprint(n * 2)" })).result.status, "passed");
      await h.request(`/assignments/${assignment.id}/students/${uid}/mode`, { override: { allowed: ["mixed"] } }, admin, 200, "PUT");
      await h.request(`/assignments/${assignment.id}/students/${classmateId}/mode`, { offer: "blocks" }, admin, 404, "PUT");
      const overview = await h.request(`/assignments/${assignment.id}/modes`, undefined, admin);
      assert.ok(overview.events.some((e) => e.kind === "offer_accepted") && overview.events.some((e) => e.kind === "policy_changed" && e.reason === "Сначала блоки"));
      assert.equal(overview.learners.find((l) => l.id === uid).modes.current, "mixed");
      await h.request(`/assignments/${assignment.id}/students/${uid}/mode`, { clear_override: true }, admin, 200, "PUT");
      await h.request(`/assignments/${assignment.id}/mode-policy`, { allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "free" }, admin, 200, "PUT");
    });

    await t.test("isolation: other school and other group get nothing", async () => {
      await h.request(`/assignments/${assignment.id}/mode-policy`, { allowed: ["python"], start: "python", switching: "locked" }, other.admin, 404, "PUT");
      await h.request(`/assignments/${assignment.id}/modes`, undefined, other.admin, 404);
      await h.request(`/assignments/${assignment.id}/students/${uid}/mode`, { offer: "python" }, other.admin, 404, "PUT");
      await h.request(`/assignments/${assignment.id}/mode`, { mode: "python" }, classmate, 404);
      await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "blocks", workspace: doubled(), revision: 0 }, classmate, 404, "PUT");
      await h.request(`/tasks/${blockTask.id}/run`, { assignment_id: assignment.id, mode: "blocks", workspace: doubled(), inputs: [] }, classmate, 404);
      const leak = JSON.stringify(await h.request("/state", undefined, classmate));
      assert.ok(!leak.includes(assignment.id) && !leak.includes("Удвоим"), "classmate in another group sees nothing of 7A");
      const bState = JSON.stringify(await h.request("/state", undefined, other.admin));
      assert.ok(!bState.includes(blockTask.id) && !bState.includes(uid));
      const job = h.db.prepare("SELECT id FROM submission_jobs WHERE assignment_id=? LIMIT 1").get(assignment.id);
      await h.request(`/submissions/${job.id}`, undefined, classmate, 404);
      await h.request(`/submissions/${job.id}`, undefined, other.admin, 404);
    });

    await t.test("queue: accepted work survives restart; policy change does not re-grade; revoked access cancels without a failure", async () => {
      const done = h.db.prepare("SELECT * FROM submission_jobs WHERE assignment_id=? AND mode='blocks' AND json_extract(result,'$.status')='passed' LIMIT 1").get(assignment.id);
      const clone = (id, key) => h.db.prepare("INSERT INTO submission_jobs(id,org_id,user_id,task_id,request_key,code,snapshot,status,created_at,updated_at,assignment_id,version_id,mode,source,translator,policy) VALUES(?,?,?,?,?,?,?,'queued',?,?,?,?,?,?,?,?)").run(id, done.org_id, done.user_id, done.task_id, key, done.code, done.snapshot, new Date().toISOString(), new Date().toISOString(), done.assignment_id, done.version_id, done.mode, done.source, done.translator, done.policy);
      clone("recovered-job-1", "recovered-key-0001");
      // Policy narrowed while the job waits: it must still be graded by the accepted context.
      h.db.prepare("UPDATE assignments SET mode_policy=? WHERE id=?").run(JSON.stringify({ allowed: ["python"], start: "python", switching: "locked" }), assignment.id);
      await h.restart();
      let job; for (let i = 0; i < 200; i++) { job = await h.request("/submissions/recovered-job-1", undefined, student); if (job.status === "completed") break; await new Promise((r) => setTimeout(r, 25)); }
      assert.equal(job.result.status, "passed"); assert.equal(job.mode, "blocks");
      assert.equal(h.db.prepare("SELECT mode FROM attempts WHERE id='recovered-job-1'").get().mode, "blocks");
      h.db.prepare("UPDATE assignments SET mode_policy=? WHERE id=?").run(JSON.stringify({ allowed: ["blocks", "mixed", "python"], start: "blocks", switching: "free" }), assignment.id);
      clone("revoked-job-1", "revoked-key-00001");
      await h.request(`/groups/${group.id}/members`, { user_id: uid }, admin, 200, "DELETE");
      await h.restart();
      for (let i = 0; i < 200; i++) { job = h.db.prepare("SELECT status,result FROM submission_jobs WHERE id='revoked-job-1'").get(); if (job.status !== "queued") break; await new Promise((r) => setTimeout(r, 25)); }
      assert.equal(job.status, "cancelled");
      assert.equal(JSON.parse(job.result).reason, "access_revoked");
      assert.equal(h.db.prepare("SELECT COUNT(*) n FROM attempts WHERE id='revoked-job-1'").get().n, 0, "no learner failure recorded");
      const blocked = await h.request(`/tasks/${blockTask.id}/draft`, { assignment_id: assignment.id, mode: "blocks", workspace: doubled(), revision: 99 }, student, 404, "PUT");
      assert.ok(blocked.error);
      await h.request(`/groups/${group.id}/members`, { user_id: uid }, admin);
      const back = (await h.request("/state", undefined, student)).block_drafts.find((d) => d.assignment_id === assignment.id);
      assert.ok(back, "own draft is back with access");
    });

    await t.test("repeat assignment is a fresh pass: no drafts, no mode state", async () => {
      const repeat = await h.request("/assignments", { group_id: group.id, task_id: blockTask.id, repeat_of: assignment.id, mode_policy: { allowed: ["python"], start: "python", switching: "locked" } }, admin);
      const st = await h.request("/state", undefined, student);
      assert.ok(!st.block_drafts.some((d) => d.assignment_id === repeat.id) && !st.drafts.some((d) => d.assignment_id === repeat.id));
      assert.equal(st.tasks.find((x) => x.assignment_id === repeat.id).modes.current, "python");
      assert.equal(h.db.prepare("SELECT COUNT(*) n FROM attempts WHERE assignment_id=?").get(repeat.id).n, 0);
    });
  } finally {
    await h.close();
  }
});
