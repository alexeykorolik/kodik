import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';

test('issuing work: durable idempotency, explicit repetition, immutable order, deadline changes and audit',async()=>{
  const h=await harness();
  try{
    const {admin}=await h.school('operations'),other=await h.school('operations-other'),{course,module,lesson}=await h.content(admin),student={};
    const uid=(await h.request('/users',{name:'Learner',login:'operations-student',password:h.password,role:'student'},admin)).id;
    await h.request('/auth/login',{login:'operations-student',password:h.password},student);
    const group=await h.request('/groups',{title:'Class'},admin);
    await h.request(`/groups/${group.id}/members`,{user_id:uid},admin);
    const lesson2=await h.request('/lessons',{module_id:module.id,title:'Second lesson'},admin);
    const first=await h.task(admin,lesson,{title:'First work'}),second=await h.task(admin,lesson2,{title:'Second work'});
    for(const task of [first,second])await h.request(`/tasks/${task.id}/publish`,{published:true},admin);
    const secondBody={group_id:group.id,task_id:second.id,request_key:'single-issued-operation-0001'};
    const [a,b]=await Promise.all([h.request('/assignments',secondBody,admin),h.request('/assignments',secondBody,admin)]);
    assert.equal(a.id,b.id);assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,1);
    assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE action=?').get('assignment.created').n,1);
    await h.request('/assignments',{...secondBody,due_at:'2026-12-01'},admin,409);
    await h.request('/assignments',{...secondBody,request_key:'another-issued-operation'},admin,409);
    await h.request('/assignments',secondBody,student,403);
    await h.request('/assignments',secondBody,other.admin,404);
    await h.request('/assignments',{group_id:group.id,task_id:first.id,request_key:null},admin,400);
    const firstAssignment=await h.request('/assignments',{group_id:group.id,task_id:first.id},admin);
    const before=await h.request('/state',undefined,student);
    assert.deepEqual(before.tasks.map(t=>t.assignment_id),[firstAssignment.id,a.id]);
    assert.equal(before.tasks[0].order_snapshot.course_id,course.id);
    // Reordering the current catalog cannot silently change an issued sequence.
    await h.request('/order',{kind:'lessons',ids:[lesson2.id,lesson.id]},admin);
    assert.deepEqual((await h.request('/state',undefined,student)).tasks.map(t=>t.assignment_id),[firstAssignment.id,a.id]);
    await h.request(`/tasks/${first.id}/draft`,{assignment_id:firstAssignment.id,revision:0,code:'print(4)'},student,200,'PUT');
    const changed=await h.request(`/assignments/${firstAssignment.id}`,{revision:1,due_at:'2026-12-01'},admin,200,'PUT');
    assert.equal(changed.id,firstAssignment.id);assert.equal(changed.revision,2);
    await h.request(`/assignments/${firstAssignment.id}`,{revision:1,due_at:'2026-12-02'},admin,409,'PUT');
    await h.request(`/assignments/${firstAssignment.id}`,{revision:2,due_at:'bad'},admin,400,'PUT');
    const after=await h.request('/state',undefined,student);
    assert.equal(after.drafts.find(d=>d.assignment_id===firstAssignment.id).code,'print(4)');
    assert.equal(after.tasks.find(t=>t.assignment_id===firstAssignment.id).due_at,'2026-12-01T00:00:00.000Z');
    const repeatBody={...secondBody,repeat_of:a.id,request_key:'explicit-repeat-operation'};
    const repeat=await h.request('/assignments',repeatBody,admin);
    assert.notEqual(repeat.id,a.id);
    await h.restart();
    assert.equal((await h.request('/assignments',repeatBody,admin)).id,repeat.id);
    await h.request(`/tasks/${second.id}/publish`,{published:false},admin);
    assert.equal((await h.request('/assignments',repeatBody,admin)).id,repeat.id);
    assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,3);
    await h.request(`/assignments/${repeat.id}`,{},admin,200,'DELETE');
    const actions=h.db.prepare('SELECT action FROM audit_log ORDER BY created_at').all().map(a=>a.action);
    assert.ok(actions.includes('assignment.repeated'));assert.ok(actions.includes('assignment.deadline_changed'));assert.ok(actions.includes('assignment.archived'));
    assert.ok(!JSON.stringify(h.db.prepare('SELECT * FROM audit_log').all()).includes(h.password));
    assert.deepEqual(h.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await h.close()}
});
