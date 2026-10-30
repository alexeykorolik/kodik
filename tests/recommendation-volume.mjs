import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness} from './helpers/b2b-harness.mjs';
import {recFixture} from './helpers/rec-fixture.mjs';
// Audit of ae54497: the list took the newest 200 recommendations of the whole school and only then
// applied access, so closed history of another group (or the learner's own) pushed a live offer out.
test('live offers stay reachable whatever the volume of closed history',async(t)=>{
  const h=await harness();try{
    const A=await recFixture(h,'vol-a',{groupTitle:'Группа A'}),admin=A.admin;
    const B=await recFixture(h,'vol-b',{admin,groupTitle:'Группа B'});
    const teacherA={},stranger={};
    const tA=await h.request('/users',{name:'Учитель A',login:'vol-teacher-a',password:h.password,role:'teacher'},admin);
    const tX=await h.request('/users',{name:'Учитель без групп',login:'vol-teacher-x',password:h.password,role:'teacher'},admin);
    await h.request(`/groups/${A.group.id}/teachers`,{items:[{user_id:tA.id,kind:'primary'}]},admin,200,'PUT');
    await h.request('/auth/login',{login:'vol-teacher-a',password:h.password},teacherA);await h.request('/auth/login',{login:'vol-teacher-x',password:h.password},stranger);
    await A.evidence();const live=await A.nextProposal();
    assert.equal((await h.request(`/recommendations/${live.rec.id}/approve`,{},teacherA)).status,'offered');
    const tkB=await B.task(),aB=await B.assign(tkB);
    // 230 newer, closed recommendations of group B, many with one and the same creation time.
    const insert=h.db.prepare("INSERT INTO recommendations(id,org_id,assignment_id,user_id,target_mode,rule_version,basis,status,expires_at,created_at,teacher_id,reason) VALUES(?,?,?,?,'mixed',?,?,'dismissed',?,?,NULL,'Отклонено')");
    // Unique per assignment, learner, target and rule version: older rule versions make the volume.
    const org=h.db.prepare('SELECT org_id FROM users WHERE id=?').get(A.user.id).org_id,later=new Date(Date.now()+60000).toISOString(),basis=JSON.stringify({attempts:[],families:[],checks:[],reason:'архив'});
    for(let i=0;i<230;i++)insert.run(randomUUID(),org,aB.id,B.user.id,'pilot-transition/0.'+i,basis,later,i<100?later:new Date(Date.now()+60000+i*1000).toISOString());
    // And 230 closed recommendations of learner A's own history, all with the live one's creation time.
    for(let i=0;i<230;i++)insert.run(randomUUID(),org,live.a.id,A.user.id,'pilot-transition/0.'+i,basis,later,live.rec.created_at);

    await t.test('teacher A still sees and withdraws the live offer of group A',async()=>{
      const r=await h.request('/recommendations',undefined,teacherA);
      // Behaviour first (the former flat list lost the offer), then the answer's shape.
      assert.ok((r.active?.items??r.items).some(x=>x.id===live.rec.id&&x.status==='offered'),'the live offer is listed');
      assert.equal(r.active.total,1);assert.equal(r.active.items[0].id,live.rec.id);assert.equal(r.active.items[0].status,'offered');
      const card=r.active.items[0];assert.equal(card.group_title,'Группа A');assert.equal(card.student_name,'Ученик vol-a');assert.match(card.task_title,/Вывод/);assert.equal(card.from_mode,'blocks');assert.equal(card.target_mode,'mixed');
      assert.equal(r.history.total,230,'only group A history is counted for teacher A');assert.ok(r.history.items.every(x=>x.group_id===A.group.id));
      assert.ok(r.history.items.length<=r.history.limit);
    });
    await t.test('learner A still receives the offer and its basis in the task workspace',async()=>{
      const r=await h.request(`/recommendations?assignment_id=${live.a.id}`,undefined,A.child);
      assert.ok((r.active?.items??r.items).some(x=>x.id===live.rec.id),'the learner gets the offer');
      assert.equal(r.active.total,1);assert.equal(r.active.items[0].id,live.rec.id);assert.ok(r.active.items[0].basis.reason);
      assert.equal(r.active.items[0].basis.checks,undefined,'internal checks stay with the teacher');
      const all=await h.request('/recommendations',undefined,A.child);assert.equal(all.active.items[0].id,live.rec.id);assert.equal(all.history.total,230);
    });
    await t.test('all history is reachable page by page in a stable order, also with equal creation times',async()=>{
      const seen=[];for(let offset=0;;offset+=50){const r=await h.request(`/recommendations?limit=50&offset=${offset}`,undefined,admin);seen.push(...r.history.items.map(x=>x.id));if(offset+50>=r.history.total)break}
      assert.equal(seen.length,460);assert.equal(new Set(seen).size,460,'no duplicates and nothing skipped');
      const again=await h.request('/recommendations?limit=50&offset=100',undefined,admin);assert.deepEqual(again.history.items.map(x=>x.id),seen.slice(100,150));
    });
    await t.test('administrator sees the school; another school and a teacher without access see nothing',async()=>{
      const r=await h.request('/recommendations',undefined,admin);assert.equal(r.active.items.find(x=>x.id===live.rec.id)?.status,'offered');assert.equal(r.history.total,460);
      const other=await h.school('vol-other');const o=await h.request('/recommendations',undefined,other.admin);assert.equal(o.active.total,0);assert.equal(o.history.total,0);
      const s=await h.request('/recommendations',undefined,stranger);assert.equal(s.active.total,0);assert.equal(s.history.total,0);
      await h.request(`/recommendations/${live.rec.id}/dismiss`,{},stranger,404);await h.request(`/recommendations/${live.rec.id}/dismiss`,{},other.admin,404);
      const b=await h.request('/recommendations',undefined,B.child);assert.equal(b.active.total,0);assert.equal(b.history.total,230,'learner B sees only own history');
    });
    await t.test('teacher A withdraws the offer; the learner no longer has it',async()=>{
      assert.equal((await h.request(`/recommendations/${live.rec.id}/dismiss`,{},teacherA)).status,'withdrawn');
      assert.equal((await A.learnerModes(live.a)).offered??null,null);
      const r=await h.request(`/recommendations?assignment_id=${live.a.id}`,undefined,A.child);assert.equal(r.active.total,0);assert.equal(r.history.items[0].id,live.rec.id,'the just-closed recommendation heads the history');
    });
  }finally{await h.close()}
});
