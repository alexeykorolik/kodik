// Compatibility procedure for a changed checking environment (docs/adaptive/COMPATIBILITY.md).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { harness } from "./helpers/b2b-harness.mjs";

test("old-environment version: no silent reuse; explicit replay restores issuance; history kept", async () => {
  const h = await harness();
  try {
    const { admin } = await h.school("compat");
    const { lesson } = await h.content(admin);
    const group = await h.request("/groups", { title: "G" }, admin);
    const task = await h.task(admin, lesson);
    const published = await h.request(`/tasks/${task.id}/publish`, { published: true }, admin);
    const version = h.db.prepare("SELECT verification_id FROM task_versions WHERE id=?").get(published.version_id);
    // Simulate that the proof was produced by a previous checking environment.
    h.db.prepare("UPDATE task_verifications SET runtime_hash='py:previous-environment' WHERE id=?").run(version.verification_id);
    const refused = await h.request("/assignments", { group_id: group.id, task_id: task.id }, admin, 409);
    assert.match(refused.error, /новую ревизию/);
    const out = JSON.parse(execFileSync(process.execPath, ["scripts/reverify-published.mjs", "--db", h.dbPath], { encoding: "utf8" }));
    assert.equal(out.reverified, 1); assert.deepEqual(out.failed, []);
    await h.request("/assignments", { group_id: group.id, task_id: task.id }, admin);
    const again = JSON.parse(execFileSync(process.execPath, ["scripts/reverify-published.mjs", "--db", h.dbPath], { encoding: "utf8" }));
    assert.equal(again.current, 1); assert.equal(again.reverified, 0, "idempotent");
    assert.equal(h.db.prepare("SELECT runtime_hash FROM task_verifications WHERE id=?").get(version.verification_id).runtime_hash, "py:previous-environment", "original evidence untouched");
    assert.equal(h.db.prepare("SELECT verification_id FROM task_versions WHERE id=?").get(published.version_id).verification_id, version.verification_id, "published version unchanged");
  } finally { await h.close(); }
});
