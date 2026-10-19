import assert from "node:assert/strict";
import { createApp } from "../../server/b2b/app.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {taskFixture} from './task-fixture.mjs';
export async function harness({verifyPublications=true}={}) {
  const dir = await mkdtemp(join(tmpdir(), "kodik-pilot-")),
    dbPath = join(dir, "test.sqlite");
  let app, origin;
  async function start() {
    app = createApp({ dbPath, secure: false });
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    origin = `http://127.0.0.1:${app.server.address().port}`;
  }
  await start();
  async function request(
    path,
    body,
    client = {},
    expected = 200,
    method = "POST",
  ) {
    if(path==='/tasks'&&body)body=taskFixture(body);
    if(verifyPublications&&/\/tasks\/[^/]+\/publish$/.test(path)&&body?.published&&expected===200){
      const id=path.split('/')[2],task=(await request('/state',undefined,client)).tasks.find(t=>t.id===id);
      const proof=await request(`/tasks/${id}/verify`,{revision:task.revision},client);
      assert.equal(proof.status,'approved',JSON.stringify(proof));
      body={revision:task.revision,...body};
    }
    if(path==='/assignments'&&body)body={request_key:crypto.randomUUID(),...body};
    const response = await fetch(origin + "/api" + path, {
      method: body === undefined ? "GET" : method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(client.cookie ? { Cookie: client.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, expected, `${path}: ${JSON.stringify(data)}`);
    if (response.headers.get("set-cookie"))
      client.cookie = response.headers.get("set-cookie").split(";")[0];
    return data;
  }
  const password = "Reference-test-only-321!";
  async function school(tag) {
    const admin = {};
    const result = await request(
      "/auth/register",
      {
        school: `School ${tag}`,
        name: `Admin ${tag}`,
        login: `admin-${tag}`,
        password,
      },
      admin,
    );
    return { admin, user: result.user, password };
  }
  async function content(admin) {
    const course = await request("/courses", { title: "Course" }, admin),
      module = await request(
        "/modules",
        { course_id: course.id, title: "Module" },
        admin,
      ),
      lesson = await request(
        "/lessons",
        { module_id: module.id, title: "Lesson" },
        admin,
      );
    return { course, module, lesson };
  }
  async function task(admin, lesson, fields = {}) {
    return request(
      "/tasks",
      {
        lesson_id: lesson.id,
        title: "Double",
        description: "",
        goal: "Compute",
        theory: "Input",
        instruction: "Double input",
        difficulty: "easy",
        starter: "",
        hints: [],
        check_mode: "tests",
        tests: [
          { inputs: ["2"], expected: "4", hidden: false },
          { inputs: ["7"], expected: "14", hidden: true },
        ],
        ...fields,
      },
      admin,
    );
  }
  return {
    request,
    school,
    content,
    task,
    password,
    dir,
    dbPath,
    get db() {
      return app.db;
    },
    async restart() {
      await new Promise((r) => app.server.close(r));
      await start();
    },
    async close() {
      await new Promise((r) => app.server.close(r));
      await rm(dir, { recursive: true, force: true });
    },
  };
}
