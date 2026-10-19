import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

function initialSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, login TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')), recovery TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS courses(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS modules(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), course_id TEXT NOT NULL REFERENCES courses(id), title TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS lessons(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), module_id TEXT NOT NULL REFERENCES modules(id), title TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), lesson_id TEXT NOT NULL REFERENCES lessons(id), title TEXT NOT NULL, description TEXT NOT NULL, goal TEXT NOT NULL, theory TEXT NOT NULL, instruction TEXT NOT NULL, difficulty TEXT NOT NULL, starter TEXT NOT NULL, hints TEXT NOT NULL, check_mode TEXT NOT NULL, tests TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS groups_(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), title TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS group_members(group_id TEXT NOT NULL REFERENCES groups_(id), user_id TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(group_id,user_id));
    CREATE TABLE IF NOT EXISTS assignments(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), group_id TEXT NOT NULL REFERENCES groups_(id), task_id TEXT NOT NULL REFERENCES tasks(id), due_at TEXT, UNIQUE(group_id,task_id));
    CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), user_id TEXT NOT NULL REFERENCES users(id), task_id TEXT NOT NULL REFERENCES tasks(id), code TEXT NOT NULL, status TEXT NOT NULL, result TEXT NOT NULL, snapshot TEXT NOT NULL, feedback TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS drafts(user_id TEXT NOT NULL REFERENCES users(id), task_id TEXT NOT NULL REFERENCES tasks(id), code TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,task_id));
    CREATE INDEX IF NOT EXISTS attempts_org ON attempts(org_id,user_id,task_id);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
    CREATE INDEX IF NOT EXISTS tasks_org ON tasks(org_id);
    CREATE INDEX IF NOT EXISTS members_user ON group_members(user_id);`);
}
const migrations = [
  { version: 1, name: "original_b2b_schema", up: initialSchema },
  {
    version: 2,
    name: "account_access",
    up(db) {
      if (
        !db
          .prepare("PRAGMA table_info(users)")
          .all()
          .some((c) => c.name === "active")
      )
        db.exec(
          "ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))",
        );
    },
  },
  {
    version: 3,
    name: "durable_authoring",
    up(db) {
      db.exec(`
      CREATE TABLE material_revisions(id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), task_id TEXT NOT NULL REFERENCES tasks(id), author_id TEXT NOT NULL REFERENCES users(id), base_revision INTEGER NOT NULL, accepted_revision INTEGER, content TEXT NOT NULL, conflict INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
      CREATE INDEX material_revisions_task ON material_revisions(org_id,task_id,created_at);
      CREATE TABLE authoring_keys(user_id TEXT NOT NULL REFERENCES users(id), client_key TEXT NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id), PRIMARY KEY(user_id,client_key));
      CREATE TABLE audit_log(id TEXT PRIMARY KEY, org_id TEXT REFERENCES organizations(id), actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
      CREATE INDEX audit_org_time ON audit_log(org_id,created_at);
      CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);
    `);
    },
  },
  {
    version: 4,
    name: "durable_submissions",
    up(db) {
      db.exec(`CREATE TABLE submission_jobs(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),task_id TEXT NOT NULL REFERENCES tasks(id),request_key TEXT NOT NULL,code TEXT NOT NULL,snapshot TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('queued','running','completed','cancelled')),result TEXT,attempt_id TEXT REFERENCES attempts(id),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,request_key));
      CREATE INDEX submissions_pending ON submission_jobs(status,created_at);
      CREATE INDEX submissions_user ON submission_jobs(org_id,user_id,created_at);`);
    },
  },
  {
    version: 5,
    name: "student_draft_concurrency",
    up(db) {
      db.exec(`ALTER TABLE drafts ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
      CREATE TABLE student_draft_history(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),task_id TEXT NOT NULL REFERENCES tasks(id),base_revision INTEGER NOT NULL,code TEXT NOT NULL,conflict INTEGER NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX student_draft_owner ON student_draft_history(user_id,task_id,created_at);`);
    },
  },
  {
    version: 6,
    name: "immutable_assignment_versions",
    up(db) {
      db.exec(`CREATE TABLE task_versions(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),task_id TEXT NOT NULL REFERENCES tasks(id),revision INTEGER NOT NULL,snapshot TEXT NOT NULL,legacy_source INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,UNIQUE(task_id,revision));
      ALTER TABLE tasks ADD COLUMN published_version_id TEXT REFERENCES task_versions(id);
      CREATE TABLE assignments_new(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),group_id TEXT NOT NULL REFERENCES groups_(id),task_id TEXT NOT NULL REFERENCES tasks(id),due_at TEXT,version_id TEXT REFERENCES task_versions(id),archived INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
      INSERT INTO assignments_new(id,org_id,group_id,task_id,due_at,created_at) SELECT id,org_id,group_id,task_id,due_at,datetime('now') FROM assignments;
      DROP TABLE assignments;
      ALTER TABLE assignments_new RENAME TO assignments;
      CREATE INDEX assignments_group ON assignments(org_id,group_id,archived);
      ALTER TABLE attempts ADD COLUMN assignment_id TEXT REFERENCES assignments(id);
      ALTER TABLE attempts ADD COLUMN version_id TEXT REFERENCES task_versions(id);
      ALTER TABLE attempts ADD COLUMN context_origin TEXT NOT NULL DEFAULT 'legacy';
      ALTER TABLE submission_jobs ADD COLUMN assignment_id TEXT REFERENCES assignments(id);
      ALTER TABLE submission_jobs ADD COLUMN version_id TEXT REFERENCES task_versions(id);
      CREATE TABLE assignment_drafts(user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),code TEXT NOT NULL,updated_at TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(user_id,assignment_id));
      CREATE TABLE assignment_draft_history(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),base_revision INTEGER NOT NULL,code TEXT NOT NULL,conflict INTEGER NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX attempts_assignment ON attempts(org_id,assignment_id,user_id,created_at);
      CREATE INDEX assignment_draft_owner ON assignment_draft_history(user_id,assignment_id,created_at);`);
      const at=new Date().toISOString();
      for(const task of db.prepare('SELECT * FROM tasks WHERE published=1 OR id IN (SELECT task_id FROM assignments)').all()) {
        const id=randomUUID();
        db.prepare('INSERT INTO task_versions VALUES(?,?,?,?,?,1,?)').run(id,task.org_id,task.id,task.revision,JSON.stringify(task),at);
        db.prepare('UPDATE tasks SET published_version_id=? WHERE id=?').run(id,task.id);
        db.prepare('UPDATE assignments SET version_id=? WHERE task_id=?').run(id,task.id);
      }
      // Only an unambiguous old draft can be attached to a current assignment.
      // Original drafts, attempts and job snapshots remain intact as legacy history.
      db.exec(`INSERT INTO assignment_drafts(user_id,assignment_id,code,updated_at,revision)
      SELECT d.user_id,MIN(a.id),d.code,d.updated_at,d.revision FROM drafts d JOIN group_members gm ON gm.user_id=d.user_id JOIN assignments a ON a.group_id=gm.group_id AND a.task_id=d.task_id GROUP BY d.user_id,d.task_id HAVING COUNT(a.id)=1;`);
      db.exec(`CREATE TRIGGER task_versions_no_update BEFORE UPDATE ON task_versions BEGIN SELECT RAISE(ABORT,'Published versions are immutable'); END;
      CREATE TRIGGER task_versions_no_delete BEFORE DELETE ON task_versions BEGIN SELECT RAISE(ABORT,'Published versions are immutable'); END;`);
    },
  },
  {
    version:7,
    name:'assignment_operations_and_order',
    up(db){
      db.exec(`ALTER TABLE assignments ADD COLUMN order_snapshot TEXT NOT NULL DEFAULT '{}';
      ALTER TABLE assignments ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
      CREATE TABLE assignment_operations(org_id TEXT NOT NULL REFERENCES organizations(id),request_key TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL,response TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,request_key));`);
    },
  },
  {
    version:8,name:'lesson_versions_and_program_runs',
    up(db){
      db.exec(`ALTER TABLE lessons ADD COLUMN goal TEXT NOT NULL DEFAULT '';
      ALTER TABLE lessons ADD COLUMN description TEXT NOT NULL DEFAULT '';
      ALTER TABLE lessons ADD COLUMN duration INTEGER NOT NULL DEFAULT 45;
      ALTER TABLE lessons ADD COLUMN teacher_notes TEXT NOT NULL DEFAULT '';
      ALTER TABLE lessons ADD COLUMN steps TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE lessons ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE lessons ADD COLUMN published_version_id TEXT REFERENCES lesson_versions(id);
      ALTER TABLE lessons ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
      CREATE TABLE lesson_versions(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),lesson_id TEXT NOT NULL REFERENCES lessons(id),revision INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(lesson_id,revision));
      CREATE TRIGGER lesson_versions_no_update BEFORE UPDATE ON lesson_versions BEGIN SELECT RAISE(ABORT,'Published lessons are immutable'); END;
      CREATE TRIGGER lesson_versions_no_delete BEFORE DELETE ON lesson_versions BEGIN SELECT RAISE(ABORT,'Published lessons are immutable'); END;
      CREATE TABLE lesson_revisions(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),lesson_id TEXT NOT NULL REFERENCES lessons(id),author_id TEXT NOT NULL REFERENCES users(id),base_revision INTEGER NOT NULL,accepted_revision INTEGER,content TEXT NOT NULL,conflict INTEGER NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX lesson_history ON lesson_revisions(org_id,lesson_id,created_at);
      CREATE TABLE teaching_runs(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),group_id TEXT NOT NULL REFERENCES groups_(id),actor_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,payload TEXT NOT NULL,scope TEXT NOT NULL,source_id TEXT NOT NULL,title TEXT NOT NULL,snapshot TEXT NOT NULL,due_at TEXT,archived INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,UNIQUE(org_id,request_key));
      CREATE TABLE lesson_runs(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),run_id TEXT NOT NULL REFERENCES teaching_runs(id),lesson_id TEXT NOT NULL REFERENCES lessons(id),version_id TEXT NOT NULL REFERENCES lesson_versions(id),position INTEGER NOT NULL,state TEXT NOT NULL CHECK(state IN ('scheduled','open','closed')),revision INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE run_enrollments(run_id TEXT NOT NULL REFERENCES teaching_runs(id),user_id TEXT NOT NULL REFERENCES users(id),start_position INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,PRIMARY KEY(run_id,user_id));
      CREATE TABLE lesson_step_progress(user_id TEXT NOT NULL REFERENCES users(id),lesson_run_id TEXT NOT NULL REFERENCES lesson_runs(id),step_id TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('completed','incorrect')),answer INTEGER,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,lesson_run_id,step_id));
      CREATE TABLE lesson_step_events(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),lesson_run_id TEXT NOT NULL REFERENCES lesson_runs(id),step_id TEXT NOT NULL,answer INTEGER,correct INTEGER NOT NULL,created_at TEXT NOT NULL);
      ALTER TABLE assignments ADD COLUMN run_id TEXT REFERENCES teaching_runs(id);
      ALTER TABLE assignments ADD COLUMN lesson_run_id TEXT REFERENCES lesson_runs(id);
      ALTER TABLE assignments ADD COLUMN step_id TEXT;
      CREATE INDEX runs_group ON teaching_runs(org_id,group_id,archived);
      CREATE INDEX assignments_run ON assignments(org_id,run_id,lesson_run_id);
      CREATE INDEX progress_lesson_owner ON lesson_step_progress(lesson_run_id,user_id);
      CREATE INDEX step_events_owner ON lesson_step_events(lesson_run_id,user_id,step_id);`);
    }
  },
  {version:9,name:'verified_task_publication',up(db){db.exec(`
    ALTER TABLE tasks ADD COLUMN reference_solution TEXT NOT NULL DEFAULT '';
    ALTER TABLE tasks ADD COLUMN wrong_solutions TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE tasks ADD COLUMN manual_criteria TEXT NOT NULL DEFAULT '';
    ALTER TABLE tasks ADD COLUMN preview_solution TEXT NOT NULL DEFAULT '';
    ALTER TABLE tasks ADD COLUMN template_id TEXT NOT NULL DEFAULT '';
    CREATE TABLE task_verifications(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),task_id TEXT NOT NULL REFERENCES tasks(id),author_id TEXT NOT NULL REFERENCES users(id),revision INTEGER NOT NULL,fingerprint TEXT NOT NULL,runtime_hash TEXT NOT NULL,status TEXT NOT NULL,reference_result TEXT NOT NULL,wrong_results TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE INDEX task_verifications_revision ON task_verifications(org_id,task_id,revision,created_at);
    ALTER TABLE task_versions ADD COLUMN verification_id TEXT REFERENCES task_verifications(id);
  `)}},
  {version:10,name:'task_learning_rules',up(db){db.exec("ALTER TABLE tasks ADD COLUMN learning_rules TEXT NOT NULL DEFAULT '[]';")}},
  // One task, several solving modes (docs/adaptive/MODE_MODEL.md). Existing tasks stay Python-only:
  // learning_config '{}' means "Python only"; existing assignments get an explicit locked Python policy.
  {version:11,name:'solving_modes',up(db){db.exec(`
    ALTER TABLE tasks ADD COLUMN learning_config TEXT NOT NULL DEFAULT '{}';
    ALTER TABLE tasks ADD COLUMN block_solution TEXT NOT NULL DEFAULT '';
    ALTER TABLE task_verifications ADD COLUMN block_result TEXT NOT NULL DEFAULT '{}';
    ALTER TABLE assignments ADD COLUMN mode_policy TEXT NOT NULL DEFAULT '{"allowed":["python"],"start":"python","switching":"locked"}';
    ALTER TABLE attempts ADD COLUMN mode TEXT NOT NULL DEFAULT 'python' CHECK(mode IN ('python','blocks','mixed'));
    ALTER TABLE attempts ADD COLUMN source TEXT;
    ALTER TABLE attempts ADD COLUMN translator TEXT;
    ALTER TABLE attempts ADD COLUMN policy TEXT;
    ALTER TABLE submission_jobs ADD COLUMN mode TEXT NOT NULL DEFAULT 'python' CHECK(mode IN ('python','blocks','mixed'));
    ALTER TABLE submission_jobs ADD COLUMN source TEXT;
    ALTER TABLE submission_jobs ADD COLUMN translator TEXT;
    ALTER TABLE submission_jobs ADD COLUMN policy TEXT;
    CREATE TABLE assignment_block_drafts(user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),org_id TEXT NOT NULL REFERENCES organizations(id),workspace TEXT NOT NULL,format INTEGER NOT NULL DEFAULT 1,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,assignment_id));
    CREATE TABLE assignment_block_draft_history(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),base_revision INTEGER NOT NULL,workspace TEXT NOT NULL,conflict INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE assignment_mode_state(assignment_id TEXT NOT NULL REFERENCES assignments(id),user_id TEXT NOT NULL REFERENCES users(id),org_id TEXT NOT NULL REFERENCES organizations(id),mode TEXT CHECK(mode IS NULL OR mode IN ('python','blocks','mixed')),offered_mode TEXT CHECK(offered_mode IS NULL OR offered_mode IN ('python','blocks','mixed')),override TEXT,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(assignment_id,user_id));
    CREATE TABLE mode_events(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),user_id TEXT REFERENCES users(id),actor_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN ('policy_changed','override_changed','offered','offer_accepted','offer_declined','switched','teacher_set')),from_mode TEXT,to_mode TEXT,reason TEXT NOT NULL DEFAULT '',details TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
    CREATE INDEX mode_events_assignment ON mode_events(org_id,assignment_id,created_at);
    CREATE INDEX block_drafts_assignment ON assignment_block_drafts(org_id,assignment_id);
  `)}},
  {version:12,name:'school_pilot_operations',up(db){db.exec(`
    ALTER TABLE groups_ ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN created_by TEXT REFERENCES users(id);
    ALTER TABLE users ADD COLUMN platform_owner INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE attempts ADD COLUMN review_revision INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE group_teachers(group_id TEXT NOT NULL REFERENCES groups_(id),user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN ('primary','co')),PRIMARY KEY(group_id,user_id));
    CREATE TABLE help_requests(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT REFERENCES assignments(id),lesson_run_id TEXT REFERENCES lesson_runs(id),step_id TEXT,status TEXT NOT NULL DEFAULT 'open',message TEXT NOT NULL,answer TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,resolved_at TEXT,resolved_by TEXT REFERENCES users(id));
    CREATE UNIQUE INDEX help_open_assignment ON help_requests(user_id,assignment_id) WHERE status='open' AND assignment_id IS NOT NULL;
    CREATE UNIQUE INDEX help_open_step ON help_requests(user_id,lesson_run_id,step_id) WHERE status='open' AND assignment_id IS NULL;
    CREATE TABLE review_history(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),attempt_id TEXT NOT NULL REFERENCES attempts(id),actor_id TEXT NOT NULL REFERENCES users(id),revision INTEGER NOT NULL,before_status TEXT NOT NULL,after_status TEXT NOT NULL,before_feedback TEXT NOT NULL,after_feedback TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(attempt_id,revision));
    CREATE TABLE licenses(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),revision INTEGER NOT NULL,student_limit INTEGER NOT NULL,expires_at TEXT,status TEXT NOT NULL CHECK(status IN ('active','suspended','legacy')),actor_id TEXT,created_at TEXT NOT NULL,UNIQUE(org_id,revision));
    CREATE TABLE companies(id TEXT PRIMARY KEY,org_id TEXT UNIQUE REFERENCES organizations(id),name TEXT NOT NULL,contact_name TEXT NOT NULL DEFAULT '',contact TEXT NOT NULL DEFAULT '',source TEXT NOT NULL DEFAULT '',responsible TEXT NOT NULL DEFAULT '',stage TEXT NOT NULL DEFAULT 'new',notes TEXT NOT NULL DEFAULT '',next_action TEXT NOT NULL DEFAULT '',next_at TEXT,revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
    CREATE TABLE pilot_operations(org_id TEXT NOT NULL REFERENCES organizations(id),request_key TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,payload TEXT NOT NULL,response TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,request_key));
    CREATE TABLE task_families(task_id TEXT PRIMARY KEY REFERENCES tasks(id),org_id TEXT NOT NULL REFERENCES organizations(id),family TEXT NOT NULL);
    CREATE TABLE recommendations(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),user_id TEXT NOT NULL REFERENCES users(id),target_mode TEXT NOT NULL,rule_version TEXT NOT NULL,basis TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('proposed','offered','accepted','declined','dismissed','expired')),expires_at TEXT NOT NULL,created_at TEXT NOT NULL,teacher_id TEXT REFERENCES users(id),UNIQUE(assignment_id,user_id,target_mode,rule_version));
    CREATE TABLE recommendation_events(id TEXT PRIMARY KEY,recommendation_id TEXT NOT NULL REFERENCES recommendations(id),actor_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE INDEX help_school ON help_requests(org_id,status,created_at);
    CREATE INDEX review_school ON review_history(org_id,attempt_id,revision);
    INSERT INTO licenses SELECT lower(hex(randomblob(16))),id,1,300,NULL,'legacy',NULL,datetime('now') FROM organizations;
  `)}},
  {version:13,name:'resumable_course_installation',up(db){
    db.exec("CREATE TABLE course_imports(org_id TEXT NOT NULL REFERENCES organizations(id),template TEXT NOT NULL,course_id TEXT NOT NULL REFERENCES courses(id),status TEXT NOT NULL CHECK(status IN ('building','ready')),updated_at TEXT NOT NULL,PRIMARY KEY(org_id,template));");
    const legacyCourses=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='courses'").get()?db.prepare("SELECT * FROM courses WHERE description LIKE '[starter/v1]%' ORDER BY created_at").all():[];
    for(const c of legacyCourses){
      const count=db.prepare('SELECT COUNT(*) n FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=? AND l.published_version_id IS NOT NULL').get(c.id).n;
      db.prepare('INSERT OR IGNORE INTO course_imports VALUES(?,?,?,?,?)').run(c.org_id,'starter/v1',c.id,count===6?'ready':'building',new Date().toISOString());
      db.prepare("UPDATE courses SET description=? WHERE id=?").run('Шесть занятий по 40 минут: объяснение, пример, практика, вопрос и самостоятельная работа.',c.id);
    }
  }},
  {version:14,name:'existing_school_company_links',up(db){
    if(db.prepare("PRAGMA table_info(organizations)").all().some(c=>c.name==='name'))db.exec("INSERT INTO companies(id,org_id,name,source,stage,created_at) SELECT lower(hex(randomblob(16))),o.id,o.name,'Существующая школа','active',o.created_at FROM organizations o WHERE NOT EXISTS(SELECT 1 FROM companies c WHERE c.org_id=o.id) AND NOT EXISTS(SELECT 1 FROM users u WHERE u.org_id=o.id AND u.platform_owner=1);");
  }},
  // Checks of already issued work wait ('held') when the checking environment is not confirmed for
  // their pinned version; every new result records the environment that actually produced it.
  {version:15,name:'runtime_held_checks',up(db){
    const table=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='submission_jobs'").get().sql;
    const indexes=db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='submission_jobs' AND sql IS NOT NULL").all().map(r=>r.sql);
    const constrained=/CHECK\s*\(\s*status IN/.test(table);
    const widened=!constrained?table:table.replace("CHECK(status IN ('queued','running','completed','cancelled'))","CHECK(status IN ('queued','running','completed','cancelled','held'))").replace(/^CREATE TABLE "?submission_jobs"?/,'CREATE TABLE submission_jobs_new');
    if(constrained&&(widened===table||!widened.includes("'held'")))throw new Error('Unexpected submission_jobs schema; migration 15 refused.');
    const columns=db.prepare("PRAGMA table_info(submission_jobs)").all().map(c=>c.name).join(',');
    if(constrained)db.exec(`${widened};INSERT INTO submission_jobs_new(${columns}) SELECT ${columns} FROM submission_jobs;DROP TABLE submission_jobs;ALTER TABLE submission_jobs_new RENAME TO submission_jobs;`);
    if(constrained)for(const sql of indexes)db.exec(sql);
    db.exec(`ALTER TABLE submission_jobs ADD COLUMN runtime TEXT;
      ALTER TABLE attempts ADD COLUMN runtime TEXT;`);
  }}
];
export const schemaVersion = migrations.at(-1).version;
export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try {
    db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
    const current = db.prepare("PRAGMA user_version").get().user_version;
    if (current > schemaVersion)
      throw new Error(
        `Database schema ${current} is newer than supported schema ${schemaVersion}. Refusing to downgrade.`,
      );
    for (const migration of migrations) {
      if (migration.version <= current) continue;
      db.exec("BEGIN IMMEDIATE");
      try {
        migration.up(db);
        db.exec(`PRAGMA user_version=${migration.version}`);
        if (migration.version >= 3)
          db.prepare("INSERT INTO schema_migrations VALUES(?,?,?)").run(
            migration.version,
            migration.name,
            new Date().toISOString(),
          );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    if (db.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error(
        "Database integrity check failed; restore or repair the backup.",
      );
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
