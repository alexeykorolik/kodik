import test from "node:test";
import assert from "node:assert/strict";
import { cpus, totalmem, platform, release } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { harness } from "./helpers/b2b-harness.mjs";
test("30 learners then two parallel groups of 30: shared IP login, queued checks, measured latency", async () => {
  const h = await harness(),
    groups = [];
  try {
    for (const tag of ["load-a", "load-b"]) {
      const { admin } = await h.school(tag),
        content = await h.content(admin),
        task = await h.task(admin, content.lesson);
      await h.request(`/tasks/${task.id}/publish`, { published: true }, admin);
      const group = await h.request("/groups", { title: "Group of 30" }, admin),
        clients = [];
      for (let i = 0; i < 30; i++) {
        const user = await h.request(
          "/users",
          {
            name: `Learner ${i}`,
            login: `${tag}-${i}`,
            password: h.password,
            role: "student",
          },
          admin,
        );
        await h.request(
          `/groups/${group.id}/members`,
          { user_id: user.id },
          admin,
        );
        clients.push({ login: `${tag}-${i}` });
      }
      await h.request(
        "/assignments",
        { group_id: group.id, task_id: task.id },
        admin,
      );
      groups.push({ clients, task });
    }
    const loginAt = performance.now();
    await Promise.all(
      groups.flatMap((g) =>
        g.clients.map((c) =>
          h.request("/auth/login", { login: c.login, password: h.password }, c),
        ),
      ),
    );
    const loginMs = performance.now() - loginAt;
    const reports = [];
    for (const [index, selected] of [[groups[0]], groups].entries()) {
      const requests = selected.flatMap((g) =>
          g.clients.map((client) => ({
            client,
            task: g.task,
            started: 0,
            job: null,
            latency: 0,
          })),
        ),
        started = performance.now();
      await Promise.all(
        requests.map(async (r, i) => {
          r.started = performance.now();
          r.job = await h.request(
            `/tasks/${r.task.id}/submissions`,
            {
              code: "n = int(input())\nprint(n * 2)",
              request_key: `load-${index}-${i}-${Date.now()}`,
            },
            r.client,
          );
        }),
      );
      const pending = new Set(requests);
      let polls = 0;
      while (pending.size && performance.now() - started < 60000) {
        await Promise.all(
          [...pending].map(async (r) => {
            const job = await h.request(
              `/submissions/${r.job.id}`,
              undefined,
              r.client,
            );
            if (job.status === "completed") {
              assert.equal(job.result.status, "passed");
              r.latency = performance.now() - r.started;
              pending.delete(r);
            } else assert.ok(["queued", "running"].includes(job.status));
          }),
        );
        polls++;
        if (pending.size) await new Promise((r) => setTimeout(r, 100));
      }
      assert.equal(
        pending.size,
        0,
        "Every accepted solution must finish, not disappear under load.",
      );
      const times = requests.map((r) => r.latency).sort((a, b) => a - b);
      reports.push({
        learners: requests.length,
        totalMs: Math.round(performance.now() - started),
        p50Ms: Math.round(times[Math.floor(times.length * 0.5)]),
        p95Ms: Math.round(times[Math.ceil(times.length * 0.95) - 1]),
        maxMs: Math.round(times.at(-1)),
        passed: requests.length,
        checkerErrors: 0,
        polls,
      });
    }
    assert.equal(
      h.db.prepare("SELECT COUNT(*) AS n FROM attempts").get().n,
      90,
    );
    const report = {
      at: new Date().toISOString(),
      environment: {
        os: platform(),
        release: release(),
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        ramGiB: Math.round(totalmem() / 1024 ** 3),
        node: process.version,
        storage: "local temporary SQLite WAL",
        runner:
          "Kodik subset, 4 concurrent jobs / processes, 2 tests per submission",
      },
      sharedIpConcurrentLogins: 60,
      loginMs: Math.round(loginMs),
      scenarios: reports,
      scope:
        "Local laboratory measurement, not evidence of hosted production performance.",
    };
    await mkdir("work", { recursive: true });
    await writeFile(
      "work/pilot-load-report.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await h.close();
  }
});
