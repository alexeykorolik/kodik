import test from "node:test";
import {taskFixture} from './helpers/task-fixture.mjs';
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
test("accepted checks survive a real server crash and produce one result per request", async () => {
  const dir = await mkdtemp(join(tmpdir(), "kodik-crash-")),
    dbPath = join(dir, "test.sqlite");
  let child, origin;
  async function boot() {
    child = fork(
      fileURLToPath(new URL("./helpers/crash-server.mjs", import.meta.url)),
      [],
      {
        env: { ...process.env, KODIK_DB: dbPath },
        stdio: ["ignore", "ignore", "pipe", "ipc"],
        windowsHide: true,
      },
    );
    const [{ port }] = await once(child, "message");
    origin = `http://127.0.0.1:${port}`;
  }
  const admin = {},
    password = "Crash-test-pass-321!";
  async function request(path, body, client = {}) {
    if(path==='/tasks'&&body)body=taskFixture(body);
    if(/\/tasks\/[^/]+\/publish$/.test(path)&&body?.published){const id=path.split('/')[2],task=(await request('/state',undefined,client)).tasks.find(t=>t.id===id);const proof=await request(`/tasks/${id}/verify`,{revision:task.revision},client);assert.equal(proof.status,'approved');body={revision:task.revision,...body}}
    if(path==='/assignments'&&body)body={request_key:crypto.randomUUID(),...body};
    const r = await fetch(origin + "/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: client.cookie || "",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json();
    assert.equal(r.status, 200, JSON.stringify(data));
    if (r.headers.get("set-cookie"))
      client.cookie = r.headers.get("set-cookie").split(";")[0];
    return data;
  }
  try {
    await boot();
    await request(
      "/auth/register",
      { school: "Crash test", name: "Admin", login: "crash-admin", password },
      admin,
    );
    const course = await request("/courses", { title: "Course" }, admin),
      module = await request(
        "/modules",
        { title: "Module", course_id: course.id },
        admin,
      ),
      lesson = await request(
        "/lessons",
        { title: "Lesson", module_id: module.id },
        admin,
      );
    const task = await request(
      "/tasks",
      {
        lesson_id: lesson.id,
        title: "Task",
        instruction: "Print 42",
        description: "",
        goal: "",
        theory: "",
        difficulty: "easy",
        starter: "",
        hints: [],
        check_mode: "output",
        tests: [{ inputs: [], expected: "42", hidden: false }],
      },
      admin,
    );
    await request(`/tasks/${task.id}/publish`, { published: true }, admin);
    const group = await request("/groups", { title: "Group" }, admin);
    const clients = [];
    for (let i = 0; i < 12; i++) {
      const c = {},
        u = await request(
          "/users",
          {
            name: `Learner ${i}`,
            login: `crash-${i}`,
            password,
            role: "student",
          },
          admin,
        );
      await request(`/groups/${group.id}/members`, { user_id: u.id }, admin);
      await request("/auth/login", { login: `crash-${i}`, password }, c);
      clients.push(c);
    }
    await request(
      "/assignments",
      { group_id: group.id, task_id: task.id },
      admin,
    );
    const jobs = await Promise.all(
      clients.map((c, i) =>
        request(
          `/tasks/${task.id}/submissions`,
          { code: "print(42)", request_key: `crash-request-${i}` },
          c,
        ),
      ),
    );
    const check = new DatabaseSync(dbPath, { readOnly: true });
    assert.ok(
      check
        .prepare(
          "SELECT COUNT(*) AS n FROM submission_jobs WHERE status IN ('queued','running')",
        )
        .get().n > 0,
      "Crash must actually interrupt pending checks.",
    );
    check.close();
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
    await boot();
    const pending = new Set(jobs.map((j) => j.id));
    for (let i = 0; i < 150 && pending.size; i++) {
      for (const [index, j] of jobs.entries()) {
        if (!pending.has(j.id)) continue;
        const result = await request(
          `/submissions/${j.id}`,
          undefined,
          clients[index],
        );
        if (result.status === "completed") {
          assert.equal(result.result.status, "passed");
          pending.delete(j.id);
        }
      }
      if (pending.size) await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(pending.size, 0);
    const database = new DatabaseSync(dbPath, { readOnly: true });
    assert.equal(
      database.prepare("SELECT COUNT(*) AS n FROM attempts").get().n,
      jobs.length,
    );
    database.close();
    console.log(
      `Verified crash recovery of ${jobs.length} accepted jobs, no duplicate attempts.`,
    );
  } finally {
    if (child?.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
