import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
// Audit: help requests were cut to the 200 newest of the whole school BEFORE access filtering, so
// processed history of group B pushed an open question of group A out of teacher A's list.
test('help: access is applied before limits; waiting requests and paged history stay reachable',async(t)=>{
  const h=await harness();try{
    const {admin}=await h.school('help-volume'),other=await h.school('help-volume-other'),{lesson}=await h.content(admin);
    const task=await h.task(admin,lesson,{title:'Помощь: задание',tests:[{inputs:[],expected:'1',hidden:false}]});await h.request(`/tasks/${task.id}/publish`,{published:true},admin);
    const login=async(name,role)=>{const user=await h.request('/users',{name,login:`help-${name}`,password:h.password,role},admin),c={};await h.request('/auth/login',{login:`help-${name}`,password:h.password},c);return {user,c}};
    const teacherA=await login('teacher-a','teacher'),teacherB=await login('teacher-b','teacher'),idle=await login('teacher-idle','teacher');
    const groupA=await h.request('/groups',{title:'Группа A'},admin),groupB=await h.request('/groups',{title:'Группа B'},admin);
    await h.request(`/groups/${groupA.id}/teachers`,{items:[{user_id:teacherA.user.id,kind:'primary'}]},admin,200,'PUT');
    await h.request(`/groups/${groupB.id}/teachers`,{items:[{user_id:teacherB.user.id,kind:'primary'}]},admin,200,'PUT');
    const kidA=await login('kid-a','student'),kidB=await login('kid-b','student');
    await h.request(`/groups/${groupA.id}/members`,{user_id:kidA.user.id},admin);await h.request(`/groups/${groupB.id}/members`,{user_id:kidB.user.id},admin);
    const aA=await h.request('/assignments',{group_id:groupA.id,task_id:task.id},admin),aB=await h.request('/assignments',{group_id:groupB.id,task_id:task.id},admin);
    const list=(c,q='')=>h.request('/help'+q,undefined,c);

    const question=await h.request('/help',{assignment_id:aA.id,message:'Не понимаю условие'},kidA.c);
    // 210 newer requests of group B, each answered by teacher B.
    for(let i=0;i<210;i++){const r=await h.request('/help',{assignment_id:aB.id,message:`Вопрос ${i}`},kidB.c);await h.request(`/help/${r.id}`,{answer:`Ответ ${i}`},teacherB.c,200,'PUT')}

    await t.test('teacher A still sees the open question of group A, with context',async()=>{
      const a=await list(teacherA.c);
      assert.ok(a.items.some(i=>i.id===question.id),'the open question of group A is in teacher A’s list');
      assert.equal(a.open.total,1);assert.equal(a.open.items[0].id,question.id);
      const item=a.open.items[0];assert.equal(item.name,'kid-a');assert.equal(item.group_title,'Группа A');assert.equal(item.task_title,'Помощь: задание');assert.equal(item.message,'Не понимаю условие');
      assert.equal(a.history.total,0,'history of another group is not counted');
    });
    await t.test('teacher B: own history is paged with true totals; no access to group A',async()=>{
      const first=await list(teacherB.c,'?limit=20'),last=await list(teacherB.c,'?limit=20&offset=200');
      assert.equal(first.open.total,0);assert.equal(first.history.total,210);assert.equal(first.history.items.length,20);assert.equal(last.history.items.length,10);
      const seen=new Set();for(let offset=0;offset<210;offset+=100)for(const i of (await list(teacherB.c,`?limit=100&offset=${offset}`)).history.items)seen.add(i.id);
      assert.equal(seen.size,210,'every old record is reachable by paging');
      assert.equal(first.history.items[0].answer,'Ответ 209','newest processed first');
      await h.request(`/help/${question.id}`,{answer:'чужая группа'},teacherB.c,404,'PUT');
    });
    await t.test('administrator sees the whole school; another school and an unassigned teacher see nothing',async()=>{
      const all=await list(admin);assert.equal(all.open.total,1);assert.equal(all.history.total,210);
      const foreign=await list(other.admin);assert.equal(foreign.open.total,0);assert.equal(foreign.history.total,0);
      const none=await list(idle.c);assert.deepEqual([none.open.total,none.history.total,none.items.length],[0,0,0],'empty means really nothing');
    });
    await t.test('the learner sees own request and then the answer; the list updates after the answer',async()=>{
      const own=await list(kidA.c,`?assignment_id=${aA.id}`);assert.equal(own.open.items[0].id,question.id);assert.equal(own.history.total,0);
      assert.equal((await list(kidB.c)).open.total,0,'learners never see other learners');
      await h.request(`/help/${question.id}`,{answer:'Разберём вместе первую строку'},teacherA.c,200,'PUT');
      const after=await list(teacherA.c);assert.equal(after.open.total,0);assert.equal(after.history.total,1);
      const mine=await list(kidA.c,`?assignment_id=${aA.id}&limit=1`);assert.equal(mine.open.total,0);assert.equal(mine.history.items[0].answer,'Разберём вместе первую строку');
      // A new question after the answer is a new request; a repeated one while open is not duplicated.
      const again=await h.request('/help',{assignment_id:aA.id,message:'Ещё вопрос'},kidA.c);assert.notEqual(again.id,question.id);
      assert.equal((await h.request('/help',{assignment_id:aA.id,message:'Ещё раз'},kidA.c)).id,again.id);
    });
  }finally{await h.close()}
});
