// Compatibility procedure for a change of the checking chain (interpreter, learning rules or
// translator semantics, or the switch from bundle hashes to semantic identities).
//
// For every published task version whose proof was made in another environment, it REPLAYS the
// recorded verification of that exact snapshot in the current environment (reference, wrong
// examples and, for block tasks, the block solution through the learner path). Only if the
// replay is approved does the version point to the new proof. Old verifications, attempts and
// results are never rewritten: history keeps the environment it was produced in.
//
// Usage: npm run build:runner && node scripts/reverify-published.mjs [--db path] [--dry-run]
// --dry-run opens the database read-only: no migration, no released work, no new proofs — only a report
// of what a normal run would do.
import { DatabaseSync } from "node:sqlite";
import { openDatabase, schemaVersion } from "../server/b2b/database.mjs";
import { createTaskQuality, runtimeFor } from "../server/b2b/task-quality.mjs";
import { executionQueue } from "../server/b2b/grader.mjs";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const dbPath = args.includes("--db") ? args[args.indexOf("--db") + 1] : process.env.KODIK_DB || "data/kodik.sqlite";
const dryRun = args.includes("--dry-run");
let db;
if (dryRun) {
  db = new DatabaseSync(dbPath, { readOnly: true });
  const found = db.prepare("PRAGMA user_version").get().user_version;
  if (found !== schemaVersion) { db.close(); console.log(JSON.stringify({ dry_run: true, error: `База в схеме ${found}, приложение — ${schemaVersion}. Предварительная проверка базу не меняет: сначала обновите приложение (миграция при запуске), затем повторите.` }, null, 2)); process.exit(1); }
} else db = openDatabase(dbPath);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const own = (table, id, u) => { const row = db.prepare(`SELECT * FROM ${table} WHERE id=? AND org_id=?`).get(id, u.org_id); if (!row) fail(404, "not found"); return row; };
const tx = (fn) => { db.exec("BEGIN IMMEDIATE"); try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; } };
const quality = createTaskQuality({ db, own, teacher: () => {}, fail, tx, validateTask: () => {}, limit: () => {} });

const versions = db.prepare("SELECT v.id,v.org_id,v.task_id,v.revision,v.snapshot,v.verification_id,p.runtime_hash,p.author_id FROM task_versions v LEFT JOIN task_verifications p ON p.id=v.verification_id ORDER BY v.created_at").all();
const report = { ...(dryRun ? { dry_run: true } : {}), checked: 0, current: 0, reverified: 0, failed: [], without_proof: 0 };
const held = (version) => db.prepare("SELECT COUNT(*) n FROM submission_jobs WHERE status='held' AND version_id=?").get(version).n;
const release = (version) => db.prepare("UPDATE submission_jobs SET status='queued',updated_at=? WHERE status='held' AND version_id=?").run(new Date().toISOString(), version).changes;
for (const v of versions) {
  report.checked++;
  const snapshot = JSON.parse(v.snapshot);
  if (!v.verification_id) { report.without_proof++; continue; }
  const author = db.prepare("SELECT id,org_id,role FROM users WHERE id=?").get(v.author_id);
  let current = false;
  try { quality.assertPublishedVersion(v.id, author); current = true; } catch { /* needs a replay in this environment */ }
  if (current) {
    report.current++;
    if (dryRun) report.would_release = (report.would_release || 0) + held(v.id);
    else report.released = (report.released || 0) + release(v.id);
    continue;
  }
  if (dryRun) { report.failed.push({ version: v.id, reason: "needs re-verification (dry run)", held: held(v.id) }); continue; }
  try {
    const result = await quality.handle(`/api/tasks/${v.task_id}/verify`, "POST", { verification_id: v.verification_id, revision: v.revision }, author);
    if (result.status !== "approved") { report.failed.push({ version: v.id, task: snapshot.title, status: result.status, message: result.message }); continue; }
    // Versions are immutable: the replay itself (same revision + fingerprint, current runtime) is
    // what assertPublishedVersion accepts for new issuance.
    tx(() => {
      // Work accepted while this version was unconfirmed is checked now by the confirmed environment.
      report.released = (report.released || 0) + release(v.id);
      db.prepare("INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)").run(randomUUID(), v.org_id, author.id, "task.version_reverified", v.id, JSON.stringify({ previous_verification: v.verification_id, verification_id: result.id, previous_runtime: v.runtime_hash, runtime: runtimeFor(snapshot) }), new Date().toISOString());
    });
    report.reverified++;
  } catch (e) {
    report.failed.push({ version: v.id, task: snapshot.title, message: e.message });
  }
}
executionQueue.close?.();
db.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.failed.length && !dryRun ? 1 : 0);
