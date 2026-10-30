// Compatibility of the checking environment for new issuance AND for already issued work, and
// recovery of an accepted submission after the licence ended (audit items 4 and 5).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { harness } from "./helpers/b2b-harness.mjs";

const reverify = (h) => JSON.parse(execFileSync(process.execPath, ["scripts/reverify-published.mjs", "--db", h.dbPath], { encoding: "utf8" }));

async function setup(h, tag) {
  const { admin } = await h.school(tag);
  const { lesson } = await h.content(admin);
  const group = await h.request("/groups", { title: "G" }, admin);
  const learner = await h.request("/users", { name: "Ученик", login: `${tag}-kid`, password: h.password, role: "student" }, admin), kid = {};
  await h.request(`/groups/${group.id}/members`, { user_id: learner.id }, admin);
  await h.request("/auth/login", { login: `${tag}-kid`, password: h.password }, kid);
  const task = await h.task(admin, lesson);
  const published = await h.request(`/tasks/${task.id}/publish`, { published: true }, admin);
  const assignment = await h.request("/assignments", { group_id: group.id, task_id: task.id }, admin);
  return { admin, group, learner, kid, task, published, assignment };
}
const wait = async (h, client, id, until = ["completed", "cancelled", "held"]) => { let job; for (let i = 0; i < 300; i++) { job = await h.request(`/submissions/${id}`, undefined, client); if (until.includes(job.status)) return job; await new Promise((r) => setTimeout(r, 25)); } return job; };
const CODE = "n = int(input())\nprint(n * 2)";

test("environment compatibility covers new issuance and already issued work; history kept", async () => {
  const h = await harness();
  try {
    const { admin, group, kid, task, published, assignment } = await setup(h, "compat");
    const first = await h.request(`/tasks/${task.id}/submit`, { assignment_id: assignment.id, mode: "python", code: CODE, request_key: randomUUID() }, kid);
    const done = await wait(h, kid, first.id);
    assert.equal(done.result.status, "passed");
    assert.match(done.runtime, /^py:[a-f0-9]{32}:node\d+$/, "new results record the environment that produced them");
    const proofId = h.db.prepare("SELECT verification_id FROM task_versions WHERE id=?").get(published.version_id).verification_id;

    // The checking environment changed: the version's proof belongs to another environment.
    h.db.prepare("UPDATE task_verifications SET runtime_hash='py:previous-environment:node22' WHERE id=?").run(proofId);
    h.db.prepare("UPDATE attempts SET runtime='py:previous-environment:node22' WHERE id=?").run(first.id);
    assert.match((await h.request("/assignments", { group_id: group.id, task_id: task.id, repeat_of: assignment.id }, admin, 409)).error, /новую ревизию/);
    const run = await h.request(`/tasks/${task.id}/run`, { assignment_id: assignment.id, mode: "python", code: CODE, inputs: ["2"] }, kid, 409);
    assert.equal(run.code, "runtime_unconfirmed"); assert.match(run.error, /Черновик сохраняется/);
    const submit = await h.request(`/tasks/${task.id}/submit`, { assignment_id: assignment.id, mode: "python", code: CODE, request_key: randomUUID() }, kid, 409);
    assert.equal(submit.code, "runtime_unconfirmed");
    await h.request(`/tasks/${task.id}/draft`, { assignment_id: assignment.id, mode: "python", code: "n = int(input())\n", revision: 0 }, kid, 200, "PUT");

    // Work accepted before the update (queued) is held after restart: no new learning result.
    const queued = h.db.prepare("SELECT * FROM submission_jobs WHERE id=?").get(first.id);
    h.db.prepare("INSERT INTO submission_jobs(id,org_id,user_id,task_id,request_key,code,snapshot,status,created_at,updated_at,assignment_id,version_id,mode,source,translator,policy) VALUES(?,?,?,?,?,?,?,'queued',?,?,?,?,?,?,?,?)").run("accepted-before-update", queued.org_id, queued.user_id, queued.task_id, "accepted-before-key", queued.code, queued.snapshot, new Date().toISOString(), new Date().toISOString(), queued.assignment_id, queued.version_id, queued.mode, queued.source, queued.translator, queued.policy);
    await h.restart();
    const held = await wait(h, kid, "accepted-before-update");
    assert.equal(held.status, "held"); assert.equal(held.result.reason, "runtime_unconfirmed"); assert.match(held.result.message, /не ошибка вашей программы/);
    assert.equal(h.db.prepare("SELECT COUNT(*) n FROM attempts WHERE id='accepted-before-update'").get().n, 0);
    await h.restart();
    assert.equal((await wait(h, kid, "accepted-before-update")).status, "held", "still held after another restart");

    // A dry run only reports: the held work stays held and nothing is recorded (audit P2).
    const snapshot = () => JSON.stringify([h.db.prepare("SELECT id,status,updated_at FROM submission_jobs ORDER BY id").all(), h.db.prepare("SELECT COUNT(*) n FROM audit_log").get(), h.db.prepare("SELECT COUNT(*) n FROM task_verifications").get(), h.db.prepare("SELECT id,verification_id FROM task_versions ORDER BY id").all()]);
    const before = snapshot();
    const dry = JSON.parse(execFileSync(process.execPath, ["scripts/reverify-published.mjs", "--db", h.dbPath, "--dry-run"], { encoding: "utf8" }));
    assert.equal(dry.dry_run, true); assert.equal(dry.reverified, 0); assert.equal(dry.released, undefined);
    assert.equal(dry.failed.length, 1); assert.equal(dry.failed[0].held, 1);
    assert.equal(snapshot(), before, "dry run changed the database");
    await new Promise((r) => setTimeout(r, 700));
    assert.equal((await wait(h, kid, "accepted-before-update")).status, "held", "dry run must not resume held work");
    // Explicit compatibility procedure restores checking without touching history.
    const out = reverify(h);
    assert.equal(out.reverified, 1); assert.equal(out.released, 1);
    const released = await wait(h, kid, "accepted-before-update", ["completed"]);
    assert.equal(released.result.status, "passed");
    assert.match(h.db.prepare("SELECT runtime FROM attempts WHERE id='accepted-before-update'").get().runtime, /^py:[a-f0-9]{32}:node\d+$/);
    assert.equal(h.db.prepare("SELECT runtime FROM attempts WHERE id=?").get(first.id).runtime, "py:previous-environment:node22", "historical result keeps its environment");
    assert.equal(h.db.prepare("SELECT runtime_hash FROM task_verifications WHERE id=?").get(proofId).runtime_hash, "py:previous-environment:node22");
    assert.equal(h.db.prepare("SELECT verification_id FROM task_versions WHERE id=?").get(published.version_id).verification_id, proofId, "published snapshot unchanged");
    await h.request(`/tasks/${task.id}/run`, { assignment_id: assignment.id, mode: "python", code: CODE, inputs: ["2"] }, kid);
    assert.equal(reverify(h).reverified, 0, "idempotent");

    // The version is already confirmed, but work is still held (e.g. held before another process
    // confirmed it). A dry run only reports that a normal run would resume it; nothing changes.
    const template = h.db.prepare("SELECT * FROM submission_jobs WHERE id='accepted-before-update'").get();
    h.db.prepare("INSERT INTO submission_jobs(id,org_id,user_id,task_id,request_key,code,snapshot,status,created_at,updated_at,assignment_id,version_id,mode,source,translator,policy) VALUES(?,?,?,?,?,?,?,'held',?,?,?,?,?,?,?,?)").run("held-while-current", template.org_id, template.user_id, template.task_id, "held-while-current-key", template.code, template.snapshot, new Date().toISOString(), new Date().toISOString(), template.assignment_id, template.version_id, template.mode, template.source, template.translator, template.policy);
    const beforeDry = snapshot();
    const report = JSON.parse(execFileSync(process.execPath, ["scripts/reverify-published.mjs", "--db", h.dbPath, "--dry-run"], { encoding: "utf8" }));
    assert.equal(report.dry_run, true); assert.equal(report.would_release, 1); assert.equal(report.released, undefined); assert.equal(report.reverified, 0);
    assert.equal(snapshot(), beforeDry, "dry run changed the database");
    assert.equal(h.db.prepare("SELECT status FROM submission_jobs WHERE id='held-while-current'").get().status, "held");
    const real = reverify(h);
    assert.equal(real.released, 1);
    assert.equal((await wait(h, kid, "held-while-current", ["completed"])).result.status, "passed");
  } finally { await h.close(); }
});

test("accepted submission is recoverable after the licence ended; nothing new is accepted", async () => {
  const h = await harness();
  try {
    const { admin, group, learner, kid, task, assignment } = await setup(h, "licence");
    const key = randomUUID(), body = { assignment_id: assignment.id, mode: "python", code: CODE, request_key: key };
    const accepted = await h.request(`/tasks/${task.id}/submissions`, body, kid);
    await wait(h, kid, accepted.id, ["completed"]);
    const org = h.db.prepare("SELECT org_id FROM users WHERE id=?").get(learner.id).org_id;
    h.db.prepare("UPDATE licenses SET expires_at='2000-01-01T00:00:00.000Z' WHERE org_id=?").run(org);
    // The client lost the first answer and retries the very same request.
    const again = await h.request(`/tasks/${task.id}/submissions`, body, kid);
    assert.equal(again.id, accepted.id); assert.equal(again.replayed, true); assert.equal(again.status, "completed");
    const viaSubmit = await h.request(`/tasks/${task.id}/submit`, body, kid);
    assert.equal(viaSubmit.id, accepted.id);
    assert.equal(h.db.prepare("SELECT COUNT(*) n FROM attempts WHERE user_id=?").get(learner.id).n, 1, "no new attempt");
    assert.equal((await h.request(`/tasks/${task.id}/submissions`, { ...body, code: "print(1)" }, kid, 409)).code, "request_key_reused", "changed solution is not accepted");
    assert.equal((await h.request(`/tasks/${task.id}/submissions`, { ...body, assignment_id: randomUUID() }, kid, 409)).code, "request_key_reused", "another assignment is not accepted");
    assert.equal((await h.request(`/tasks/${task.id}/submissions`, { ...body, request_key: randomUUID() }, kid, 403)).code, "license_expired", "new work needs a valid licence");
    await h.request(`/tasks/${task.id}/draft`, { assignment_id: assignment.id, mode: "python", code: CODE, revision: 0 }, kid, 200, "PUT");
    // Revoking the learner's access to the assignment is a different event from the licence ending.
    h.db.prepare("UPDATE licenses SET expires_at='2099-01-01T00:00:00.000Z' WHERE org_id=?").run(org);
    await h.request(`/groups/${group.id}/members`, { user_id: learner.id }, admin, 200, "DELETE");
    assert.equal((await h.request(`/tasks/${task.id}/submissions`, body, kid)).id, accepted.id, "own accepted operation stays readable");
    await h.request(`/tasks/${task.id}/submissions`, { ...body, request_key: randomUUID() }, kid, 404);
    // Revoking the account ends the session: nothing can be submitted or replayed.
    await h.request(`/users/${learner.id}/access`, { active: false }, admin);
    await h.request(`/tasks/${task.id}/submissions`, body, kid, 401);
  } finally { await h.close(); }
});

test("a published version that cannot be re-confirmed is reported with its reason and stays stopped", async () => {
  const h = await harness();
  try {
    const { group, kid, task, published, assignment, admin } = await setup(h, "compat-fail");
    const first = await h.request(`/tasks/${task.id}/submit`, { assignment_id: assignment.id, mode: "python", code: CODE, request_key: randomUUID() }, kid);
    assert.equal((await wait(h, kid, first.id)).result.status, "passed");
    const proofId = h.db.prepare("SELECT verification_id FROM task_versions WHERE id=?").get(published.version_id).verification_id;
    h.db.prepare("UPDATE task_verifications SET runtime_hash='py:previous-environment:node22' WHERE id=?").run(proofId);
    // The recorded proof no longer matches any stored snapshot, so it cannot be replayed (versions themselves are immutable).
    h.db.prepare("UPDATE task_verifications SET fingerprint='lost' WHERE id=?").run(proofId);
    let out;
    try { execFileSync(process.execPath, ["scripts/reverify-published.mjs", "--db", h.dbPath], { encoding: "utf8" }); assert.fail("must exit with an error"); }
    catch (e) { out = JSON.parse(e.stdout); }
    assert.equal(out.reverified, 0); assert.equal(out.failed.length, 1);
    assert.equal(out.failed[0].version, published.version_id); assert.match(out.failed[0].message, /снимок/, "the reason is reported");
    // New grades stay stopped for this version; history is untouched; the draft can still be saved.
    assert.equal((await h.request(`/tasks/${task.id}/submit`, { assignment_id: assignment.id, mode: "python", code: CODE, request_key: randomUUID() }, kid, 409)).code, "runtime_unconfirmed");
    assert.equal(h.db.prepare("SELECT status FROM attempts WHERE id=?").get(first.id).status, "passed");
    await h.request(`/tasks/${task.id}/draft`, { assignment_id: assignment.id, mode: "python", code: "print(1)\n", revision: 0 }, kid, 200, "PUT");
    void group; void admin;
  } finally { await h.close(); }
});
