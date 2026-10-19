import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
import {executionQueue} from '../server/b2b/grader.mjs';
test('publication requires private, revision-bound executable evidence and rejects weak tests',async(t)=>{
  const h=await harness({verifyPublications:false});
  try{
    const {admin}=await h.school('quality'),other=await h.school('quality-other'),{lesson}=await h.content(admin);
    const task=await h.task(admin,lesson,{reference_solution:'',wrong_solutions:['print(4)'],preview_solution:'print("private-preview")'});
    const current=async()=> (await h.request('/state',undefined,admin)).tasks.find(t=>t.id===task.id);
    async function edit(fields){const previous=await current();await h.request(`/tasks/${task.id}`,{...previous,...fields},admin,200,'PUT');return previous.revision+1}
    await t.test('no publication without proof; wrong reference and accepted bad example block publication',async()=>{
      await h.request(`/tasks/${task.id}/publish`,{published:true},admin,409);
      await h.request(`/tasks/${task.id}/verify`,{revision:1},admin,400);
      let revision=await edit({reference_solution:'print(1)'});
      const bad=await h.request(`/tasks/${task.id}/verify`,{revision},admin);assert.equal(bad.status,'bad_reference');
      await h.request(`/tasks/${task.id}/publish`,{published:true,revision},admin,409);
      revision=await edit({reference_solution:'n = int(input())\nprint(n * 2)',wrong_solutions:['n = int(input())\nprint(n * 2)']});
      const weak=await h.request(`/tasks/${task.id}/verify`,{revision},admin);assert.equal(weak.status,'weak_tests');assert.equal(weak.wrong[0].status,'passed');
      await h.request(`/tasks/${task.id}/publish`,{published:true,revision},admin,409);
      revision=await edit({reference_solution:'private_reference_value = int(input())\nprint(private_reference_value * 2)',wrong_solutions:['print("private-wrong-example")','print(4)']});
      const proof=await h.request(`/tasks/${task.id}/verify`,{revision},admin);assert.equal(proof.status,'approved');assert.ok(proof.wrong.every(r=>r.status!=='passed'));
      const published=await h.request(`/tasks/${task.id}/publish`,{published:true,revision},admin);
      assert.equal(h.db.prepare('SELECT verification_id FROM task_versions WHERE id=?').get(published.version_id).verification_id,proof.id);
      const history=await h.request(`/tasks/${task.id}/verifications`,undefined,admin);assert.equal(history.items.length,3);assert.ok(history.items.every(v=>/^py:[a-f0-9]{32}:node\d+(\+bl:.+)?$/.test(v.runtime_hash)));
    });
    await t.test('student responses and teacher-only endpoints cannot disclose private programs',async()=>{
      const student={},user=await h.request('/users',{name:'Learner',login:'quality-student',password:h.password,role:'student'},admin),group=await h.request('/groups',{title:'Class'},admin);
      await h.request(`/groups/${group.id}/members`,{user_id:user.id},admin);await h.request('/assignments',{group_id:group.id,task_id:task.id},admin);
      await h.request('/auth/login',{login:'quality-student',password:h.password},student);
      const publicState=JSON.stringify(await h.request('/state',undefined,student));
      for(const secret of ['reference_solution','wrong_solutions','preview_solution','private_reference_value','private-wrong-example','private-preview','runtime_hash'])assert.ok(!publicState.includes(secret),secret);
      await h.request('/task-templates',undefined,student,403);await h.request(`/tasks/${task.id}/verifications`,undefined,student,403);await h.request(`/tasks/${task.id}/verify`,{revision:4},student,403);
      await h.request(`/tasks/${task.id}/verifications`,undefined,other.admin,404);
      const copy=await h.request(`/tasks/${task.id}/copy`,{},admin),copied=(await h.request('/state',undefined,admin)).tasks.find(t=>t.id===copy.id);
      assert.equal(copied.reference_solution,(await current()).reference_solution);assert.equal(copied.verification,null);await h.request(`/tasks/${copy.id}/publish`,{published:true},admin,409);
    });
    await t.test('changes invalidate approval; a concurrent edit during checking cannot approve the new revision',async()=>{
      let revision=await edit({starter:'# changed starter'});await h.request(`/tasks/${task.id}/publish`,{published:true,revision},admin,409);
      const old=h.db.prepare("SELECT id,revision FROM task_verifications WHERE task_id=? AND status='approved' ORDER BY created_at LIMIT 1").get(task.id);
      const replay=await h.request(`/tasks/${task.id}/verify`,{revision:old.revision,verification_id:old.id},admin);assert.equal(replay.status,'approved');assert.equal(replay.replay,true);assert.equal(replay.publication_eligible,false);assert.equal((await current()).verification,null);
      revision=await edit({reference_solution:'n = int(input())\ntotal = 0\nfor i in range(500):\n    total = total + 0\nprint(n * 2)'});
      const checking=h.request(`/tasks/${task.id}/verify`,{revision},admin,409);
      for(let i=0;i<100&&executionQueue.snapshot().active===0;i++)await new Promise(r=>setTimeout(r,5));
      assert.ok(executionQueue.snapshot().active>0,'a real verification executor is active');
      revision=await edit({goal:'Concurrent author changed the goal'});
      const rejected=await checking;assert.match(rejected.error,/изменились/);assert.equal((await current()).verification,null);
      const proof=await h.request(`/tasks/${task.id}/verify`,{revision},admin);assert.equal(proof.status,'approved');
      await h.request(`/tasks/${task.id}/publish`,{published:true,revision},admin);
      await h.restart();assert.equal((await current()).verification.revision,revision);
    });
    await t.test('all teacher templates validate their reference and characteristic wrong solutions',async()=>{
      const templates=(await h.request('/task-templates',undefined,admin)).items;assert.equal(templates.length,7);
      for(const template of templates){const created=await h.request('/tasks',{...template.task,template_id:template.id,lesson_id:lesson.id},admin);const proof=await h.request(`/tasks/${created.id}/verify`,{revision:1},admin);assert.equal(proof.status,'approved',template.id);await h.request(`/tasks/${created.id}/publish`,{published:true,revision:1},admin)}
      const manual=await h.task(admin,lesson,{check_mode:'manual',tests:[],reference_solution:'',wrong_solutions:[],manual_criteria:''});
      await h.request(`/tasks/${manual.id}/verify`,{revision:1},admin,400);
      const audit=h.db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action IN ('task.verified','task.published')").get().n;assert.ok(audit>=18);
    });
    await t.test('already issued legacy versions remain executable; new issuance requires current evidence',async()=>{
      const legacy=await h.task(admin,lesson,{title:'Previously issued',check_mode:'output',tests:[{inputs:[],expected:'42',hidden:false}],reference_solution:'',wrong_solutions:[]}),row=h.db.prepare('SELECT * FROM tasks WHERE id=?').get(legacy.id);
      const {reference_solution,wrong_solutions,preview_solution,manual_criteria,template_id,...oldSnapshot}=row;
      const version=crypto.randomUUID(),assignment=crypto.randomUUID(),student={};
      h.db.prepare('INSERT INTO task_versions(id,org_id,task_id,revision,snapshot,legacy_source,created_at) VALUES(?,?,?,?,?,1,?)').run(version,row.org_id,row.id,1,JSON.stringify(oldSnapshot),new Date().toISOString());
      h.db.prepare('UPDATE tasks SET published=1,published_version_id=? WHERE id=?').run(version,legacy.id);
      const user=await h.request('/users',{name:'Legacy learner',login:'legacy-quality-learner',password:h.password,role:'student'},admin),group=await h.request('/groups',{title:'Existing class'},admin);
      await h.request(`/groups/${group.id}/members`,{user_id:user.id},admin);
      h.db.prepare('INSERT INTO assignments(id,org_id,group_id,task_id,version_id,created_at) VALUES(?,?,?,?,?,?)').run(assignment,row.org_id,group.id,legacy.id,version,new Date().toISOString());
      await h.request('/auth/login',{login:'legacy-quality-learner',password:h.password},student);
      const visible=(await h.request('/state',undefined,student)).tasks.find(t=>t.id===legacy.id);assert.equal(visible.assignment_id,assignment);
      assert.deepEqual((await h.request(`/tasks/${legacy.id}/run`,{assignment_id:assignment,code:'print(42)',inputs:[]},student)).output,['42']);
      const otherGroup=await h.request('/groups',{title:'New class'},admin);await h.request('/assignments',{group_id:otherGroup.id,task_id:legacy.id},admin,409);
      assert.equal(h.db.prepare('SELECT snapshot FROM task_versions WHERE id=?').get(version).snapshot,JSON.stringify(oldSnapshot));
    });
  }finally{await h.close()}
});
