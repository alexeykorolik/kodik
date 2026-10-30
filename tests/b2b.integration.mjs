import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/b2b/app.mjs";
import {randomUUID} from 'node:crypto';
import {taskFixture} from './helpers/task-fixture.mjs';

test("B2B: real HTTP, roles, tenant isolation, grading and persistence", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "kodik-b2b-")),
    dbPath = join(dir, "test.sqlite");
  let app = createApp({ dbPath, secure: false }),
    origin;
  async function start() {
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    origin = `http://127.0.0.1:${app.server.address().port}`;
  }
  await start();
  async function request(
    path,
    body,
    client = {},
    method = "POST",
    expected = 200,
    customOrigin = origin,
  ) {
    if(path==='/tasks'&&body)body=taskFixture(body);
    if(/\/tasks\/[^/]+\/publish$/.test(path)&&body?.published&&expected===200){const id=path.split('/')[2],task=(await request('/state',undefined,client)).tasks.find(t=>t.id===id);const proof=await request(`/tasks/${id}/verify`,{revision:task.revision},client);assert.equal(proof.status,'approved',JSON.stringify(proof));body={revision:task.revision,...body}}
    // Legacy submit now uses the same durable job contract. Await the real job
    // here so all original grading and privacy assertions still inspect results.
    if(path.endsWith('/submit')&&body)body={request_key:randomUUID(),...body};
    if(path==='/assignments'&&body)body={request_key:randomUUID(),...body};
    const res = await fetch(origin + "/api" + path, {
      method: body === undefined ? "GET" : method,
      headers: {
        ...(body === undefined
          ? {}
          : { "Content-Type": "application/json", Origin: customOrigin }),
        "X-Kodik-Client": "2",
        ...(client.cookie ? { Cookie: client.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    assert.equal(res.status, expected, `${path}: ${JSON.stringify(data)}`);
    if (res.headers.get("set-cookie"))
      client.cookie = res.headers.get("set-cookie").split(";")[0];
    if(path.endsWith('/submit')&&expected===200){
      let job=data;
      for(let i=0;i<200&&!['completed','cancelled'].includes(job.status);i++){
        await new Promise(r=>setTimeout(r,25));job=await request(`/submissions/${data.id}`,undefined,client);
      }
      assert.equal(job.status,'completed');return {id:job.attempt_id,...job.result};
    }
    return data;
  }
  const admin = {},
    other = {},
    teacher = {},
    student = {},
    student2 = {};
  let uid, tid, cid, mid, lid, gid, taskId, attemptId, recovery;
  const password = "Test-strong-123!";
  try {
    await t.test(
      "register independent schools and issue secure server sessions",
      async () => {
        const a = await request(
          "/auth/register",
          { school: "School A", name: "Admin A", login: "admin-a", password },
          admin,
        );
        recovery = a.recovery;
        await request(
          "/auth/register",
          { school: "School B", name: "Admin B", login: "admin-b", password },
          other,
        );
        assert.equal(a.user.role, "admin");
        assert.ok(recovery);
        assert.ok(admin.cookie.includes("kodik_session="));
        await request("/state", undefined, {}, "GET", 401);
        await request(
          "/users",
          { name: "forged", login: "forged", password, role: "student" },
          admin,
          "POST",
          403,
          "https://evil.example",
        );
      },
    );
    await t.test(
      "admin creates teacher, teacher creates students but cannot elevate privileges",
      async () => {
        tid = (
          await request(
            "/users",
            { name: "Teacher", login: "teacher-a", password, role: "teacher" },
            admin,
          )
        ).id;
        await request("/auth/login", { login: "teacher-a", password }, teacher);
        uid = (
          await request(
            "/users",
            { name: "Learner", login: "learner-a", password, role: "student" },
            teacher,
          )
        ).id;
        await request(
          "/users",
          {
            name: "Other learner",
            login: "learner-a2",
            password,
            role: "student",
          },
          teacher,
        );
        await request("/auth/login", { login: "learner-a", password }, student);
        await request(
          "/auth/login",
          { login: "learner-a2", password },
          student2,
        );
        await request(
          "/users",
          { name: "forged", login: "bad-admin", password, role: "admin" },
          teacher,
          "POST",
          403,
        );
        await request("/courses", { title: "forged" }, student, "POST", 403);
      },
    );
    await t.test(
      "teacher creates course, module, lesson and draft with hidden tests",
      async () => {
        cid = (
          await request(
            "/courses",
            { title: "Python", description: "Basics" },
            teacher,
          )
        ).id;
        mid = (
          await request("/modules", { title: "Input", course_id: cid }, teacher)
        ).id;
        lid = (
          await request(
            "/lessons",
            { title: "Double", module_id: mid },
            teacher,
          )
        ).id;
        taskId = (
          await request(
            "/tasks",
            {
              lesson_id: lid,
              title: "Double a number",
              description: "",
              goal: "Use int",
              theory: "Read and multiply",
              instruction: "Print input doubled",
              difficulty: "easy",
              starter: "n = int(input())\n",
              hints: ["Use print"],
              check_mode: "tests",
              tests: [
                { inputs: ["2"], expected: "4", hidden: false },
                {
                  inputs: ["secret-value"],
                  expected: "secret-expected",
                  hidden: true,
                },
              ],
            },
            teacher,
          )
        ).id;
        await request(`/tasks/${taskId}/publish`, { published: true }, teacher);
        gid = (await request("/groups", { title: "Group A" }, teacher)).id;
        await request(`/groups/${gid}/members`, { user_id: uid }, teacher);
        await request(
          "/assignments",
          { group_id: gid, task_id: taskId },
          teacher,
        );
        const state = await request("/state", undefined, student);
        assert.equal(state.tasks.length, 1);
        assert.equal(state.users.length, 0);
        assert.equal(state.groups.length, 0);
        assert.ok(!JSON.stringify(state).includes("secret-value"));
        assert.ok(!JSON.stringify(state).includes("secret-expected"));
        assert.ok(!("tests" in state.tasks[0]));
        assert.equal(
          (await request("/state", undefined, student2)).tasks.length,
          0,
        );
        await request(
          `/tasks/${taskId}/submit`,
          { code: "print(4)" },
          student2,
          "POST",
          404,
        );
      },
    );
    await t.test(
      "server enforces tenant isolation for reads and all relationships",
      async () => {
        await request(`/tasks/${taskId}/copy`, {}, other, "POST", 404);
        await request(`/courses/${cid}/copy`, {}, other, "POST", 404);
        await request(
          "/modules",
          { course_id: cid, title: "Cross tenant" },
          other,
          "POST",
          404,
        );
        await request(
          `/groups/${gid}/members`,
          { user_id: uid },
          other,
          "POST",
          404,
        );
        const otherGroup = (
          await request("/groups", { title: "B group" }, other)
        ).id;
        await request(
          `/groups/${otherGroup}/members`,
          { user_id: uid },
          other,
          "POST",
          404,
        );
        await request(
          "/assignments",
          { group_id: otherGroup, task_id: taskId },
          other,
          "POST",
          404,
        );
        await request(
          `/users/${tid}/password`,
          { password },
          other,
          "POST",
          404,
        );
      },
    );
    await t.test(
      "hidden test input, expected output and runtime details never leak",
      async () => {
        const a = await request(
          `/tasks/${taskId}/submit`,
          { code: "print(input())" },
          student,
        );
        assert.equal(a.status, "failed");
        assert.equal(a.cases[1].hidden, true);
        assert.ok(!JSON.stringify(a).includes("secret-value"));
        assert.ok(!JSON.stringify(a).includes("secret-expected"));
        const detail = await request(`/attempts/${a.id}`, undefined, student);
        assert.ok(!("snapshot" in detail));
        assert.ok(!JSON.stringify(detail).includes("secret-value"));
        await request(`/attempts/${a.id}`, undefined, student2, "GET", 404);
        await request(`/attempts/${a.id}`, undefined, other, "GET", 404);
        const runtime = await request(
          `/tasks/${taskId}/submit`,
          { code: "n = int(input())\nprint(n * 2)" },
          student,
        );
        assert.equal(runtime.status, "runtime_error");
        assert.ok(!JSON.stringify(runtime).includes("secret-value"));
      },
    );
    await t.test(
      "editing retains the assigned version, unpublishing leaves lessons available, stale revisions conflict",
      async () => {
        const task = (await request("/state", undefined, teacher)).tasks[0];
        task.tests = [
          { inputs: ["2"], expected: "4", hidden: false },
          { inputs: ["7"], expected: "14", hidden: true },
        ];
        await request(`/tasks/${taskId}`, task, teacher, "PUT");
        await request(`/tasks/${taskId}`, task, teacher, "PUT", 409);
        await request(
          `/tasks/${taskId}/publish`,
          { published: false },
          teacher,
        );
        const oldState=await request('/state',undefined,student);
        assert.equal(oldState.tasks.length,1);
        assert.ok(!JSON.stringify(oldState).includes('secret-value'));
        assert.equal((await request(`/tasks/${taskId}/submit`,{code:'print(4)'},student)).status,'failed');
        await request(`/tasks/${taskId}/publish`, { published: true }, teacher);
        assert.equal((await request('/state',undefined,student)).tasks[0].revision,1);
        await request(`/assignments/${oldState.assignments[0].id}`,{},teacher,'DELETE');
        await request('/assignments',{group_id:gid,task_id:taskId},teacher);
      },
    );
    await t.test(
      "sandbox enforces language and resources, actual grading ignores claimed status",
      async () => {
        const rejected = await request(
          `/tasks/${taskId}/submit`,
          { code: 'import os\nos.system("echo bad")', status: "passed" },
          student,
        );
        assert.equal(rejected.status, "runtime_error");
        const loop = await request(
          `/tasks/${taskId}/run`,
          { code: "while True:\n    print(1)", inputs: [] },
          student,
        );
        assert.ok(loop.error);
        const failed = await request(
          `/tasks/${taskId}/submit`,
          { code: "print(4)", status: "passed" },
          student,
        );
        assert.equal(failed.status, "failed");
        const passed = await request(
          `/tasks/${taskId}/submit`,
          { code: "n = int(input())\nprint(n * 2)" },
          student,
        );
        assert.equal(passed.status, "passed");
        attemptId = passed.id;
        const state = await request("/state", undefined, teacher);
        assert.ok(state.attempts.filter((a) => a.user_id === uid).length >= 5);
      },
    );
    await t.test(
      "drafts and passed attempts survive server and database restart",
      async () => {
        await request(
          `/tasks/${taskId}/draft`,
          { code: "# saved draft\nprint(123)" },
          student,
          "PUT",
        );
        await new Promise((r) => app.server.close(r));
        app = createApp({ dbPath, secure: false });
        await start();
        const state = await request("/state", undefined, student);
        assert.equal(
          state.drafts.find((d) => d.task_id === taskId).code,
          "# saved draft\nprint(123)",
        );
        assert.ok(
          state.attempts.some(
            (a) => a.id === attemptId && a.status === "passed",
          ),
        );
      },
    );
    await t.test(
      "manual work is reviewed by teacher and school copies are drafts",
      async () => {
        const task = (await request("/state", undefined, teacher)).tasks[0];
        const manual = (
          await request(
            "/tasks",
            { ...task, title: "Manual", check_mode: "manual", tests: [] },
            teacher,
          )
        ).id;
        await request(`/tasks/${manual}/publish`, { published: true }, teacher);
        await request(
          "/assignments",
          { group_id: gid, task_id: manual },
          teacher,
        );
        const a = await request(
          `/tasks/${manual}/submit`,
          { code: 'print("Hello")' },
          student,
        );
        assert.equal(a.status, "pending_review");
        await request(
          `/attempts/${a.id}/review`,
          { status: "passed", feedback: "Great" },
          student,
          "POST",
          403,
        );
        await request(
          `/attempts/${a.id}/review`,
          { status: "passed", feedback: "Great" },
          teacher,
        );
        assert.equal(
          (await request(`/attempts/${a.id}`, undefined, student)).status,
          "passed",
        );
        const copy = await request(`/courses/${cid}/copy`, {}, teacher);
        const state = await request("/state", undefined, teacher);
        assert.ok(state.courses.some((c) => c.id === copy.id));
        assert.ok(
          state.tasks
            .filter((t) => t.title === "Manual")
            .some((t) => !t.published),
        );
      },
    );
    await t.test(
      "only administrators manage access; blocking revokes sessions and preserves records",
      async () => {
        await request(
          `/users/${uid}/access`,
          { active: false },
          teacher,
          "POST",
          403,
        );
        await request(
          `/users/${uid}/access`,
          { active: false },
          other,
          "POST",
          404,
        );
        await request(`/users/${uid}/access`, { active: false }, admin);
        await request("/state", undefined, student, "GET", 401);
        await request(
          "/auth/login",
          { login: "learner-a", password },
          student,
          "POST",
          401,
        );
        await request(`/users/${uid}/access`, { active: true }, admin);
        await request("/auth/login", { login: "learner-a", password }, student);
        assert.ok(
          (await request("/state", undefined, student)).attempts.some(
            (a) => a.id === attemptId,
          ),
        );
      },
    );
    await t.test(
      "recovery is single use, password reset revokes sessions, AI cannot be enabled",
      async () => {
        const renewed = await request(
          "/auth/recover",
          { login: "admin-a", recovery, password: "Renewed-password-123" },
          {},
        );
        assert.ok(renewed.recovery);
        await request("/state", undefined, admin, "GET", 401);
        await request(
          "/auth/recover",
          { login: "admin-a", recovery, password },
          {},
          "POST",
          400,
        );
        await request(
          "/auth/login",
          { login: "admin-a", password: "Renewed-password-123" },
          admin,
        );
        await request(
          `/users/${uid}/password`,
          { password: "New-student-password-123" },
          admin,
        );
        await request("/state", undefined, student, "GET", 401);
        process.env.AI_TUTOR_ENABLED = "true";
        await request("/ai/tutor", { context: {} }, teacher, "POST", 503);
        delete process.env.AI_TUTOR_ENABLED;
      },
    );
  } finally {
    await new Promise((r) => app.server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
