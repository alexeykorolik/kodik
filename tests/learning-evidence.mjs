import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness} from './helpers/b2b-harness.mjs';

const printWs=(n,x=10,y=10,id='p')=>({blocks:{languageVersion:0,blocks:[{type:'text_print',id,x,y,inputs:{TEXT:{block:{type:'math_number',id:id+'n',fields:{NUM:n}}}}}]}});

test('learning conclusions and recommendations use eligible, fresh, on-topic evidence with teacher approval',async(t)=>{
  const h=await harness();try{
    const {admin}=await h.school('evidence'),other=await h.school('evidence-other'),content=await h.content(admin),group=await h.request('/groups',{title:'Навыки'},admin);
    const user=await h.request('/users',{name:'Ученик',login:'evidence-child',password:h.password,role:'student'},admin),child={};await h.request(`/groups/${group.id}/members`,{user_id:user.id},admin);await h.request('/auth/login',{login:'evidence-child',password:h.password},child);
    async function task(instruction,n=42,skills=['output']){const workspace=printWs(n);const t=await h.task(admin,content.lesson,{title:instruction,instruction,tests:[{inputs:[],expected:String(n),hidden:false}],reference_solution:`print(${n})`,learning_config:{modes:['blocks','mixed'],palette:['text_print','math_number'],skills},block_solution:workspace});await h.request(`/tasks/${t.id}/publish`,{published:true},admin);return {...t,workspace}}
    async function assign(tk,repeat_of){return h.request('/assignments',{group_id:group.id,task_id:tk.id,mode_policy:{allowed:['blocks','mixed','python'],start:'blocks',switching:'teacher'},...(repeat_of?{repeat_of}:{})},admin)}
    async function submit(tk,a,mode='blocks',program){
      if(mode!=='blocks'){const s=(await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===a.id);if(s.modes.current!==mode){await h.request(`/assignments/${a.id}/students/${user.id}/mode`,{offer:mode,reason:'Проверка перехода'},admin,200,'PUT');await h.request(`/assignments/${a.id}/mode`,{mode},child)}}
      program=program??(mode==='python'?{mode,code:'print(99)'}:{mode,workspace:tk.workspace});let job=await h.request(`/tasks/${tk.id}/submissions`,{...program,assignment_id:a.id,request_key:randomUUID()},child);for(let i=0;i<100&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,child)}return job.result.status;
    }
    const proposed=async()=>(await h.request('/recommendations',undefined,admin)).items.filter(r=>r.status==='proposed');
    const check=async(a)=>h.request(`/assignments/${a.id}/students/${user.id}/recommendation-check`,undefined,admin);
    const failing=c=>c.checks.filter(x=>!x.ok).map(x=>x.rule);

    // Evidence: two output tasks solved in blocks (plus a repeat and a copy of the first).
    const first=await task('Выведи ответ первой задачи'),a=await assign(first);assert.equal(await submit(first,a),'passed');
    const repeat=await assign(first,a.id);assert.equal(await submit(first,repeat),'passed');
    const copy=await task('Выведи ответ первой задачи'),copyAssignment=await assign(copy);assert.equal(await submit(copy,copyAssignment),'passed');
    const current=await task('Выведи число текущей задачи',7),cur=await assign(current);

    await t.test('repeats and copies of one family count once; finished assignments are not targets',async()=>{
      assert.equal((await proposed()).length,0);
      const c=await check(cur);assert.deepEqual(failing(c),['fresh_successes']);assert.match(c.checks.find(x=>x.rule==='fresh_successes').detail,/1 из 2/);
      assert.ok(failing(await check(a)).includes('not_finished'),'a finished assignment is never a target');
    });

    const second=await task('Выведи число для другой истории',43),b=await assign(second);assert.equal(await submit(second,b),'passed');

    await t.test('unrelated topic gives no proposal',async()=>{
      const loops=await task('Задача на циклы',5,['loops']),la=await assign(loops);
      assert.ok(failing(await check(la)).includes('fresh_successes'),'output successes are not evidence for loops');
      await h.request(`/assignments/${la.id}`,{},admin,200,'DELETE');
    });

    await t.test('current difficulty makes a proposal untimely; service errors do not count',async()=>{
      const wrong={mode:'blocks',workspace:printWs(1)};
      assert.equal(await submit(current,cur,'blocks',wrong),'failed');assert.equal(await submit(current,cur,'blocks',wrong),'failed');
      assert.deepEqual(failing(await check(cur)),['no_current_difficulty']);assert.equal((await proposed()).length,0);
      h.db.prepare("UPDATE attempts SET status='checker_error' WHERE assignment_id=? AND user_id=?").run(cur.id,user.id);
      assert.deepEqual(failing(await check(cur)),[],'checker errors are not the learner’s failures');
    });

    await t.test('old successes are not fresh',async()=>{
      h.db.prepare("UPDATE attempts SET created_at='2026-01-01T00:00:00.000Z' WHERE user_id=? AND status='passed'").run(user.id);
      assert.deepEqual(failing(await check(cur)),['fresh_successes']);assert.equal((await proposed()).length,0);
      h.db.prepare("UPDATE attempts SET created_at=? WHERE user_id=? AND status='passed'").run(new Date().toISOString(),user.id);
    });

    await t.test('closed context gives no proposal',async()=>{
      h.db.prepare('UPDATE assignments SET archived=1 WHERE id=?').run(cur.id);
      assert.ok(failing(await check(cur)).includes('context'));assert.equal((await proposed()).length,0);
      h.db.prepare('UPDATE assignments SET archived=0 WHERE id=?').run(cur.id);
    });

    let rec;
    await t.test('fresh on-topic successes: proposal with visible basis, teacher approval, learner consent',async()=>{
      const items=await proposed();assert.equal(items.length,1);rec=items[0];
      assert.equal(rec.assignment_id,cur.id);assert.equal(rec.target_mode,'mixed');assert.equal(rec.rule_version,'pilot-transition/2');assert.equal(new Set(rec.basis.families).size,2);assert.ok(rec.basis.checks.every(c=>c.ok));
      await h.request(`/recommendations/${rec.id}/approve`,{},other.admin,404);
      await h.request(`/recommendations/${rec.id}/approve`,{},admin);await h.request(`/recommendations/${rec.id}/approve`,{},admin);
      const offered=(await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===rec.assignment_id);assert.equal(offered.modes.current,'blocks');assert.equal(offered.modes.offered,'mixed');
      await h.request(`/assignments/${rec.assignment_id}/mode`,{mode:'mixed'},child);
      assert.equal((await h.request('/recommendations',undefined,child)).items.find(r=>r.id===rec.id).status,'accepted');
      assert.equal(h.db.prepare('SELECT COUNT(*) n FROM recommendation_events WHERE recommendation_id=?').get(rec.id).n,2);
      await h.request(`/assignments/${cur.id}/students/${user.id}/recommendation-check`,undefined,other.admin,404);
    });

    await t.test('transfer to another exercise in Python is a separate conclusion',async()=>{
      const third=await task('Выведи результат самостоятельной задачи',99),c=await assign(third);assert.equal(await submit(third,c,'python'),'passed');
      const evidence=await h.request(`/students/${user.id}/evidence`,undefined,admin);
      assert.ok(evidence.labels.includes('Решил другое задание в Python'));assert.equal(evidence.items.filter(i=>i.mode==='blocks'&&i.eligible).length,2);assert.equal(evidence.transfer_attempts.length,1);assert.ok(evidence.limitations.includes('Внешняя помощь не измерена'));
      await h.request(`/students/${user.id}/evidence`,undefined,other.admin,404);
    });

    await t.test('untouched start, re-arranged blocks and comment-only edits are passed checks but not evidence',async()=>{
      const before=(await h.request(`/students/${user.id}/evidence`,undefined,admin)).items.filter(i=>i.eligible).length;
      const version=h.db.prepare('SELECT snapshot,org_id FROM task_versions WHERE task_id=?').get(second.id),snap=JSON.parse(version.snapshot);
      const historical=(id,mode,code,patch)=>h.db.prepare("INSERT INTO attempts(id,org_id,user_id,task_id,code,status,result,snapshot,created_at,assignment_id,version_id,context_origin,mode) VALUES(?,?,?,?,?,'passed','{}',?,?,?,?,'assignment',?)").run(id,version.org_id,user.id,second.id,code,JSON.stringify({...snap,...patch,id:second.id,title:'Историческая задача '+id}),new Date().toISOString(),b.id,h.db.prepare('SELECT version_id FROM assignments WHERE id=?').get(b.id).version_id,mode);
      // Historical results from before the publication fix: kept and readable, explained, not counted.
      historical('hist-python','python','# мой вариант\nprint(43)   # готово',{starter:'print(43)',instruction:'Новая формулировка A'});
      historical('hist-blocks','blocks','print(43)\n',{learning_config:JSON.stringify({version:1,modes:['blocks'],palette:['text_print','math_number'],starter_blocks:printWs(43,300,200,'moved'),skills:['output']}),instruction:'Новая формулировка B'});
      // Audit P2: spacing alone is not a change (print( 43 ), print (43), other indentation).
      historical('hist-spaces','python','print( 43 )',{starter:'print(43)',instruction:'Новая формулировка C'});
      historical('hist-space-call','python','print (43)\n',{starter:'print(43)',instruction:'Новая формулировка D'});
      const evidence=await h.request(`/students/${user.id}/evidence`,undefined,admin);
      for(const id of ['hist-python','hist-blocks','hist-spaces','hist-space-call']){const item=evidence.items.find(i=>i.attempt_id===id);assert.ok(item,`${id} stays visible`);assert.equal(item.eligible,false);assert.match(item.reason,/заготовка без содержательных изменений/)}
      assert.equal(evidence.items.filter(i=>i.eligible).length,before,'they add no basis');
      const reviewed=await h.request('/attempts/hist-python',undefined,admin);assert.equal(reviewed.status,'passed','the passed check itself is not rewritten');
    });

    await t.test('expired offer cannot be accepted',async()=>{
      h.db.prepare("UPDATE attempts SET status='failed' WHERE id IN ('hist-python','hist-blocks','hist-spaces','hist-space-call')").run();
      const another=await task('Ещё одна задача на вывод',8),na=await assign(another);void na;
      const next=(await proposed())[0];assert.ok(next,'a fresh unfinished on-topic assignment gets a proposal');await h.request(`/recommendations/${next.id}/approve`,{},admin);
      h.db.prepare("UPDATE recommendations SET expires_at='2000-01-01' WHERE id=?").run(next.id);
      await h.request(`/assignments/${next.assignment_id}/mode`,{mode:next.target_mode},child,409);
      assert.equal(h.db.prepare('SELECT status FROM recommendations WHERE id=?').get(next.id).status,'expired');
    });

    await t.test('approval re-checks today’s grounds: new failures withdraw the proposal; manual transfer stays possible',async()=>{
      const late=await task('Задача, в которой начались ошибки',9),la=await assign(late);
      const stale=(await proposed()).find(r=>r.assignment_id===la.id);assert.ok(stale,'a proposal is made while the grounds hold');
      const wrong={mode:'blocks',workspace:printWs(1)};
      assert.equal(await submit(late,la,'blocks',wrong),'failed');assert.equal(await submit(late,la,'blocks',wrong),'failed');
      assert.deepEqual(failing(await check(la)),['no_current_difficulty']);
      const refused=await h.request(`/recommendations/${stale.id}/approve`,{},admin,409);
      assert.equal(refused.code,'recommendation_stale');assert.match(refused.error,/неуспешны/);assert.match(refused.error,/вручную/);
      assert.equal(h.db.prepare('SELECT status FROM recommendations WHERE id=?').get(stale.id).status,'expired');
      assert.equal(h.db.prepare("SELECT COUNT(*) n FROM recommendation_events WHERE recommendation_id=? AND kind='stale'").get(stale.id).n,1);
      const learner=(await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===la.id);assert.equal(learner.modes.offered??null,null,'nothing is offered to the learner');
      await h.request(`/assignments/${la.id}/students/${user.id}/mode`,{offer:'mixed',reason:'Решение преподавателя'},admin,200,'PUT');
      assert.equal((await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===la.id).modes.offered,'mixed');
    });
  }finally{await h.close()}
});
