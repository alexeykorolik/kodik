import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase,schemaVersion} from '../server/b2b/database.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('schema 5 migration preserves legacy evidence and only assigns unambiguous drafts',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'kodik-old-schema-')),path=join(dir,'old.sqlite');
  let db=new DatabaseSync(path);
  try{
    // Frozen historical fixture: the relevant schema-5 columns, independent of
    // the migration implementation. No production records or passwords.
    db.exec(`CREATE TABLE organizations(id TEXT PRIMARY KEY);
      CREATE TABLE users(id TEXT PRIMARY KEY,org_id TEXT REFERENCES organizations(id));
      CREATE TABLE lessons(id TEXT PRIMARY KEY,org_id TEXT,module_id TEXT,title TEXT,position INTEGER);
      CREATE TABLE tasks(id TEXT PRIMARY KEY,org_id TEXT REFERENCES organizations(id),published INTEGER,revision INTEGER,title TEXT,tests TEXT,hints TEXT);
      CREATE TABLE groups_(id TEXT PRIMARY KEY,org_id TEXT REFERENCES organizations(id));
      CREATE TABLE group_members(group_id TEXT,user_id TEXT,PRIMARY KEY(group_id,user_id));
      CREATE TABLE assignments(id TEXT PRIMARY KEY,org_id TEXT,group_id TEXT,task_id TEXT,due_at TEXT,UNIQUE(group_id,task_id));
      CREATE TABLE drafts(user_id TEXT,task_id TEXT,code TEXT,updated_at TEXT,revision INTEGER,PRIMARY KEY(user_id,task_id));
      CREATE TABLE attempts(id TEXT PRIMARY KEY,org_id TEXT,user_id TEXT,created_at TEXT,snapshot TEXT);
      CREATE TABLE submission_jobs(id TEXT PRIMARY KEY,snapshot TEXT,request_key TEXT);
      CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,name TEXT,applied_at TEXT);
      INSERT INTO organizations VALUES('org');INSERT INTO users VALUES('learner','org');
      INSERT INTO groups_ VALUES('g1','org'),('g2','org');
      INSERT INTO group_members VALUES('g1','learner'),('g2','learner');
      INSERT INTO tasks VALUES('one','org',0,3,'Old unpublished assignment','[]','[]'),('two','org',1,2,'Two groups','[]','[]');
      INSERT INTO assignments VALUES('a1','org','g1','one',NULL),('a2','org','g1','two',NULL),('a3','org','g2','two',NULL);
      INSERT INTO drafts VALUES('learner','one','one private draft','2026-01-01',4),('learner','two','ambiguous private draft','2026-01-01',6);
      INSERT INTO attempts(id,snapshot) VALUES('old-attempt','{"title":"Original exact snapshot"}');
      INSERT INTO submission_jobs VALUES('old-job','{"title":"Accepted exact snapshot"}','stable-key');
      PRAGMA user_version=5;`);
    db.close();db=null;db=openDatabase(path);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version,schemaVersion);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,3);
    assert.ok(db.prepare('SELECT version_id FROM assignments WHERE id=?').get('a1').version_id);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM task_versions WHERE legacy_source=1').get().n,2);
    const attempt=db.prepare('SELECT * FROM attempts').get();
    assert.equal(attempt.snapshot,'{"title":"Original exact snapshot"}');assert.equal(attempt.context_origin,'legacy');assert.equal(attempt.assignment_id,null);assert.equal(attempt.version_id,null);
    const job=db.prepare('SELECT * FROM submission_jobs').get();assert.equal(job.request_key,'stable-key');assert.equal(job.snapshot,'{"title":"Accepted exact snapshot"}');assert.equal(job.assignment_id,null);
    const drafts=db.prepare('SELECT * FROM assignment_drafts').all();assert.equal(drafts.length,1);assert.equal(drafts[0].assignment_id,'a1');assert.equal(drafts[0].code,'one private draft');assert.equal(drafts[0].revision,4);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,2);
    db.prepare('INSERT INTO assignments(id,org_id,group_id,task_id,created_at) VALUES(?,?,?,?,?)').run('repeat','org','g1','one','2026-01-02');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{db?.close();await rm(dir,{recursive:true,force:true})}
});

test('immutable versions and independent assignment histories over real HTTP',async(t)=>{
  const h=await harness();
  try{
    const {admin}=await h.school('versions'),other=await h.school('versions-other'),{lesson}=await h.content(admin);
    const student={},uid=(await h.request('/users',{name:'Learner',login:'versions-student',password:h.password,role:'student'},admin)).id;
    await h.request('/auth/login',{login:'versions-student',password:h.password},student);
    const group=await h.request('/groups',{title:'Group'},admin);
    await h.request(`/groups/${group.id}/members`,{user_id:uid},admin);
    const task=await h.task(admin,lesson);
    const v1=await h.request(`/tasks/${task.id}/publish`,{published:true,revision:1},admin);
    const a=await h.request('/assignments',{group_id:group.id,task_id:task.id},admin);
    assert.equal(a.version_id,v1.version_id);
    const draftCode='n = int(input())\nprint(n * 2)';
    async function submit(assignment,code,key=crypto.randomUUID(),suffix='submissions'){
      let job=await h.request(`/tasks/${task.id}/${suffix}`,{assignment_id:assignment.id,code,request_key:key},student);
      for(let i=0;i<200&&!['completed','cancelled'].includes(job.status);i++){
        await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,student);
      }
      assert.equal(job.status,'completed');return job;
    }
    await t.test('published draft edits do not alter an assigned version',async()=>{
      await h.request(`/tasks/${task.id}/draft`,{assignment_id:a.id,code:draftCode,revision:0},student,200,'PUT');
      const result=await submit(a,draftCode);assert.equal(result.result.status,'passed');
      const material=(await h.request('/state',undefined,admin)).tasks.find(x=>x.id===task.id);
      await h.request(`/tasks/${task.id}`,{...material,title:'Triple',reference_solution:'n = int(input())\nprint(n * 3)',tests:[{inputs:['2'],expected:'6',hidden:false},{inputs:['987654'],expected:'2962962',hidden:true}]},admin,200,'PUT');
      const state=await h.request('/state',undefined,student);
      assert.equal(state.tasks[0].title,'Double');assert.equal(state.tasks[0].version_id,v1.version_id);
      assert.equal(state.tasks[0].examples[0].expected,'4');
      await h.request(`/tasks/${task.id}/publish`,{published:true,revision:1},admin,409);
      await h.request(`/tasks/${task.id}/publish`,{published:false},admin);
      assert.equal((await submit(a,draftCode)).result.status,'passed');
      assert.throws(()=>h.db.prepare('UPDATE task_versions SET snapshot=? WHERE id=?').run('{}',v1.version_id),/immutable/);
      assert.throws(()=>h.db.prepare('DELETE FROM task_versions WHERE id=?').run(v1.version_id),/immutable/);
    });
    let b,v2;
    await t.test('repeat assignment pins new publication without borrowing success or drafts',async()=>{
      v2=await h.request(`/tasks/${task.id}/publish`,{published:true,revision:2},admin);
      assert.notEqual(v1.version_id,v2.version_id);
      b=await h.request('/assignments',{group_id:group.id,task_id:task.id,repeat_of:a.id},admin);
      assert.notEqual(a.id,b.id);assert.equal(b.version_id,v2.version_id);
      const state=await h.request('/state',undefined,student);
      assert.equal(state.tasks.length,2);assert.equal(state.tasks.find(x=>x.assignment_id===a.id).title,'Double');
      assert.equal(state.tasks.find(x=>x.assignment_id===b.id).title,'Triple');
      assert.equal(state.drafts.filter(d=>d.assignment_id===b.id).length,0);
      assert.equal(state.attempts.filter(x=>x.assignment_id===b.id).length,0);
      assert.ok(!JSON.stringify(state).includes('987654'));assert.ok(!JSON.stringify(state).includes('2962962'));
      assert.ok(!state.tasks.some(x=>'tests' in x));
      await h.request(`/tasks/${task.id}/submissions`,{code:draftCode,request_key:crypto.randomUUID()},student,409);
      assert.equal((await submit(a,draftCode)).result.status,'passed');
      assert.equal((await submit(b,draftCode)).result.status,'failed');
      assert.equal((await submit(b,'n = int(input())\nprint(n * 3)')).result.status,'passed');
      await h.request(`/tasks/${task.id}/draft`,{assignment_id:b.id,code:'print(6)',revision:0},student,200,'PUT');
      const saved=await h.request('/state',undefined,student);
      assert.equal(saved.drafts.find(x=>x.assignment_id===a.id).code,draftCode);
      assert.equal(saved.drafts.find(x=>x.assignment_id===b.id).code,'print(6)');
    });
    await t.test('both submit endpoints share mandatory idempotency and versioned attempts',async()=>{
      await h.request(`/tasks/${task.id}/submit`,{assignment_id:a.id,code:draftCode},student,400);
      const key=crypto.randomUUID(),first=await submit(a,draftCode,key,'submit'),replay=await submit(a,draftCode,key);
      assert.equal(first.id,replay.id);
      await h.request(`/tasks/${task.id}/submissions`,{assignment_id:b.id,code:draftCode,request_key:key},student,409);
      const attempt=await h.request(`/attempts/${first.attempt_id}`,undefined,admin);
      assert.equal(attempt.assignment_id,a.id);assert.equal(attempt.version_id,v1.version_id);assert.equal(attempt.context_origin,'assignment');
      assert.equal(attempt.snapshot.title,'Double');
      const history=(await h.request('/state',undefined,student)).attempts.find(x=>x.id===first.attempt_id);
      assert.equal(history.task_title,'Double');assert.equal(history.version_revision,1);
      assert.ok(!JSON.stringify(history).includes('987654'));
      assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE id=?').get(first.attempt_id).n,1);
      await h.request(`/attempts/${first.attempt_id}`,undefined,other.admin,404);
      await h.request(`/tasks/${task.id}/draft`,{assignment_id:'forged',code:'secret',revision:0},student,404,'PUT');
    });
    await t.test('another group creates another context; archiving preserves history',async()=>{
      const g2=await h.request('/groups',{title:'Second group'},admin);
      await h.request(`/groups/${g2.id}/members`,{user_id:uid},admin);
      const c=await h.request('/assignments',{group_id:g2.id,task_id:task.id},admin);
      const before=await h.request('/state',undefined,student);
      assert.equal(before.tasks.length,3);assert.equal(before.attempts.filter(x=>x.assignment_id===c.id).length,0);
      assert.equal(before.drafts.filter(x=>x.assignment_id===c.id).length,0);
      await h.request(`/assignments/${a.id}`,{},admin,200,'DELETE');
      await h.request(`/tasks/${task.id}/run`,{assignment_id:a.id,code:'print(1)',inputs:[]},student,404);
      const state=await h.request('/state',undefined,student);
      assert.equal(state.tasks.length,2);assert.ok(state.attempts.some(x=>x.assignment_id===a.id));
      assert.equal(h.db.prepare('SELECT code FROM assignment_drafts WHERE assignment_id=?').get(a.id).code,draftCode);
      await h.restart();
      assert.equal((await h.request('/state',undefined,student)).tasks.find(x=>x.assignment_id===b.id).version_id,v2.version_id);
    });
  }finally{await h.close()}
});
