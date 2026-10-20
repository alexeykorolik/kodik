import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness} from './helpers/b2b-harness.mjs';
// Audit: after the teacher locked the mode (or forbade the target mode) a proposal could neither be
// approved nor dismissed, stayed "proposed" and blocked every further proposal for the learner.
const printWs=(n)=>({blocks:{languageVersion:0,blocks:[{type:'text_print',id:'p',x:10,y:10,inputs:{TEXT:{block:{type:'math_number',id:'pn',fields:{NUM:n}}}}}]}});
test('recommendation lifecycle: stale proposals are closed with a reason and free the next proposal',async(t)=>{
  const h=await harness();try{
    const {admin}=await h.school('rec-life'),content=await h.content(admin),group=await h.request('/groups',{title:'Режимы'},admin);
    const user=await h.request('/users',{name:'Ученик',login:'rec-life-kid',password:h.password,role:'student'},admin),child={};
    await h.request(`/groups/${group.id}/members`,{user_id:user.id},admin);await h.request('/auth/login',{login:'rec-life-kid',password:h.password},child);
    let n=40;
    async function task(){n++;const t=await h.task(admin,content.lesson,{title:`Вывод ${n}`,instruction:`Выведи число ${n}`,tests:[{inputs:[],expected:String(n),hidden:false}],reference_solution:`print(${n})`,learning_config:{modes:['blocks','mixed'],palette:['text_print','math_number'],skills:['output']},block_solution:printWs(n)});await h.request(`/tasks/${t.id}/publish`,{published:true},admin);return {...t,n}}
    const assign=tk=>h.request('/assignments',{group_id:group.id,task_id:tk.id,mode_policy:{allowed:['blocks','mixed','python'],start:'blocks',switching:'teacher'}},admin);
    async function solve(tk,a,num=tk.n){let job=await h.request(`/tasks/${tk.id}/submissions`,{mode:'blocks',workspace:printWs(num),assignment_id:a.id,request_key:randomUUID()},child);for(let i=0;i<100&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,child)}return job.result.status}
    const recs=async()=>{const r=await h.request('/recommendations',undefined,admin);return [...r.active.items,...r.history.items]};
    const active=async()=> (await recs()).filter(r=>['proposed','offered'].includes(r.status));
    const row=id=>h.db.prepare('SELECT status,reason FROM recommendations WHERE id=?').get(id);
    const events=(id,kind)=>h.db.prepare('SELECT COUNT(*) n FROM recommendation_events WHERE recommendation_id=?'+(kind?' AND kind=?':'')).get(...[id,...(kind?[kind]:[])]).n;
    // Evidence: two different tasks solved in blocks.
    for(let i=0;i<2;i++){const tk=await task(),a=await assign(tk);assert.equal(await solve(tk,a),'passed')}
    const nextProposal=async()=>{const tk=await task(),a=await assign(tk),list=await active();assert.equal(list.length,1,'exactly one active proposal');assert.equal(list[0].assignment_id,a.id);return {tk,a,rec:list[0]}};

    await t.test('locking the mode closes the proposal; it no longer blocks; a new task gets a proposal',async()=>{
      const A=await nextProposal();
      await h.request(`/assignments/${A.a.id}/students/${user.id}/mode`,{override:{allowed:['blocks'],start:'blocks',switching:'locked'},reason:'Пусть закрепит блоки'},admin,200,'PUT');
      // Dismissing works whatever the settings are now (it used to answer 409 and stay active).
      const dismissed=await h.request(`/recommendations/${A.rec.id}/dismiss`,{},admin);assert.equal(dismissed.ok,true);
      assert.equal(row(A.rec.id).status,'withdrawn');assert.match(row(A.rec.id).reason,/закрепил/);
      assert.equal(events(A.rec.id),1,'one history event');
      const again=await h.request(`/recommendations/${A.rec.id}/dismiss`,{},admin);assert.equal(again.ok,true);assert.equal(events(A.rec.id),1,'a repeat adds nothing');
      const approve=await h.request(`/recommendations/${A.rec.id}/approve`,{},admin,409);assert.equal(approve.code,'recommendation_closed');assert.match(approve.error,/вручную/);
      const B=await nextProposal();assert.notEqual(B.rec.id,A.rec.id,'the next proposal appears');
      await h.request(`/recommendations/${B.rec.id}/dismiss`,{},admin);assert.equal(row(B.rec.id).status,'dismissed');
    });
    await t.test('forbidding the target mode closes the proposal with that reason',async()=>{
      const C=await nextProposal();
      await h.request(`/assignments/${C.a.id}/mode-policy`,{allowed:['blocks','python'],start:'blocks',switching:'teacher',reason:'Без смешанного'},admin,200,'PUT');
      await recs();assert.equal(row(C.rec.id).status,'withdrawn');assert.match(row(C.rec.id).reason,/не разрешён/);
    });
    await t.test('closing the assignment and finishing the task close the proposal',async()=>{
      const D=await nextProposal();
      await h.request(`/assignments/${D.a.id}`,{},admin,200,'DELETE');await recs();
      assert.equal(row(D.rec.id).status,'withdrawn');assert.match(row(D.rec.id).reason,/закрыто/);
      const E=await nextProposal();assert.equal(await solve(E.tk,E.a),'passed');await recs();
      assert.equal(row(E.rec.id).status,'withdrawn');assert.match(row(E.rec.id).reason,/выполнено/);
    });
    await t.test('approve repeated after a lost response: same result, one event; the learner still decides',async()=>{
      const F=await nextProposal();
      assert.equal((await h.request(`/recommendations/${F.rec.id}/approve`,{},admin)).status,'offered');
      assert.equal((await h.request(`/recommendations/${F.rec.id}/approve`,{},admin)).status,'offered');
      assert.equal(events(F.rec.id,'approve'),1);
      const learner=(await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===F.a.id);
      assert.equal(learner.modes.current,'blocks','no automatic switch');assert.equal(learner.modes.offered,'mixed');
      // Withdrawing the offer clears only the offer made by this recommendation.
      await h.request(`/recommendations/${F.rec.id}/dismiss`,{},admin);assert.equal(row(F.rec.id).status,'withdrawn');
      assert.equal((await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===F.a.id).modes.offered??null,null);
    });
    await t.test('a teacher’s own manual permission is independent of a withdrawn recommendation',async()=>{
      const G=await nextProposal();await h.request(`/recommendations/${G.rec.id}/approve`,{},admin);
      await h.request(`/assignments/${G.a.id}/students/${user.id}/mode`,{offer:'mixed',reason:'Решение преподавателя'},admin,200,'PUT');
      // The teacher's own offer replaces the sent recommendation; a later withdrawal changes nothing.
      assert.equal(row(G.rec.id).status,'replaced');assert.equal((await h.request(`/recommendations/${G.rec.id}/dismiss`,{},admin)).status,'replaced');
      assert.equal((await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===G.a.id).modes.offered,'mixed','the manual offer stays');
    });
    await t.test('expiry closes the proposal and frees the next one',async()=>{
      const H=await nextProposal();h.db.prepare("UPDATE recommendations SET expires_at='2000-01-01' WHERE id=?").run(H.rec.id);
      await recs();assert.equal(row(H.rec.id).status,'expired');assert.match(row(H.rec.id).reason,/Срок/);
      await nextProposal();
    });
  }finally{await h.close()}
});
