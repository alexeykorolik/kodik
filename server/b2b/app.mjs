import { createServer } from "node:http";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, schemaVersion } from "./database.mjs";
import { execute, grade, executionQueue, translateBlocks } from "./grader.mjs";
import { createModes, adaptive } from "./modes.mjs";
import { createSubmissionService } from "./submissions.mjs";
import {createCurriculum} from './curriculum.mjs';
import {createTaskQuality,runtimeFor} from './task-quality.mjs';
import {createPilot} from './pilot.mjs';
import {createLearningEvidence} from './learning-evidence.mjs';
import {createStarterCourse} from './starter-course.mjs';
import learningRules from '../../src/b2b/learningRules.json' with {type:'json'};

const scrypt = promisify(scryptCallback);
const root = fileURLToPath(new URL("../../", import.meta.url));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const now = () => new Date().toISOString();
const fail = (status, message, details = {}) => {
  throw Object.assign(new Error(message), { status, details });
};
const text = (value, label, max = 200, optional = false) => {
  if (
    optional &&
    (value === undefined || (typeof value === "string" && !value.trim()))
  )
    return "";
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(400, `${label}: требуется значение до ${max} символов.`);
  return value.trim();
};
const codeText = (value) => {
  if (typeof value !== "string" || value.length > 12000)
    fail(400, "Код должен содержать не более 12000 символов.");
  return value;
};
const passwordText = (value) => {
  if (typeof value !== "string" || value.length < 10 || value.length > 128)
    fail(400, "Пароль: от 10 до 128 символов.");
  return value;
};
export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${Buffer.from(await scrypt(password, salt, 64)).toString("hex")}`;
}
async function verify(password, stored) {
  const [salt, key] = stored.split(":");
  const actual = Buffer.from(await scrypt(password, salt, 64));
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  login: u.login,
  role: u.role,
  org_id: u.org_id,
  platform_owner: !!u.platform_owner,
});

export function createApp({
  dbPath = process.env.KODIK_DB || resolve(root, "data/kodik.sqlite"),
  secure = process.env.NODE_ENV === "production",
  registrationBudget = 10,
  trustedProxies = [],
  loginNetworkBudget = 300,
} = {}) {
  const plain = (ip) => String(ip || "").replace(/^::ffff:/, "");
  const trusted = new Set(trustedProxies.map(plain));
  /** Client address for limits: X-Forwarded-For is used only when the connection comes from a configured
   * proxy, and only the entries that proxy appended (the right-most address that is not a trusted proxy). */
  const clientIp = (req) => {
    const remote = plain(req.socket.remoteAddress);
    if (!trusted.has(remote)) return remote;
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => plain(s.trim())).filter(Boolean);
    for (let i = forwarded.length - 1; i >= 0; i--) if (!trusted.has(forwarded[i])) return forwarded[i];
    return remote;
  };
  const db = openDatabase(dbPath),
    limits = new Map();
  // Compatibility of pinned versions with the current checking environment (taskQuality is defined below).
  const submissions = createSubmissionService(db, { compatible: (job) => job.version_id ? taskQuality.versionCompatible(job.version_id, job.org_id) : { ok: true, runtime: runtimeFor(JSON.parse(job.snapshot)) } });
  let shuttingDown = false;
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const tx = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  function limit(key, max, ms) {
    const time = Date.now();
    if (limits.size > 10000)
      for (const [k, v] of limits) if (v.until < time) limits.delete(k);
    const entry = limits.get(key) || { n: 0, until: time + ms };
    if (entry.until < time) {
      entry.n = 0;
      entry.until = time + ms;
    }
    entry.n++;
    limits.set(key, entry);
    if (entry.n > max) fail(429, "Слишком много запросов. Попробуйте позже.");
  }
  function own(table, id, user) {
    if(typeof id!=='string'||!id||id.length>100)fail(404,'Объект не найден.');
    const row = get(
      `SELECT * FROM ${table} WHERE id=? AND org_id=?`,
      id,
      user.org_id,
    );
    if (!row) fail(404, "Объект не найден.");
    pilot.assertScope(table,row,user);
    return row;
  }
  const teacher = (u) => {
    if (!["teacher", "admin"].includes(u.role))
      fail(403, "Доступно только преподавателю.");
  };
  const admin = (u) => {
    if (u.role !== "admin") fail(403, "Доступно только администратору школы.");
  };
  function availableTask(id, user, assignmentId,writing=false) {
    const task = own("tasks", id, user);
    if(user.role!=="student")return task;
    const assignments=all("SELECT a.* FROM assignments a JOIN group_members gm ON gm.group_id=a.group_id WHERE a.task_id=? AND gm.user_id=? AND a.org_id=? AND a.archived=0",id,user.id,user.org_id).filter(a=>(!assignmentId||a.id===assignmentId)&&curriculum.canAccessAssignment(a,user,writing));
    if(!assignments.length)fail(404,"Назначение не найдено.");
    if(assignments.length!==1)fail(409,"Выберите конкретное назначение задания.",{assignment_required:true});
    const assignment=assignments[0],version=get("SELECT * FROM task_versions WHERE id=? AND org_id=?",assignment.version_id,user.org_id);
    if(writing&&get('SELECT archived FROM groups_ WHERE id=?',assignment.group_id)?.archived)fail(409,'Группа архивирована. Работы сохранены для просмотра.');
    if(!version)fail(409,"У назначения отсутствует опубликованная версия. Обратитесь к преподавателю.");
    return {...JSON.parse(version.snapshot),id:task.id,published:1,assignment_id:assignment.id,version_id:version.id,run_id:assignment.run_id,lesson_run_id:assignment.lesson_run_id,step_id:assignment.step_id};
  }
  function safeTask(task, user) {
    const { tests,reference_solution,wrong_solutions,preview_solution,template_id,block_solution,learning_config, ...rest } = task;
    const learning=adaptive.parseLearningConfig(learning_config||'{}');
    const publicFields=new Set(['id','org_id','modes','lesson_id','title','description','goal','theory','instruction','difficulty','starter','check_mode','manual_criteria','published','position','revision','updated_at','assignment_id','version_id','run_id','lesson_run_id','step_id','group_id','group_title','due_at','assigned_at','order_snapshot']);
    return {
      ...(user.role==='student'?Object.fromEntries(Object.entries(rest).filter(([key])=>publicFields.has(key))):rest),
      learning_rules:JSON.parse(task.learning_rules||'[]'),
      learning: adaptive.publicLearningConfig(learning),
      ...(user.role==='student'?{}:{learning_config:learning,block_solution:block_solution?JSON.parse(block_solution):null}),
      hints: JSON.parse(task.hints),
      examples: JSON.parse(tests)
        .filter((t) => !t.hidden)
        .map((t) => ({ inputs: t.inputs, expected: t.expected })),
      ...(user.role === "student" ? {} : {tests:JSON.parse(tests),reference_solution:reference_solution||'',wrong_solutions:JSON.parse(wrong_solutions||'[]'),preview_solution:preview_solution||'',template_id:template_id||'',verification:taskQuality.approval(task)}),
    };
  }
  function validateTask(b, user, publication = true) {
    own("lessons", b.lesson_id, user);
    const mode = ["output", "tests", "manual"].includes(b.check_mode)
      ? b.check_mode
      : fail(400, "Неверный режим проверки.");
    const tests = b.tests || [];
    if (
      !Array.isArray(tests) ||
      tests.length > 12 ||
      (publication && mode !== "manual" && tests.length === 0)
    )
      fail(400, "Добавьте от 1 до 12 тестов.");
    const checked = tests.map((t) => {
      if (
        !Array.isArray(t.inputs) ||
        t.inputs.length > 30 ||
        t.inputs.some((s) => typeof s !== "string" || s.length > 1000) ||
        typeof t.expected !== "string" ||
        t.expected.length > 8000 ||
        typeof t.hidden !== "boolean"
      )
        fail(400, "Неверный формат теста.");
      return { inputs: t.inputs, expected: t.expected, hidden: t.hidden };
    });
    if (
      !Array.isArray(b.hints) ||
      b.hints.length > 10 ||
      b.hints.some((h) => typeof h !== "string" || h.length > 2000)
    )
      fail(400, "Допустимо до 10 подсказок.");
    if (!["easy", "medium", "hard"].includes(b.difficulty))
      fail(400, "Выберите сложность.");
    const wrong=b.wrong_solutions??[];
    const rules=b.learning_rules??[];
    if(!Array.isArray(rules)||rules.length>learningRules.length||new Set(rules).size!==rules.length||rules.some(id=>!learningRules.some(rule=>rule.id===id)))fail(400,'Выберите учебные приёмы из списка.');
    if(mode==='manual'&&rules.length)fail(400,'Для ручной работы укажите учебные приёмы в критериях оценки.');
    if(!Array.isArray(wrong)||wrong.length>6||wrong.some(s=>typeof s!=='string'||s.length>12000))fail(400,'Допустимо до шести неправильных программ, каждая до 12000 символов.');
    const learning=adaptive.validateLearningConfig(b.learning_config);
    if(learning.error)fail(400,learning.error);
    let blockSolution='';
    if(b.block_solution!==undefined&&b.block_solution!==null&&b.block_solution!==''){
      const shape=adaptive.validateWorkspaceShape(b.block_solution);
      if(!shape.ok)fail(400,'Блоковый образец: '+shape.errors[0].message);
      blockSolution=JSON.stringify(b.block_solution);
    }
    if(learning.config.modes.length&&mode==='manual')fail(400,'Ручную работу пока можно решать только на Python. Выключите режимы с блоками.');
    if(publication&&learning.config.modes.length&&!blockSolution)fail(400,'Для режимов с блоками добавьте закрытый блоковый образец решения.');
    return [
      b.lesson_id,
      text(b.title, "Название", 200, !publication),
      text(b.description, "Описание", 4000, true),
      text(b.goal, "Цель", 2000, true),
      text(b.theory, "Теория", 12000, true),
      text(b.instruction, "Инструкция", 8000, !publication),
      b.difficulty,
      codeText(b.starter),
      JSON.stringify(b.hints),
      mode,
      JSON.stringify(checked),
      codeText(b.reference_solution??''),JSON.stringify(wrong),text(b.manual_criteria,'Критерии ручной проверки',8000,true),codeText(b.preview_solution??''),text(b.template_id,'Шаблон',80,true),
      JSON.stringify(rules),
      JSON.stringify(learning.config),
      blockSolution,
    ];
  }
  const inputsOf = (value) => {
    if (!Array.isArray(value) || value.length > 30 || value.some((i) => typeof i !== "string" || i.length > 1000)) fail(400, "Неверный ввод.");
    return value;
  };
  /**
   * One request format for every mode: {mode, code} for Python, {mode, workspace} for blocks.
   * For blocks the server translates the workspace itself, in the restricted executor, with the
   * palette of the exact version. Any Python a client sends alongside blocks is ignored.
   */
  async function programOf(user, task, b) {
    const mode = b.mode ?? "python";
    if (!adaptive.isMode(mode)) fail(400, "Неизвестный способ решения.");
    if (mode === "python") return { mode, code: codeText(b.code), source: null, translator: null };
    // A cached page with another translator would show a Python mirror that differs from what is
    // checked. Refuse to run or submit (the draft is still saved) and ask for a reload.
    if (b.client_translator !== undefined && b.client_translator !== adaptive.TRANSLATOR_VERSION) fail(409, "Kodik обновился. Ваши блоки сохранены — обновите страницу, чтобы продолжить.", { code: "client_outdated" });
    const shape = adaptive.validateWorkspaceShape(b.workspace);
    if (!shape.ok) fail(400, shape.errors[0].message, { translation_errors: shape.errors.slice(0, 5) });
    const palette = adaptive.parseLearningConfig(task.learning_config ?? "{}").palette;
    const translation = await translateBlocks(b.workspace, palette, { tenant: user.org_id });
    if (translation.infrastructure) fail(503, "Сервис проверки временно недоступен. Работа сохранена; попробуйте ещё раз.");
    if (!translation.ok) fail(422, translation.errors[0]?.message || "Программа из блоков не готова.", { translation_errors: translation.errors, code: "translation" });
    return { mode, code: translation.python, source: JSON.stringify(b.workspace), translator: translation.translator, warnings: translation.warnings };
  }
  /** Learners: mode must be allowed by the assignment policy. Teachers: by the version. */
  function modeRules(action, mode, task, user) {
    if (user.role === "student" && task.assignment_id) {
      const assignment = get("SELECT * FROM assignments WHERE id=? AND org_id=?", task.assignment_id, user.org_id);
      return modes.assertMode(action, mode, assignment, user.id, task).eff;
    }
    if (!modes.supportedForSnapshot(task).includes(mode)) fail(409, "Это задание нельзя решать в этом режиме.", { code: "mode_not_supported" });
    return null;
  }
  /** New checks of issued work only in an environment confirmed for the pinned version (drafts stay allowed). */
  function assertEnvironment(task, user) {
    if (user.role !== "student" || !task.version_id) return;
    if (!taskQuality.versionCompatible(task.version_id, user.org_id).ok)
      fail(409, "Проверка этого задания временно недоступна: Kodik обновил проверяющую среду, и совместимость задания ещё не подтверждена. Черновик сохраняется — продолжайте работу и проверьте решение позже.", { code: "runtime_unconfirmed" });
  }
  async function acceptSubmission(user, task, b) {
    if (user.role !== "student") fail(403, "Отправка доступна ученику.");
    const replay=submissions.replay(user,task,b);
    if(replay){if(replay.error)fail(replay.status,replay.error,replay.details);return replay;}
    availableTask(task.id,user,task.assignment_id,true);
    const mode = b.mode ?? "python";
    const eff = modeRules("submit", mode, task, user);
    assertEnvironment(task, user);
    limit(`execute:${user.id}`, 50, 60000);
    const program = await programOf(user, task, b);
    const result = submissions.enqueue(user, task, { ...program, policy: eff ? JSON.stringify(eff) : null }, b.request_key);
    if (result.error) fail(result.status, result.error, result.details);
    return result;
  }
  /** Stored task row → the shape validateTask expects. */
  const parsedTask = (task) => ({
    ...task,
    hints: JSON.parse(task.hints),
    tests: JSON.parse(task.tests),
    wrong_solutions: JSON.parse(task.wrong_solutions || '[]'),
    learning_rules: JSON.parse(task.learning_rules || '[]'),
    learning_config: JSON.parse(task.learning_config || '{}'),
    block_solution: task.block_solution ? JSON.parse(task.block_solution) : '',
  });
  function rememberMaterial(
    task,
    author,
    baseRevision,
    acceptedRevision,
    conflict,
  ) {
    const id = randomUUID();
    run(
      "INSERT INTO material_revisions VALUES(?,?,?,?,?,?,?,?,?)",
      id,
      author.org_id,
      task.id,
      author.id,
      baseRevision,
      acceptedRevision,
      JSON.stringify(task),
      Number(conflict),
      now(),
    );
    return id;
  }
  const insertTask = (id, org, values, position = 0) =>
    run(
      "INSERT INTO tasks(id,org_id,lesson_id,title,description,goal,theory,instruction,difficulty,starter,hints,check_mode,tests,reference_solution,wrong_solutions,manual_criteria,preview_solution,template_id,learning_rules,learning_config,block_solution,position,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      org,
      ...values,
      position,
      now(),
    );
  const taskQuality=createTaskQuality({db,own,teacher,fail,tx,validateTask,limit});
  const modes=createModes({db,own,teacher,fail,tx,onResponse:(...args)=>learningEvidence.respond(...args)});
  const curriculum=createCurriculum({db,own,teacher,fail,tx,safeTask,assertPublishedVersion:taskQuality.assertPublishedVersion,groupManager:(u,id)=>pilot.groupManager(u,id),modePolicyFor:modes.policyForNewAssignment,modesFor:(a,id,t)=>{const e=modes.effectiveFor(a,id,t);return modes.publicModes(e.supported,e.eff)}});
  const pilot=createPilot({db,fail,tx,own,teacher,admin,passwordHash,passwordText,publicUser,makeSession,availableTask,curriculum,modes,adaptive});
  const learningEvidence=createLearningEvidence({db,own,teacher,fail,tx,modes,adaptive,groupAllowed:pilot.groupAllowed});
  function makeSession(user, res) {
    const token = randomBytes(32).toString("hex");
    run("DELETE FROM sessions WHERE expires<?", Date.now());
    run(
      "INSERT INTO sessions VALUES(?,?,?)",
      hash(token),
      user.id,
      Date.now() + 7 * 86400000,
    );
    res.setHeader(
      "Set-Cookie",
      `kodik_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure ? "; Secure" : ""}`,
    );
  }
  async function route(req, res, path, b) {
    const method = req.method,
      ip = clientIp(req);
    if (path === "/api/health" && method === "GET") {
      if (shuttingDown || !existsSync(resolve(root, ".runner/runner.cjs")))
        fail(503, "Исполнитель ещё не готов.");
      if (get("PRAGMA quick_check").quick_check !== "ok")
        fail(503, "База данных требует проверки.");
      return {
        status: "ok",
        ai: false,
        runtime: "kodik-python-subset",
        schema: schemaVersion,
        queue: executionQueue.snapshot(),
      };
    }
    if (shuttingDown && method !== "GET")
      fail(
        503,
        "Сервер перезапускается. Черновик сохранён; повторите запрос позже.",
      );
    if (path.startsWith("/api/ai/")) fail(503, "AI отключён.");
    if (path === "/api/auth/register" && method === "POST") {
      limit(`register:${ip}`, registrationBudget, 3600000);
      const orgName = text(b.school, "Название школы"),
        name = text(b.name, "Имя"),
        login = text(b.login, "Логин", 120).toLowerCase(),
        password = await passwordHash(passwordText(b.password));
      const orgId = randomUUID(),
        id = randomUUID(),
        recovery = randomBytes(24).toString("hex");
      tx(() => {
        if (get("SELECT id FROM users WHERE login=?", login))
          fail(409, "Логин уже занят.");
        run("INSERT INTO organizations VALUES(?,?,?)", orgId, orgName, now());
        run("INSERT INTO companies(id,org_id,name,contact_name,source,stage,created_at) VALUES(?,?,?,?,'Самостоятельная регистрация','pilot',?)",randomUUID(),orgId,orgName,name,now());
        run("INSERT INTO licenses VALUES(?,?,1,60,?,'active',?,?)",randomUUID(),orgId,new Date(Date.now()+14*86400000).toISOString(),id,now());
        run(
          "INSERT INTO users(id,org_id,name,login,password,role,recovery,created_at) VALUES(?,?,?,?,?,?,?,?)",
          id,
          orgId,
          name,
          login,
          password,
          "admin",
          hash(recovery),
          now(),
        );
      });
      const user = get("SELECT * FROM users WHERE id=?", id);
      makeSession(user, res);
      return { user: publicUser(user), recovery };
    }
    if (path === "/api/auth/login" && method === "POST") {
      const login = text(b.login, "Логин", 120).toLowerCase(),
        password = passwordText(b.password);
      // One school may legitimately share a public IP. Account+IP still limits
      // guessing a password; a broad IP budget protects the hashing service.
      limit(`login:${ip}:${login}`, 15, 900000);
      limit(`login-network:${ip}`, loginNetworkBudget, 900000);
      const user = get("SELECT * FROM users WHERE login=?", login);
      const dummy = "00000000000000000000000000000000:" + "00".repeat(64);
      const ok = await verify(password, user?.password || dummy);
      if (!ok || !user || !user.active) fail(401, "Неверный логин или пароль.");
      makeSession(user, res);
      return { user: publicUser(user) };
    }
    if (path === "/api/auth/recover" && method === "POST") {
      limit(`recovery:${ip}`, 10, 3600000);
      const login = text(b.login, "Логин", 120).toLowerCase(),
        recovery = text(b.recovery, "Код восстановления", 100),
        password = await passwordHash(passwordText(b.password));
      const user = get(
        "SELECT * FROM users WHERE login=? AND recovery=?",
        login,
        hash(recovery),
      );
      if (!user || !user.active)
        fail(400, "Неверный логин или код восстановления.");
      const next = randomBytes(24).toString("hex");
      tx(() => {
        run(
          "UPDATE users SET password=?,recovery=? WHERE id=?",
          password,
          hash(next),
          user.id,
        );
        run("DELETE FROM sessions WHERE user_id=?", user.id);
      });
      makeSession(user, res);
      return { user: publicUser(user), recovery: next };
    }
    const token = req.headers.cookie?.match(
      /(?:^|;\s*)kodik_session=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    const user =
      token &&
      get(
        "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1",
        hash(token),
        Date.now(),
      );
    if (!user) fail(401, "Войдите в аккаунт.");
    if (path === "/api/auth/logout" && method === "POST") {
      run("DELETE FROM sessions WHERE token=?", hash(token));
      res.setHeader(
        "Set-Cookie",
        "kodik_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
      );
      return { ok: true };
    }
    if(user.platform_owner && path==='/api/state' && method==='GET')return {user:publicUser(user),organization:{id:user.org_id,name:'Управление Kodik'},courses:[],modules:[],lessons:[],tasks:[],users:[],groups:[],members:[],assignments:[],attempts:[],drafts:[],programs:[]};
    if(user.platform_owner&&!path.startsWith('/api/owner/'))fail(403,'Откройте кабинет владельца.');
    // Recovering an accepted submission is reading one's own past action: it does not need a valid
    // licence, but it never accepts a different solution or creates new work (see submissions.replayAccepted).
    {const accepted=/^\/api\/tasks\/([^/]+)\/(?:submissions|submit)$/.exec(path);if(accepted&&method==='POST'&&user.role==='student'){const replayed=submissions.replayAccepted(user,accepted[1],b);if(replayed){if(replayed.error)fail(replayed.status,replayed.error,replayed.details);return replayed}}}
    if(!['GET','HEAD'].includes(method)&&!path.endsWith('/draft'))pilot.checkLicense(user);
    if(path==='/api/starter-course/install'&&method==='POST')return await createStarterCourse({db,teacher,fail,tx,invoke:(target,body,verb='POST')=>route({method:verb,headers:req.headers,socket:req.socket,url:target},res,target,body)})(user);
    const pilotResult=await pilot.handle(path,method,b,user,req,res);
    if(pilotResult!==undefined)return pilotResult;
    const learningResult=await learningEvidence.handle(path,method,b,user);
    if(learningResult!==undefined)return learningResult;
    const qualityResult=await taskQuality.handle(path,method,b,user);
    if(qualityResult!==undefined)return qualityResult;
    learningEvidence.expire();
    const modesResult=await modes.handle(path,method,b,user);
    if(modesResult!==undefined)return modesResult;
    const curriculumResult=await curriculum.handle(path,method,b,user);
    if(curriculumResult!==undefined)return curriculumResult;
    if (path === "/api/state" && method === "GET") {
      let tasks = all(
        "SELECT * FROM tasks WHERE org_id=? ORDER BY position,title",
        user.org_id,
      );
      if (user.role === "student") {
        const assignments=all("SELECT a.*,g.title AS group_title FROM assignments a JOIN group_members gm ON gm.group_id=a.group_id JOIN groups_ g ON g.id=a.group_id WHERE gm.user_id=? AND a.org_id=? AND a.archived=0 ORDER BY a.created_at,a.id",user.id,user.org_id);
        tasks=assignments.filter(a=>curriculum.canAccessAssignment(a,user)).map(a=>{
          const task=availableTask(a.task_id,user,a.id),lesson=get('SELECT * FROM lessons WHERE id=? AND org_id=?',task.lesson_id,user.org_id),module=lesson&&get('SELECT * FROM modules WHERE id=? AND org_id=?',lesson.module_id,user.org_id);
          const frozen=JSON.parse(a.order_snapshot);
          const effective=modes.effectiveFor(a,user.id,task);
          return {...task,modes:modes.publicModes(effective.supported,effective.eff),group_id:a.group_id,group_title:a.group_title,due_at:a.due_at,assigned_at:a.created_at,order_snapshot:Object.keys(frozen).length?frozen:{course_id:module?.course_id,module_position:module?.position??0,lesson_position:lesson?.position??0,task_position:task.position,legacy:true}};
        }).sort((a,b)=>{
          if(a.run_id!==b.run_id&&(a.run_id||b.run_id))return !a.run_id?-1:!b.run_id?1:a.assigned_at.localeCompare(b.assigned_at)||a.run_id.localeCompare(b.run_id);
          if(a.run_id&&a.run_id===b.run_id){const delta=(a.order_snapshot.program_position??0)-(b.order_snapshot.program_position??0);if(delta)return delta}
          for(const key of ['module_position','lesson_position','task_position']){const delta=(a.order_snapshot[key]??0)-(b.order_snapshot[key]??0);if(delta)return delta}
          return a.assigned_at.localeCompare(b.assigned_at)||a.assignment_id.localeCompare(b.assignment_id);
        });
      } else tasks=tasks.map(t=>({...t,published_revision:t.published_version_id?get('SELECT revision FROM task_versions WHERE id=?',t.published_version_id)?.revision:null}));
      let lessons = all(
          "SELECT * FROM lessons WHERE org_id=? ORDER BY position,title",
          user.org_id,
        ),
        modules = all(
          "SELECT * FROM modules WHERE org_id=? ORDER BY position,title",
          user.org_id,
        ),
        courses = all(
          "SELECT c.*,(SELECT status FROM course_imports i WHERE i.course_id=c.id) import_status FROM courses c WHERE org_id=? ORDER BY created_at",
          user.org_id,
        );
      if (user.role === "student") {
        lessons = lessons.filter((l) =>
          tasks.some((t) => t.lesson_id === l.id),
        );
        modules = modules.filter((m) =>
          lessons.some((l) => l.module_id === m.id),
        );
        courses = courses.filter((c) =>
          modules.some((m) => m.course_id === c.id),
        );
      }
      const attempts =
        user.role === "student"
          ? all(
              "SELECT id,user_id,task_id,assignment_id,version_id,context_origin,mode,json_extract(snapshot,'$.title') AS task_title,json_extract(snapshot,'$.revision') AS version_revision,status,result,feedback,created_at FROM attempts WHERE org_id=? AND user_id=? ORDER BY created_at DESC",
              user.org_id,
              user.id,
            )
          : all(
              "SELECT id,user_id,task_id,assignment_id,version_id,context_origin,mode,json_extract(snapshot,'$.title') AS task_title,json_extract(snapshot,'$.revision') AS version_revision,status,result,feedback,created_at FROM attempts WHERE org_id=? ORDER BY created_at DESC",
              user.org_id,
            );
      return curriculum.state(user,pilot.scopeState({
        user: publicUser(user),
        organization: get(
          "SELECT id,name FROM organizations WHERE id=?",
          user.org_id,
        ),
        courses,
        modules,
        lessons,
        tasks: tasks.map((t) => safeTask(t, user)),
        users:
          user.role === "student"
            ? []
            : all(
                "SELECT id,name,login,role,created_at,active FROM users WHERE org_id=?",
                user.org_id,
              ),
        groups:
          user.role === "student"
            ? []
            : all("SELECT * FROM groups_ WHERE org_id=?", user.org_id),
        members:
          user.role === "student"
            ? []
            : all(
                "SELECT gm.* FROM group_members gm JOIN groups_ g ON g.id=gm.group_id WHERE g.org_id=?",
                user.org_id,
              ),
        assignments:
          user.role === "student"
            ? all(
                "SELECT a.id,a.task_id,a.due_at,a.version_id,a.group_id FROM assignments a JOIN group_members gm ON gm.group_id=a.group_id WHERE gm.user_id=? AND a.org_id=? AND a.archived=0",
                user.id,
                user.org_id,
              )
            : all("SELECT a.*,v.revision AS version_revision,json_extract(v.snapshot,'$.title') AS title FROM assignments a JOIN task_versions v ON v.id=a.version_id WHERE a.org_id=? AND a.archived=0 ORDER BY a.created_at", user.org_id),
        attempts: attempts.map((a) => ({ ...a, result: JSON.parse(a.result) })),
        drafts:
          user.role === "student"
            ? all("SELECT d.*,a.task_id FROM assignment_drafts d JOIN assignments a ON a.id=d.assignment_id WHERE d.user_id=? AND a.archived=0", user.id)
            : [],
        block_drafts:
          user.role === "student"
            ? all("SELECT d.assignment_id,d.workspace,d.format,d.revision,d.updated_at,a.task_id FROM assignment_block_drafts d JOIN assignments a ON a.id=d.assignment_id WHERE d.user_id=? AND d.org_id=? AND a.archived=0", user.id, user.org_id).map((d) => ({ ...d, workspace: JSON.parse(d.workspace) }))
            : [],
      },user));
    }
    if (path === "/api/users" && method === "POST") {
      teacher(user);
      if (!["student", "teacher", "admin"].includes(b.role))
        fail(400, "Выберите роль.");
      if (b.role !== "student") admin(user);
      if(b.role==='student')pilot.seats(user);
      const id = randomUUID(),
        name = text(b.name, "Имя"),
        login = text(b.login, "Логин", 120).toLowerCase(),
        password = await passwordHash(passwordText(b.password));
      if(b.role==='student')pilot.seats(user);
      if (get("SELECT id FROM users WHERE login=?", login))
        fail(409, "Логин уже занят.");
      run(
        "INSERT INTO users(id,org_id,name,login,password,role,recovery,created_at) VALUES(?,?,?,?,?,?,NULL,?)",
        id,
        user.org_id,
        name,
        login,
        password,
        b.role,
        now(),
      );
      run('UPDATE users SET created_by=? WHERE id=?',user.id,id);
      return { id };
    }
    if(path==='/api/preview/run'&&method==='POST'){
      teacher(user);limit(`execute:${user.id}`,50,60000);
      const inputs=inputsOf(b.inputs);
      const learning=adaptive.validateLearningConfig(b.learning_config);
      if(learning.error)fail(400,learning.error);
      const program=await programOf(user,{learning_config:learning.config},b);
      return {...await execute(program.code,inputs,{tenant:user.org_id}),mode:program.mode,...(program.mode==='python'?{}:{python:program.code,translator:program.translator,warnings:program.warnings})};
    }
    if (path === "/api/preview" && method === "POST") {
      teacher(user);
      limit(`execute:${user.id}`, 50, 60000);
      const values = validateTask(b.task, user);
      const program = await programOf(user, { learning_config: values[17] }, b);
      const result = await grade(
        { check_mode: values[9], tests: values[10],learning_rules:values[16] },
        program.code,
        { tenant: user.org_id },
      );
      return { ...result, mode: program.mode, ...(program.mode === "python" ? {} : { python: program.code, translator: program.translator }) };
    }
    let match;
    if (
      (match = /^\/api\/tasks\/([^/]+)\/submissions$/.exec(path)) &&
      method === "POST"
    ) {
      if (user.role !== "student") fail(403, "Отправка доступна ученику.");
      return await acceptSubmission(user, availableTask(match[1], user, b.assignment_id), b);
    }
    if (
      (match = /^\/api\/submissions\/([^/]+)$/.exec(path)) &&
      method === "GET"
    ) {
      if(user.role==='teacher')own('submission_jobs',match[1],user);
      const result = submissions.get(match[1], user);
      if (!result) fail(404, "Проверка не найдена.");
      return result;
    }
    if (
      (match = /^\/api\/submissions\/([^/]+)$/.exec(path)) &&
      method === "DELETE"
    ) {
      const result = submissions.cancel(match[1], user);
      if (!result) fail(404, "Проверка не найдена.");
      if (result.error) fail(result.status, result.error);
      return result;
    }
    if (path === "/api/runner" && method === "GET") {
      teacher(user);
      return executionQueue.snapshot();
    }
    if (
      (match = /^\/api\/users\/([^/]+)\/access$/.exec(path)) &&
      method === "POST"
    ) {
      admin(user);
      const target = own("users", match[1], user);
      if (target.id === user.id || typeof b.active !== "boolean")
        fail(400, "Нельзя отключить свой аккаунт. Укажите статус доступа.");
      if(b.active&&!target.active&&target.role==='student')pilot.seats(user);
      tx(() => {
        run(
          "UPDATE users SET active=? WHERE id=?",
          Number(b.active),
          target.id,
        );
        run("DELETE FROM sessions WHERE user_id=?", target.id);
        pilot.audit(user,'user.access_changed',target.id,{previous:!!target.active,current:b.active});
      });
      return { ok: true };
    }
    if (
      (match = /^\/api\/users\/([^/]+)\/password$/.exec(path)) &&
      method === "POST"
    ) {
      teacher(user);
      const target = own("users", match[1], user);
      if (user.role !== "admin" && target.role !== "student")
        fail(403, "Недостаточно прав.");
      const password = await passwordHash(passwordText(b.password));
      tx(() => {
        run("UPDATE users SET password=? WHERE id=?", password, target.id);
        run("DELETE FROM sessions WHERE user_id=?", target.id);
        pilot.audit(user,'user.password_reset',target.id);
      });
      return { ok: true };
    }
    if (path === "/api/courses" && method === "POST") {
      teacher(user);
      const id = randomUUID();
      run(
        "INSERT INTO courses VALUES(?,?,?,?,?)",
        id,
        user.org_id,
        text(b.title, "Название"),
        text(b.description, "Описание", 4000, true),
        now(),
      );
      return { id };
    }
    if ((match = /^\/api\/courses\/([^/]+)$/.exec(path)) && method === "PUT") {
      teacher(user);
      own("courses", match[1], user);
      run(
        "UPDATE courses SET title=?,description=? WHERE id=?",
        text(b.title, "Название"),
        text(b.description, "Описание", 4000, true),
        match[1],
      );
      return { ok: true };
    }
    if (path === "/api/modules" && method === "POST") {
      teacher(user);
      own("courses", b.course_id, user);
      const id = randomUUID();
      run(
        "INSERT INTO modules VALUES(?,?,?,?,?)",
        id,
        user.org_id,
        b.course_id,
        text(b.title, "Название"),
        get("SELECT COUNT(*) AS n FROM modules WHERE course_id=?", b.course_id)
          .n,
      );
      return { id };
    }
    if (path === "/api/lessons" && method === "POST") {
      teacher(user);
      own("modules", b.module_id, user);
      const id = randomUUID();
      run(
        "INSERT INTO lessons(id,org_id,module_id,title,position) VALUES(?,?,?,?,?)",
        id,
        user.org_id,
        b.module_id,
        text(b.title, "Название"),
        get("SELECT COUNT(*) AS n FROM lessons WHERE module_id=?", b.module_id)
          .n,
      );
      return { id };
    }
    if (
      (match = /^\/api\/(modules|lessons)\/([^/]+)$/.exec(path)) &&
      method === "PUT"
    ) {
      teacher(user);
      const material=own(match[1], match[2], user);
      if(match[1]==='lessons'){
        if(b.revision!==material.revision)fail(409,'Урок изменился. Обновите данные перед переименованием.');
        run('UPDATE lessons SET title=?,revision=revision+1,updated_at=? WHERE id=?',text(b.title,'Название'),now(),material.id);
        return {ok:true,revision:material.revision+1};
      }
      run(
        `UPDATE ${match[1]} SET title=? WHERE id=?`,
        text(b.title, "Название"),
        match[2],
      );
      return { ok: true };
    }
    if (path === "/api/order" && method === "POST") {
      teacher(user);
      if (
        !["modules", "lessons", "tasks"].includes(b.kind) ||
        !Array.isArray(b.ids) ||
        b.ids.length > 500 ||
        new Set(b.ids).size !== b.ids.length
      )
        fail(400, "Неверный порядок.");
      const rows = b.ids.map((id) => own(b.kind, id, user)),
        parent = {
          modules: "course_id",
          lessons: "module_id",
          tasks: "lesson_id",
        }[b.kind];
      if (rows.some((r) => r[parent] !== rows[0][parent]))
        fail(400, "Элементы должны принадлежать одному разделу.");
      tx(() =>
        rows.forEach((r, i) =>
          run(`UPDATE ${b.kind} SET position=? WHERE id=?`, i, r.id),
        ),
      );
      return { ok: true };
    }
    if (path === "/api/tasks" && method === "POST") {
      teacher(user);
      const values = validateTask(b, user, false),
        id = randomUUID();
      if (
        b.client_key !== undefined &&
        (typeof b.client_key !== "string" ||
          !/^[a-zA-Z0-9_-]{10,100}$/.test(b.client_key))
      )
        fail(400, "Неверный ключ черновика.");
      const prior =
        b.client_key &&
        get(
          "SELECT task_id FROM authoring_keys WHERE user_id=? AND client_key=?",
          user.id,
          b.client_key,
        );
      if (prior) {
        const task = own("tasks", prior.task_id, user);
        return { id: task.id, revision: 1, replayed: true };
      }
      tx(() => {
        insertTask(
          id,
          user.org_id,
          values,
          get("SELECT COUNT(*) AS n FROM tasks WHERE lesson_id=?", b.lesson_id)
            .n,
        );
        if (b.client_key)
          run(
            "INSERT INTO authoring_keys VALUES(?,?,?)",
            user.id,
            b.client_key,
            id,
          );
        rememberMaterial(own("tasks", id, user), user, 0, 1, false);
      });
      return { id, revision: 1 };
    }
    if ((match = /^\/api\/tasks\/([^/]+)$/.exec(path)) && method === "PUT") {
      teacher(user);
      const task = own("tasks", match[1], user),
        values = validateTask(b, user, false);
      if (!Number.isInteger(b.revision) || b.revision < 1)
        fail(400, "Укажите версию черновика.");
      if (b.revision !== task.revision) {
        const conflictId = rememberMaterial(
          { ...b, id: task.id },
          user,
          b.revision,
          null,
          true,
        );
        fail(
          409,
          "Другой преподаватель сохранил изменения. Обе версии сохранены; выберите, как продолжить.",
          { conflict_id: conflictId, current: safeTask(task, user) },
        );
      }
      tx(() => {
        rememberMaterial(task, user, task.revision, task.revision, false);
        run(
          "UPDATE tasks SET lesson_id=?,title=?,description=?,goal=?,theory=?,instruction=?,difficulty=?,starter=?,hints=?,check_mode=?,tests=?,reference_solution=?,wrong_solutions=?,manual_criteria=?,preview_solution=?,template_id=?,learning_rules=?,learning_config=?,block_solution=?,revision=revision+1,updated_at=? WHERE id=?",
          ...values,
          now(),
          task.id,
        );
        rememberMaterial(
          own("tasks", task.id, user),
          user,
          task.revision,
          task.revision + 1,
          false,
        );
      });
      return { id: task.id, revision: task.revision + 1 };
    }
    if (
      (match = /^\/api\/tasks\/([^/]+)\/revisions$/.exec(path)) &&
      method === "GET"
    ) {
      teacher(user);
      own("tasks", match[1], user);
      return {
        items: all(
          "SELECT id,author_id,base_revision,accepted_revision,conflict,content,created_at FROM material_revisions WHERE task_id=? AND org_id=? ORDER BY created_at DESC LIMIT 100",
          match[1],
          user.org_id,
        ).map((r) => ({ ...r, content: JSON.parse(r.content) })),
      };
    }
    if (
      (match = /^\/api\/tasks\/([^/]+)\/publish$/.exec(path)) &&
      method === "POST"
    ) {
      teacher(user);
      const task = own("tasks", match[1], user);
      if (typeof b.published !== "boolean") fail(400, "Укажите статус.");
      if(b.revision!==undefined&&b.revision!==task.revision)fail(409,"Черновик изменился. Обновите его перед публикацией.");
      if (b.published)
        validateTask(parsedTask(task), user, true);
      const proof=b.published?taskQuality.assertApproved(task):null;
      const versionId=tx(()=>{
        if(b.published)learningEvidence.family(task);
        let version=get('SELECT id FROM task_versions WHERE task_id=? AND revision=?',task.id,task.revision)?.id;
        if(b.published&&version&&!get('SELECT verification_id FROM task_versions WHERE id=?',version).verification_id)fail(409,'Сохраните новую ревизию и перепубликуйте задание: прежний снимок не имеет подтверждения качества.');
        if(b.published&&version)taskQuality.assertPublishedVersion(version,user);
        if(b.published&&!version){version=randomUUID();run('INSERT INTO task_versions(id,org_id,task_id,revision,snapshot,created_at,verification_id) VALUES(?,?,?,?,?,?,?)',version,user.org_id,task.id,task.revision,JSON.stringify(task),now(),proof.id)}
        run('UPDATE tasks SET published=?,published_version_id=?,updated_at=? WHERE id=?',Number(b.published),b.published?version:task.published_version_id,now(),task.id);
        run('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',randomUUID(),user.org_id,user.id,b.published?'task.published':'task.unpublished',task.id,JSON.stringify({version_id:version,verification_id:proof?.id??null,revision:task.revision}),now());
        return version;
      });
      return { ok: true, version_id:versionId };
    }
    if (
      (match = /^\/api\/tasks\/([^/]+)\/copy$/.exec(path)) &&
      method === "POST"
    ) {
      teacher(user);
      const t = own("tasks", match[1], user),
        id = randomUUID();
      insertTask(
        id,
        user.org_id,
        [
          t.lesson_id,
          `${t.title} (копия)`.slice(0, 200),
          t.description,
          t.goal,
          t.theory,
          t.instruction,
          t.difficulty,
          t.starter,
          t.hints,
          t.check_mode,
          t.tests,
          t.reference_solution,t.wrong_solutions,t.manual_criteria,t.preview_solution,t.template_id,t.learning_rules,t.learning_config,t.block_solution,
        ],
        t.position + 1,
      );
      run('INSERT INTO task_families VALUES(?,?,?)',id,user.org_id,learningEvidence.family(t));
      return { id };
    }
    if (
      (match = /^\/api\/courses\/([^/]+)\/copy$/.exec(path)) &&
      method === "POST"
    ) {
      teacher(user);
      const c = own("courses", match[1], user),
        id = randomUUID();
      tx(() => {
        run(
          "INSERT INTO courses VALUES(?,?,?,?,?)",
          id,
          user.org_id,
          `${c.title} (копия)`.slice(0, 200),
          c.description,
          now(),
        );
        for (const m of all(
          "SELECT * FROM modules WHERE course_id=? AND org_id=?",
          c.id,
          user.org_id,
        )) {
          const mid = randomUUID();
          run(
            "INSERT INTO modules VALUES(?,?,?,?,?)",
            mid,
            user.org_id,
            id,
            m.title,
            m.position,
          );
          for (const l of all(
            "SELECT * FROM lessons WHERE module_id=? AND org_id=?",
            m.id,
            user.org_id,
          )) {
            const lid = randomUUID();
            run(
              "INSERT INTO lessons(id,org_id,module_id,title,position) VALUES(?,?,?,?,?)",
              lid,
              user.org_id,
              mid,
              l.title,
              l.position,
            );
            const taskMap=new Map();
            for (const t of all(
              "SELECT * FROM tasks WHERE lesson_id=? AND org_id=?",
              l.id,
              user.org_id,
            )) {
              const copiedId=randomUUID();taskMap.set(t.id,copiedId);
              insertTask(
                copiedId,
                user.org_id,
                [
                  lid,
                  t.title,
                  t.description,
                  t.goal,
                  t.theory,
                  t.instruction,
                  t.difficulty,
                  t.starter,
                  t.hints,
                  t.check_mode,
                  t.tests,
                  t.reference_solution,t.wrong_solutions,t.manual_criteria,t.preview_solution,t.template_id,t.learning_rules,t.learning_config,t.block_solution,
                ],
                t.position,
              );
              run('INSERT INTO task_families VALUES(?,?,?)',copiedId,user.org_id,learningEvidence.family(t));
            }
            const steps=JSON.parse(l.steps).map(s=>{const {task_version_id,...draft}=s;return {...draft,...(s.task_id?{task_id:taskMap.get(s.task_id)||''}:{})}});
            run('UPDATE lessons SET goal=?,description=?,duration=?,teacher_notes=?,steps=?,updated_at=? WHERE id=?',l.goal,l.description,l.duration,l.teacher_notes,JSON.stringify(steps),now(),lid);
          }
        }
      });
      return { id };
    }
    if (path === "/api/groups" && method === "POST") {
      teacher(user);
      const id = randomUUID();
      run(
        "INSERT INTO groups_(id,org_id,title) VALUES(?,?,?)",
        id,
        user.org_id,
        text(b.title, "Название"),
      );
      if(user.role==='teacher')run("INSERT INTO group_teachers VALUES(?,?,'primary')",id,user.id);
      return { id };
    }
    if (
      (match = /^\/api\/groups\/([^/]+)\/members$/.exec(path)) &&
      ["POST", "DELETE"].includes(method)
    ) {
      teacher(user);
      const group=own("groups_", match[1], user);if(group.archived)fail(409,'Группа архивирована.');
      pilot.groupManager(user,group.id);
      const student = own("users", b.user_id, user);
      if (student.role !== "student")
        fail(400, "В группу можно добавить ученика.");
      if (method === "POST")
        run(
          "INSERT OR IGNORE INTO group_members VALUES(?,?)",
          match[1],
          student.id,
        );
      else
        run(
          "DELETE FROM group_members WHERE group_id=? AND user_id=?",
          match[1],
          student.id,
        );
      pilot.audit(user,method==='POST'?'group.member_added':'group.member_removed',group.id,{user_id:student.id});
      return { ok: true };
    }
    if (path === "/api/assignments" && method === "POST") {
      teacher(user);
      if(typeof b.request_key!=='string'||!/^[a-zA-Z0-9_-]{10,100}$/.test(b.request_key))fail(400,'Укажите устойчивый ключ выдачи задания.');
      let due=null;
      if(b.due_at){if(typeof b.due_at!=='string'||!Number.isFinite(Date.parse(b.due_at)))fail(400,'Неверная дата.');due=new Date(b.due_at).toISOString()}
      const payload=JSON.stringify({group_id:b.group_id,task_id:b.task_id,due_at:due,repeat_of:b.repeat_of??null,...(b.mode_policy!==undefined?{mode_policy:b.mode_policy}:{})});
      own('groups_',b.group_id,user);pilot.groupManager(user,b.group_id);
      const previous=get('SELECT * FROM assignment_operations WHERE org_id=? AND request_key=?',user.org_id,b.request_key);
      if(previous){
        if(previous.actor_id!==user.id||previous.payload!==payload)fail(409,'Этот ключ выдачи уже использован для другой операции.');
        return {...JSON.parse(previous.response),replayed:true};
      }
      if(own("groups_", b.group_id, user).archived)fail(409,'Группа архивирована.');
      pilot.groupManager(user,b.group_id);
      const task = own("tasks", b.task_id, user);
      if (!task.published) fail(400, "Сначала опубликуйте задание.");
      const existing=get('SELECT id FROM assignments WHERE org_id=? AND group_id=? AND task_id=? AND archived=0 ORDER BY created_at DESC LIMIT 1',user.org_id,b.group_id,b.task_id);
      if(b.repeat_of){const prior=own('assignments',b.repeat_of,user);if(prior.group_id!==b.group_id||prior.task_id!==b.task_id)fail(400,'Повтор должен относиться к тому же заданию и группе.')}
      else if(existing)fail(409,'Задание уже выдано этой группе. Для нового прохождения выберите «Назначить повторно».',{existing_assignment_id:existing.id});
      const version=get('SELECT * FROM task_versions WHERE id=? AND org_id=?',task.published_version_id,user.org_id);
      if(!version)fail(409,'Опубликованная версия не найдена.');
      taskQuality.assertPublishedVersion(version.id,user);
      const modePolicy=modes.policyForNewAssignment(version.snapshot,b.mode_policy);
      const content=JSON.parse(version.snapshot),lesson=own('lessons',content.lesson_id,user),module=own('modules',lesson.module_id,user),course=own('courses',module.course_id,user);
      const order=JSON.stringify({course_id:course.id,course_title:course.title,module_id:module.id,module_title:module.title,module_position:module.position,lesson_id:lesson.id,lesson_title:lesson.title,lesson_position:lesson.position,task_position:content.position});
      const id=randomUUID();
      const response={ok:true,id,version_id:task.published_version_id};
      tx(()=>{
        run(
        "INSERT INTO assignments(id,org_id,group_id,task_id,due_at,version_id,created_at,order_snapshot,mode_policy) VALUES(?,?,?,?,?,?,?,?,?)",
        id,
        user.org_id,
        b.group_id,
        b.task_id,
        due,
        task.published_version_id,
        now(),
        order,
        modePolicy,
      );
        run('INSERT INTO assignment_operations VALUES(?,?,?,?,?,?)',user.org_id,b.request_key,user.id,payload,JSON.stringify(response),now());
        run('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',randomUUID(),user.org_id,user.id,b.repeat_of?'assignment.repeated':'assignment.created',id,JSON.stringify({group_id:b.group_id,task_id:task.id,version_id:version.id,repeat_of:b.repeat_of??null}),now());
      });
      return response;
    }
    if((match=/^\/api\/assignments\/([^/]+)$/.exec(path))&&method==='PUT'){
      teacher(user);const assignment=own('assignments',match[1],user);
      pilot.groupManager(user,assignment.group_id);
      if(assignment.archived)fail(409,'Назначение снято.');
      if(b.revision!==assignment.revision)fail(409,'Срок уже изменён в другой вкладке. Обновите данные.',{current:assignment});
      let due=null;
      if(b.due_at){if(typeof b.due_at!=='string'||!Number.isFinite(Date.parse(b.due_at)))fail(400,'Неверная дата.');due=new Date(b.due_at).toISOString()}
      tx(()=>{
        run('UPDATE assignments SET due_at=?,revision=revision+1 WHERE id=?',due,assignment.id);
        run('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',randomUUID(),user.org_id,user.id,'assignment.deadline_changed',assignment.id,JSON.stringify({previous:assignment.due_at,current:due}),now());
      });
      return {ok:true,id:assignment.id,revision:assignment.revision+1};
    }
    if (
      (match = /^\/api\/assignments\/([^/]+)$/.exec(path)) &&
      method === "DELETE"
    ) {
      teacher(user);
      pilot.groupManager(user,own("assignments", match[1], user).group_id);
      tx(()=>{
        run("UPDATE assignments SET archived=1 WHERE id=?", match[1]);
        run('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',randomUUID(),user.org_id,user.id,'assignment.archived',match[1],'{}',now());
      });
      return { ok: true };
    }
    if (
      (match = /^\/api\/tasks\/([^/]+)\/(draft|run|submit)$/.exec(path)) &&
      ["POST", "PUT"].includes(method)
    ) {
      const task = availableTask(match[1], user, b.assignment_id,match[2]!=='submit'),
        action = match[2],
        mode = b.mode ?? "python";
      if (action === "draft") {
        if (user.role !== "student") fail(403, "Черновик доступен ученику.");
        // Saving one's own safe draft is allowed even if the mode was closed later (MODE_MODEL §5).
        modeRules("draft", mode, task, user);
        const base = b.revision ?? 0;
        if (!Number.isInteger(base) || base < 0)
          fail(400, "Неверная версия черновика.");
        if (mode !== "python") {
          // Draft-level check only: incomplete programs, empty sockets and unnamed values are normal.
          const shape = adaptive.validateWorkspaceShape(b.workspace);
          if (!shape.ok) fail(400, shape.errors[0].message, { translation_errors: shape.errors.slice(0, 5) });
          const workspace = JSON.stringify(b.workspace);
          const current = get("SELECT workspace,revision FROM assignment_block_drafts WHERE user_id=? AND assignment_id=?", user.id, task.assignment_id);
          if (current && base !== current.revision) {
            const conflictId = randomUUID();
            run("INSERT INTO assignment_block_draft_history VALUES(?,?,?,?,?,?,?,?)", conflictId, user.org_id, user.id, task.assignment_id, base, workspace, 1, now());
            fail(409, "В другой вкладке сохранён другой вариант блоков. Оба варианта сохранены.", { current: { workspace: JSON.parse(current.workspace), revision: current.revision }, conflict_id: conflictId });
          }
          const revision = (current?.revision || 0) + 1;
          tx(() => {
            if (current) run("INSERT INTO assignment_block_draft_history VALUES(?,?,?,?,?,?,?,?)", randomUUID(), user.org_id, user.id, task.assignment_id, current.revision, current.workspace, 0, now());
            run("INSERT INTO assignment_block_drafts(user_id,assignment_id,org_id,workspace,format,revision,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,assignment_id) DO UPDATE SET workspace=excluded.workspace,format=excluded.format,revision=excluded.revision,updated_at=excluded.updated_at", user.id, task.assignment_id, user.org_id, workspace, adaptive.WORKSPACE_FORMAT, revision, now());
          });
          return { saved_at: now(), revision, mode };
        }
        const code = codeText(b.code);
        const current = get(
            "SELECT code,revision FROM assignment_drafts WHERE user_id=? AND assignment_id=?",
            user.id,
            task.assignment_id,
          );
        if (current && base !== current.revision) {
          const conflictId = randomUUID();
          run(
            "INSERT INTO assignment_draft_history VALUES(?,?,?,?,?,?,?,?)",
            conflictId,
            user.org_id,
            user.id,
            task.assignment_id,
            base,
            code,
            1,
            now(),
          );
          fail(
            409,
            "В другой вкладке сохранён другой вариант решения. Оба варианта сохранены.",
            { current, conflict_id: conflictId },
          );
        }
        const revision = (current?.revision || 0) + 1;
        tx(() => {
          if (current)
            run(
              "INSERT INTO assignment_draft_history VALUES(?,?,?,?,?,?,?,?)",
              randomUUID(),
              user.org_id,
              user.id,
              task.assignment_id,
              current.revision,
              current.code,
              0,
              now(),
            );
          run(
            "INSERT INTO assignment_drafts(user_id,assignment_id,code,updated_at,revision) VALUES(?,?,?,?,?) ON CONFLICT(user_id,assignment_id) DO UPDATE SET code=excluded.code,updated_at=excluded.updated_at,revision=excluded.revision",
            user.id,
            task.assignment_id,
            code,
            now(),
            revision,
          );
        });
        return { saved_at: now(), revision, mode };
      }
      if (action === "run") {
        modeRules("run", mode, task, user);
        assertEnvironment(task, user);
        const inputs = inputsOf(b.inputs);
        limit(`execute:${user.id}`, 50, 60000);
        const program = await programOf(user, task, b);
        const result = await execute(program.code, inputs, { tenant: user.org_id });
        // The mirror shows exactly the program that ran.
        return { ...result, mode, ...(mode === "python" ? {} : { python: program.code, translator: program.translator, warnings: program.warnings }) };
      }
      return await acceptSubmission(user, task, b);
    }
    if ((match = /^\/api\/attempts\/([^/]+)$/.exec(path)) && method === "GET") {
      const a = own("attempts", match[1], user);
      if (user.role === "student" && a.user_id !== user.id)
        fail(404, "Попытка не найдена.");
      const { snapshot, ...rest } = a;
      return {
        ...rest,
        task_title:JSON.parse(snapshot).title,
        version_revision:JSON.parse(snapshot).revision,
        result: JSON.parse(a.result),
        ...(user.role === "student" ? {} : { snapshot: JSON.parse(snapshot) }),
      };
    }
    fail(404, "Страница API не найдена.");
  }
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    const path = new URL(req.url, "http://localhost").pathname;
    if (path.startsWith("/api/")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      try {
        if (!["GET", "HEAD"].includes(req.method)) {
          const expected =
            process.env.KODIK_ORIGIN ||
            `http${secure ? "s" : ""}://${req.headers.host}`;
          if (req.headers.origin !== expected)
            fail(403, "Запрос с другого сайта запрещён.");
          if (!req.headers["content-type"]?.startsWith("application/json"))
            fail(415, "Требуется JSON.");
        }
        let body = "",
          size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 192000) fail(413, "Запрос слишком большой.");
          body += chunk;
        }
        let b = {};
        if (body) {
          try {
            b = JSON.parse(body);
          } catch {
            fail(400, "Неверный JSON.");
          }
        }
        if (!b || typeof b !== "object" || Array.isArray(b))
          fail(400, "Неверный запрос.");
        const result = await route(req, res, path, b);
        res.end(JSON.stringify(result));
      } catch (e) {
        res.statusCode = e.status || 500;
        if (!e.status)
          console.error(
            JSON.stringify({
              event: "b2b_api_error",
              incident: randomUUID(),
              kind: e.constructor?.name || "Error",
            }),
          );
        res.end(
          JSON.stringify({
            error: e.status ? e.message : "Ошибка сервера. Повторите запрос.",
            ...(e.status ? e.details : {}),
          }),
        );
      }
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    try {
      const base = resolve(root, "dist"),
        requested = resolve(base, "." + decodeURIComponent(path));
      if (requested !== base && !requested.startsWith(base + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let file = requested;
      try {
        if (!(await stat(file)).isFile()) file = resolve(base, "index.html");
      } catch {
        file = resolve(base, "index.html");
      }
      const mime = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2",
      };
      res.setHeader(
        "Content-Type",
        mime[extname(file)] || "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
      );
      res.end(req.method === "HEAD" ? undefined : await readFile(file));
    } catch {
      res.writeHead(503);
      res.end("Сначала выполните npm run build.");
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on("close", () => db.close());
  const closeHttp = server.close.bind(server);
  server.close = (callback) => {
    shuttingDown = true;
    void submissions.close().then(() => closeHttp(callback));
    return server;
  };
  return { server, db };
}
