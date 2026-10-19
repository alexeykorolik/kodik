import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
import {verifyBackup} from '../scripts/verify-backup.mjs';
import {join} from 'node:path';
test('paid pilot: owner, CRM, server license limits, group grants, bulk class, help, reviews and restoration',async t=>{
  const h=await harness();try{
    const owner=await h.school('platform-owner'),other=await h.school('isolated-company');
    h.db.prepare('UPDATE users SET platform_owner=1 WHERE id=?').run(owner.user.id);
    const company=await h.request('/owner/companies',{name:'Школа пилота'},owner.admin);
    await h.request('/owner/companies',undefined,other.admin,403);
    const body={request_key:'pilot-connect-stable-key',name:'Администратор',login:'pilot-school-admin',password:h.password};
    const school=await h.request(`/owner/companies/${company.id}/connect`,body,owner.admin);
    assert.equal((await h.request(`/owner/companies/${company.id}/connect`,body,owner.admin)).org_id,school.org_id);
    const admin={};await h.request('/auth/login',{login:body.login,password:h.password},admin);
    await h.request('/groups',{title:'Нет лицензии'},admin,403);
    let l=(await h.request(`/owner/schools/${school.org_id}/licenses`,undefined,owner.admin)).current;
    await h.request(`/owner/schools/${school.org_id}/licenses`,{revision:l.revision,status:'active',student_limit:2,expires_at:'2099-01-01'},owner.admin);
    const g=await h.request('/groups',{title:'Пилот'},admin),hidden=await h.request('/groups',{title:'Другой класс'},admin);
    const teacher=await h.request('/users',{name:'Учитель',login:'pilot-group-teacher',password:h.password,role:'teacher'},admin),co=await h.request('/users',{name:'Совместный учитель',login:'pilot-co-teacher',password:h.password,role:'teacher'},admin);
    await h.request(`/groups/${g.id}/teachers`,{items:[{user_id:teacher.id,kind:'primary'},{user_id:co.id,kind:'co'}]},admin,200,'PUT');
    const tc={},cc={};await h.request('/auth/login',{login:'pilot-group-teacher',password:h.password},tc);await h.request('/auth/login',{login:'pilot-co-teacher',password:h.password},cc);
    assert.deepEqual((await h.request('/state',undefined,tc)).groups.map(g=>g.id),[g.id]);
    await h.request(`/groups/${hidden.id}/members`,{user_id:'anything'},tc,404);
    const rows=[{name:'Ученик',login:'pilot-bulk-child'},{name:'Другой ученик',login:'pilot-bulk-child-2'}],preview=await h.request(`/groups/${g.id}/import/preview`,{rows},admin);
    assert.ok(preview.can_import);
    const op={rows,preview_hash:preview.preview_hash,request_key:'pilot-bulk-import-stable'},imported=await h.request(`/groups/${g.id}/import`,op,admin);
    assert.equal(imported.count,2);assert.ok(imported.credentials[0].password);
    const replay=await h.request(`/groups/${g.id}/import`,op,admin);assert.equal(replay.count,2);assert.equal(replay.credentials.length,0);
    await h.request('/users',{name:'Превышение',login:'pilot-seat-overflow',password:h.password,role:'student'},admin,409);
    const child={},creds=imported.credentials[0];await h.request('/auth/login',{login:creds.login,password:creds.password},child);
    const c=await h.content(admin),task=await h.task(admin,c.lesson,{check_mode:'manual',manual_criteria:'Есть решение и понятное объяснение.'});await h.request(`/tasks/${task.id}/publish`,{published:true},admin);
    const assignment=await h.request('/assignments',{group_id:g.id,task_id:task.id},tc);
    const help=await h.request('/help',{assignment_id:assignment.id,message:'Не понимаю условие'},child);
    assert.equal((await h.request('/help',{assignment_id:assignment.id,message:'Ещё раз'},child)).id,help.id);
    await h.request(`/help/${help.id}`,{answer:'Разберём первый шаг'},tc,200,'PUT');
    assert.equal((await h.request('/help',undefined,child)).items[0].answer,'Разберём первый шаг');
    await h.request(`/help/${help.id}`,{answer:'Чужой'},other.admin,404,'PUT');
    const job=await h.request(`/tasks/${task.id}/submissions`,{assignment_id:assignment.id,code:'print(1)',request_key:'pilot-manual-submission'},child);
    let done=job;for(let i=0;i<100&&done.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));done=await h.request(`/submissions/${job.id}`,undefined,child)}
    assert.equal(done.result.status,'pending_review');
    await h.request(`/attempts/${done.attempt_id}/review`,{status:'failed',feedback:'Добавь объяснение',revision:0},tc);
    await h.request(`/attempts/${done.attempt_id}/review`,{status:'passed',feedback:'Проверено',revision:0},cc,409);
    await h.request(`/attempts/${done.attempt_id}/review`,{status:'passed',feedback:'Исправлено',revision:1},cc);
    await h.request(`/groups/${g.id}/members`,{user_id:imported.credentials[1].id},cc,403,'DELETE');
    const history=await h.request(`/attempts/${done.attempt_id}/reviews`,undefined,child);assert.equal(history.items.length,2);assert.equal(history.items[0].before_status,'pending_review');
    const report=await h.request('/reports?status=passed&limit=1&offset=0',undefined,tc);assert.equal(report.total,1);assert.equal(report.items[0].mode,'python');assert.ok(!JSON.stringify(report).includes('manual_criteria'));
    await h.request('/reports?group_id='+hidden.id,undefined,tc,404);
    await h.request(`/groups/${g.id}/teachers`,{items:[{user_id:co.id,kind:'primary'}]},admin,200,'PUT');
    await h.request(`/attempts/${done.attempt_id}`,undefined,tc,404);
    await h.request(`/submissions/${done.id}`,undefined,tc,404);
    assert.equal((await h.request('/help',undefined,tc)).items.length,0);
    assert.equal((await h.request('/reports',undefined,tc)).total,0);
    l=(await h.request(`/owner/schools/${school.org_id}/licenses`,undefined,owner.admin)).current;
    await h.request(`/owner/schools/${school.org_id}/licenses`,{revision:l.revision,status:'active',student_limit:2,expires_at:'2000-01-01'},owner.admin);
    await h.request(`/tasks/${task.id}/submissions`,{assignment_id:assignment.id,code:'print(2)',request_key:'expired-submission-key'},child,403);
    await h.request(`/tasks/${task.id}/draft`,{assignment_id:assignment.id,code:'print(2)',revision:0},child,200,'PUT');
    assert.equal((await h.request('/state',undefined,child)).attempts.length,1);
    const companyRow=(await h.request('/owner/companies',undefined,owner.admin)).items[0];
    await h.request(`/owner/companies/${company.id}`,{...companyRow,stage:'pilot',contact_name:'Директор',contact:'office@example.test',source:'Знакомство',responsible:'Владелец',notes:'Встреча проведена',next_action:'Обсудить пилот',next_at:'2098-12-01'},owner.admin,200,'PUT');
    await h.request(`/owner/companies/${company.id}`,{...companyRow,stage:'active'},owner.admin,409,'PUT');
    await h.request(`/groups/${g.id}/teachers`,{items:[]},admin,403,'PUT'); // expired license still protects mutations
    const restored=await verifyBackup(h.dbPath,join(h.dir,'restored.sqlite'));assert.ok(restored.verified);
    await h.restart();assert.equal((await h.request(`/attempts/${done.attempt_id}/reviews`,undefined,child)).items.length,2);
    assert.equal((await h.request('/owner/companies',undefined,owner.admin)).items[0].stage,'pilot');
  }finally{await h.close()}
});

test('interrupted course setup cannot issue a partial course and resumes the same records',async()=>{
  const h=await harness();try{
    const {admin}=await h.school('interrupted-starter'),group=await h.request('/groups',{title:'Класс'},admin);
    h.db.exec("CREATE TRIGGER pause_course BEFORE INSERT ON tasks WHEN (SELECT COUNT(*) FROM tasks)>=2 BEGIN SELECT RAISE(ABORT,'test setup interruption'); END;");
    await h.request('/starter-course/install',{},admin,500);
    const initial=await h.request('/state',undefined,admin);assert.equal(initial.courses.length,1);assert.equal(initial.courses[0].import_status,'building');
    await h.request('/programs/preview',{scope:'course',source_id:initial.courses[0].id,group_id:group.id},admin,409);
    h.db.exec('DROP TRIGGER pause_course');await h.restart();
    const installed=await h.request('/starter-course/install',{},admin);assert.equal(installed.id,initial.courses[0].id);
    const done=await h.request('/state',undefined,admin);assert.equal(done.courses.length,1);assert.equal(done.courses[0].import_status,'ready');assert.equal(done.tasks.length,12);
  }finally{await h.close()}
});

test('starter course: all six published lessons through assignments, drafts, all three modes and lesson progress',async()=>{
  const h=await harness();try{
    const {admin}=await h.school('starter-acceptance'),course=await h.request('/starter-course/install',{},admin);
    assert.equal((await h.request('/starter-course/install',{},admin)).id,course.id);
    const student=await h.request('/users',{name:'Курс',login:'starter-acceptance-child',password:h.password,role:'student'},admin),group=await h.request('/groups',{title:'Курс'},admin);
    await h.request(`/groups/${group.id}/members`,{user_id:student.id},admin);
    const preview=await h.request('/programs/preview',{scope:'course',source_id:course.id,group_id:group.id},admin);
    assert.equal(preview.snapshot.lessons.length,6);
    const run=await h.request('/programs',{scope:'course',source_id:course.id,group_id:group.id,preview_hash:preview.preview_hash,request_key:'starter-course-acceptance'},admin);
    const child={};await h.request('/auth/login',{login:'starter-acceptance-child',password:h.password},child);
    const program=(await h.request('/state',undefined,admin)).programs.find(p=>p.id===run.id);
    for(const [i,l] of program.lessons.entries()){
      if(i)await h.request(`/lesson-runs/${l.id}/state`,{state:'open',revision:l.revision},admin);
      let detail=await h.request(`/lesson-runs/${l.id}`,undefined,child);
      assert.ok(detail.assignments.every(a=>a.task.modes.supported.length===3));
      for(const step of detail.lesson.steps){
        const a=detail.assignments.find(a=>a.step_id===step.id);
        if(!a){await h.request(`/lesson-runs/${l.id}/steps/${step.id}`,step.type==='question'?{answer:0}:{acknowledged:true},child);continue}
        const task=h.db.prepare('SELECT * FROM tasks WHERE id=?').get(a.task.id),mode=['blocks','mixed','python'][(i+(step.type==='final'?1:0))%3];
        const payload=mode==='python'?{mode,code:task.reference_solution}:{mode,workspace:JSON.parse(task.block_solution)};
        await h.request(`/tasks/${task.id}/draft`,{...payload,revision:0,assignment_id:a.id},child,200,'PUT');
        const check=await h.request(`/tasks/${task.id}/submissions`,{...payload,assignment_id:a.id,request_key:crypto.randomUUID()},child);
        let job=check;for(let j=0;j<100&&job.status!=='completed';j++){await new Promise(r=>setTimeout(r,30));job=await h.request(`/submissions/${job.id}`,undefined,child)}assert.equal(job.result.status,'passed',task.title);
      }
      detail=await h.request(`/lesson-runs/${l.id}`,undefined,child);assert.equal(detail.progress.filter(p=>p.status==='completed').length,6);
    }
    const state=await h.request('/state',undefined,child);assert.equal(state.attempts.length,12);assert.deepEqual([...new Set(state.attempts.map(a=>a.mode))].sort(),['blocks','mixed','python']);
    for(const secret of ['reference_solution','block_solution','correct_index','teacher_notes'])assert.ok(!JSON.stringify(state).includes(secret));
  }finally{await h.close()}
});
