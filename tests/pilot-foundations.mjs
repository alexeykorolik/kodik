import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { harness } from "./helpers/b2b-harness.mjs";
import { openDatabase, schemaVersion } from "../server/b2b/database.mjs";
import { backupDatabase } from "../scripts/database-backup.mjs";
import { ExecutionQueue } from "../server/b2b/execution-queue.mjs";
import {readServerConfig} from '../server/b2b/config.mjs';

test("partial authoring, conflict history, student concurrency, durable idempotent submissions and backup", async (t) => {
  const h = await harness();
  const { admin } = await h.school("foundations"),
    other = await h.school("other"),
    c = await h.content(admin);
  let tid,
    student = {},
    uid;
  try {
    await t.test(
      "incomplete draft saves, create replay does not duplicate, publication checks required fields",
      async () => {
        const body = {
          title: "",
          instruction: "",
          tests: [],
          client_key: "stable-create-request",
        };
        const a = await h.task(admin, c.lesson, body);
        tid = a.id;
        const again = await h.task(admin, c.lesson, body);
        assert.equal(again.id, tid);
        assert.equal(again.replayed, true);
        const state = await h.request("/state", undefined, admin);
        assert.equal(state.tasks.length, 1);
        assert.equal(state.tasks[0].instruction, "");
        await h.request(
          `/tasks/${tid}/publish`,
          { published: true },
          admin,
          400,
        );
      },
    );
    await t.test(
      "two authors retain both versions, history is isolated from another school",
      async () => {
        const current = (await h.request("/state", undefined, admin)).tasks[0];
        await h.request(
          `/tasks/${tid}`,
          {
            ...current,
            title: "Teacher A",
            instruction: "Double input",
            tests: [{ inputs: ["2"], expected: "4", hidden: false }],
          },
          admin,
          200,
          "PUT",
        );
        const conflict = await h.request(
          `/tasks/${tid}`,
          { ...current, title: "Teacher B" },
          admin,
          409,
          "PUT",
        );
        assert.ok(conflict.conflict_id);
        assert.equal(conflict.current.title, "Teacher A");
        const history = await h.request(
          `/tasks/${tid}/revisions`,
          undefined,
          admin,
        );
        assert.ok(
          history.items.some(
            (r) => r.conflict && r.content.title === "Teacher B",
          ),
        );
        assert.ok(history.items.some((r) => r.content.title === "Teacher A"));
        await h.request(`/tasks/${tid}/revisions`, undefined, other.admin, 404);
        await h.request(`/tasks/${tid}/publish`, { published: true }, admin);
      },
    );
    await t.test(
      "two student tabs cannot silently overwrite; another student cannot read drafts or history",
      async () => {
        uid = (
          await h.request(
            "/users",
            {
              name: "Student",
              login: "student-foundations",
              password: h.password,
              role: "student",
            },
            admin,
          )
        ).id;
        await h.request(
          "/auth/login",
          { login: "student-foundations", password: h.password },
          student,
        );
        const group = await h.request("/groups", { title: "Group" }, admin);
        await h.request(`/groups/${group.id}/members`, { user_id: uid }, admin);
        await h.request(
          "/assignments",
          { group_id: group.id, task_id: tid },
          admin,
        );
        const saved = await h.request(
          `/tasks/${tid}/draft`,
          { code: "print(4)", revision: 0 },
          student,
          200,
          "PUT",
        );
        assert.equal(saved.revision, 1);
        const conflict = await h.request(
          `/tasks/${tid}/draft`,
          { code: "print(99)", revision: 0 },
          student,
          409,
          "PUT",
        );
        assert.equal(conflict.current.code, "print(4)");
        assert.equal(
          h.db
            .prepare("SELECT code FROM assignment_draft_history WHERE id=?")
            .get(conflict.conflict_id).code,
          "print(99)",
        );
        await h.request(`/tasks/${tid}/revisions`, undefined, student, 403);
        assert.equal(
          (await h.request("/state", undefined, other.admin)).drafts.length,
          0,
        );
      },
    );
    await t.test(
      "duplicate submit returns the same durable job and exactly one attempt",
      async () => {
        const body = {
          code: "n = int(input())\nprint(n * 2)",
          request_key: "one-logical-submission",
        };
        const [a, b] = await Promise.all([
          h.request(`/tasks/${tid}/submissions`, body, student),
          h.request(`/tasks/${tid}/submissions`, body, student),
        ]);
        assert.equal(a.id, b.id);
        await h.request(
          `/tasks/${tid}/submissions`,
          { ...body, code: "print(123)" },
          student,
          409,
        );
        let job;
        for (let i = 0; i < 100; i++) {
          job = await h.request(`/submissions/${a.id}`, undefined, student);
          if (job.status === "completed") break;
          await new Promise((r) => setTimeout(r, 50));
        }
        assert.equal(job.status, "completed");
        assert.equal(job.result.status, "passed");
        assert.ok(job.attempt_id);
        assert.equal(
          h.db
            .prepare("SELECT COUNT(*) AS n FROM attempts WHERE user_id=?")
            .get(uid).n,
          1,
        );
        await h.request(`/submissions/${a.id}`, undefined, other.admin, 404);
        await h.restart();
        assert.equal(
          (await h.request(`/submissions/${a.id}`, undefined, student)).result
            .status,
          "passed",
        );
      },
    );
    await t.test(
      "verified SQLite backup restores records; future schemas are rejected without downgrade",
      async () => {
        const backup = join(h.dir, "backup.sqlite");
        await backupDatabase(h.dbPath, backup);
        const restored = openDatabase(backup);
        assert.equal(
          restored.prepare("SELECT COUNT(*) AS n FROM attempts").get().n,
          1,
        );
        assert.equal(
          restored.prepare("PRAGMA user_version").get().user_version,
          schemaVersion,
        );
        restored.exec("PRAGMA user_version=999");
        restored.close();
        assert.throws(() => openDatabase(backup), /newer/);
        const check = new DatabaseSync(backup);
        assert.equal(
          check.prepare("PRAGMA user_version").get().user_version,
          999,
        );
        check.close();
        await assert.rejects(
          backupDatabase(h.dbPath, backup),
          /never overwritten/,
        );
      },
    );
  } finally {
    await h.close();
  }
});
test("execution queue admits another school before draining the first, bounds capacity and cancels waiting work", async () => {
  const queue = new ExecutionQueue({
      concurrency: 1,
      capacity: 4,
      waitMs: 1000,
    }),
    order = [];
  let release;
  const first = queue.run("A", () => new Promise((r) => (release = r)));
  await new Promise((r) => setImmediate(r));
  const a1 = queue.run("A", async () => {
      order.push("A1");
      return 1;
    }),
    a2 = queue.run("A", async () => {
      order.push("A2");
      return 2;
    }),
    b1 = queue.run("B", async () => {
      order.push("B1");
      return 3;
    });
  const control = new AbortController(),
    cancelled = queue.run(
      "B",
      async () => {
        order.push("cancelled");
      },
      { signal: control.signal },
    );
  assert.equal((await queue.run("C", async () => 4)).infrastructure, true);
  control.abort();
  assert.equal((await cancelled).cancelled, true);
  release(0);
  await Promise.all([first, a1, a2, b1]);
  assert.deepEqual(order, ["A1", "B1", "A2"]);
  queue.close();
});
test('production startup refuses missing origin, insecure origin and ephemeral relative storage',()=>{
  assert.throws(()=>readServerConfig({NODE_ENV:'production'}),/KODIK_ORIGIN/);
  assert.throws(()=>readServerConfig({NODE_ENV:'production',KODIK_ORIGIN:'http://school.example',KODIK_DB:'/data/store.sqlite'}),/HTTPS/);
  assert.throws(()=>readServerConfig({NODE_ENV:'production',KODIK_ORIGIN:'https://school.example',KODIK_DB:'data/store.sqlite'}),/absolute/);
  const config=readServerConfig({NODE_ENV:'production',KODIK_ORIGIN:'https://school.example',KODIK_DB:join(process.cwd(),'data','store.sqlite')});assert.equal(config.host,'127.0.0.1');
});
