import { randomUUID } from "node:crypto";
import { grade } from "./grader.mjs";
const now = () => new Date().toISOString();
export function createSubmissionService(
  db,
  { concurrency = 4, capacity = 240 } = {},
) {
  let closing = false,
    lastTenant = "";
  const active = new Set(),
    activeIds = new Set();
  db.prepare(
    "UPDATE submission_jobs SET status='queued',updated_at=? WHERE status='running'",
  ).run(now());
  const visible = (j) => ({
    id: j.id,
    task_id: j.task_id,
    assignment_id:j.assignment_id,
    version_id:j.version_id,
    mode: j.mode,
    status: j.status,
    result: j.result ? JSON.parse(j.result) : null,
    attempt_id: j.attempt_id,
    created_at: j.created_at,
    updated_at: j.updated_at,
  });
  /**
   * program = {mode, code, source, translator, policy}. For block modes `code` is the Python the
   * server generated in the restricted executor; `source` is the learner's workspace JSON.
   * The context (version snapshot and policy) is frozen at acceptance.
   */
  function enqueue(user, task, program, key) {
    const { mode = "python", code, source = null, translator = null, policy = null } = program;
    if (typeof key !== "string" || !/^[a-zA-Z0-9_-]{10,100}$/.test(key))
      return { error: "Укажите уникальный ключ отправки.", status: 400 };
    const old = db
      .prepare(
        "SELECT * FROM submission_jobs WHERE user_id=? AND request_key=?",
      )
      .get(user.id, key);
    if (old) {
      // Same key must mean the same assignment, mode and actual solution (code or block structure).
      const sameSolution = mode === "python" ? old.code === code : (old.source ?? null) === source;
      if (old.task_id !== task.id || old.assignment_id !== (task.assignment_id??null) || (old.mode ?? "python") !== mode || !sameSolution)
        return {
          error: "Ключ уже использован для другого решения.",
          status: 409,
          details: { code: "request_key_reused" },
        };
      return visible(old);
    }
    if (closing)
      return {
        error: "Сервер перезапускается. Решение можно отправить повторно.",
        status: 503,
      };
    const queued = db
      .prepare(
        "SELECT COUNT(*) AS n FROM submission_jobs WHERE status IN ('queued','running')",
      )
      .get().n;
    if (queued >= capacity)
      return {
        error:
          "Очередь заполнена; работа сохранена в черновике. Повторите отправку позже.",
        status: 503,
      };
    if (
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM submission_jobs WHERE org_id=? AND status IN ('queued','running')",
        )
        .get(user.org_id).n >= 120
    )
      return {
        error: "В очереди вашей школы уже 120 решений. Дождитесь результатов.",
        status: 429,
      };
    if (
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM submission_jobs WHERE user_id=? AND status IN ('queued','running')",
        )
        .get(user.id).n >= 3
    )
      return {
        error: "У вас уже есть три решения в очереди. Дождитесь результата.",
        status: 429,
      };
    const id = randomUUID(),
      at = now();
    db.prepare(
      "INSERT INTO submission_jobs(id,org_id,user_id,task_id,request_key,code,snapshot,status,created_at,updated_at,assignment_id,version_id,mode,source,translator,policy) VALUES(?,?,?,?,?,?,?,'queued',?,?,?,?,?,?,?,?)",
    ).run(
      id,
      user.org_id,
      user.id,
      task.id,
      key,
      code,
      JSON.stringify(task),
      at,
      at,
      task.assignment_id??null,
      task.version_id??null,
      mode,
      source,
      translator,
      policy,
    );
    const job = visible(
      db.prepare("SELECT * FROM submission_jobs WHERE id=?").get(id),
    );
    queueMicrotask(pump);
    return job;
  }
  async function process(job) {
    const enabled = db
      .prepare("SELECT active FROM users WHERE id=? AND org_id=?")
      .get(job.user_id, job.org_id)?.active;
    const access=!job.assignment_id||db.prepare('SELECT a.id FROM assignments a JOIN group_members gm ON gm.group_id=a.group_id WHERE a.id=? AND a.org_id=? AND a.archived=0 AND gm.user_id=?').get(job.assignment_id,job.org_id,job.user_id);
    if (!enabled||!access) {
      db.prepare(
        "UPDATE submission_jobs SET status='cancelled',result=?,updated_at=? WHERE id=?",
      ).run(
        JSON.stringify({
          status: "cancelled",
          reason: "access_revoked",
          message: "Доступ к заданию или аккаунту изменён. Решение не оценивалось и не считается ошибкой.",
          cases: [],
        }),
        now(),
        job.id,
      );
      return;
    }
    db.prepare(
      "UPDATE submission_jobs SET status='running',updated_at=? WHERE id=?",
    ).run(now(), job.id);
    const task = JSON.parse(job.snapshot),
      result = await grade(task, job.code, { tenant: job.org_id });
    const at = now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "INSERT OR IGNORE INTO attempts(id,org_id,user_id,task_id,code,status,result,snapshot,created_at,assignment_id,version_id,context_origin,mode,source,translator,policy) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        job.id,
        job.org_id,
        job.user_id,
        job.task_id,
        job.code,
        result.status,
        JSON.stringify(result),
        job.snapshot,
        at,
        job.assignment_id,
        job.version_id,
        job.assignment_id?'assignment':'legacy',
        job.mode ?? "python",
        job.source ?? null,
        job.translator ?? null,
        job.policy ?? null,
      );
      db.prepare(
        "UPDATE submission_jobs SET status='completed',result=?,attempt_id=?,updated_at=? WHERE id=?",
      ).run(JSON.stringify(result), job.id, at, job.id);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  function pump() {
    if (closing) return;
    while (active.size < concurrency) {
      const candidates = db
        .prepare(
          "SELECT * FROM submission_jobs WHERE status='queued' ORDER BY created_at LIMIT 240",
        )
        .all()
        .filter((j) => !activeIds.has(j.id));
      const job =
        candidates.find((j) => j.org_id !== lastTenant) || candidates[0];
      if (!job) return;
      lastTenant = job.org_id;
      activeIds.add(job.id);
      let work;
      work = process(job)
        .catch(() => {
          db.prepare(
            "UPDATE submission_jobs SET status='completed',result=?,updated_at=? WHERE id=?",
          ).run(
            JSON.stringify({
              status: "checker_error",
              message:
                "Сбой сервиса проверки. Оценка не выставлена; повторите отправку.",
              cases: [],
            }),
            now(),
            job.id,
          );
        })
        .finally(() => {
          active.delete(work);
          activeIds.delete(job.id);
          if (!closing) queueMicrotask(pump);
        });
      active.add(work);
    }
  }
  const timer = setInterval(pump, 300);
  timer.unref();
  queueMicrotask(pump);
  return {
    enqueue,
    get(id, user) {
      const j = db
        .prepare("SELECT * FROM submission_jobs WHERE id=? AND org_id=?")
        .get(id, user.org_id);
      if (!j || (user.role === "student" && j.user_id !== user.id)) return null;
      return visible(j);
    },
    async close() {
      closing = true;
      clearInterval(timer);
      await Promise.allSettled([...active]);
    },
    cancel(id, user) {
      const j = db
        .prepare(
          "SELECT * FROM submission_jobs WHERE id=? AND org_id=? AND user_id=?",
        )
        .get(id, user.org_id, user.id);
      if (!j) return null;
      if (j.status !== "queued")
        return { error: "Начатую проверку нельзя отменить.", status: 409 };
      db.prepare(
        "UPDATE submission_jobs SET status='cancelled',updated_at=? WHERE id=?",
      ).run(now(), id);
      return { ok: true };
    },
  };
}
