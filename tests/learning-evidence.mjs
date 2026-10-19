import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
test('recommendations use distinct families, teacher approval, learner consent, expiry and traceable evidence',async()=>{
  const h=await harness();try{
    const {admin}=await h.school('evidence'),other=await h.school('evidence-other'),content=await h.content(admin),group=await h.request('/groups',{title:'Навыки'},admin);
    const user=await h.request('/users',{name:'Ученик',login:'evidence-child',password:h.password,role:'student'},admin),child={};await h.request(`/groups/${group.id}/members`,{user_id:user.id},admin);await h.request('/auth/login',{login:'evidence-child',password:h.password},child);
    async function task(instruction,n=42){const workspace={blocks:{languageVersion:0,blocks:[{type:'text_print',inputs:{TEXT:{block:{type:'math_number',fields:{NUM:n}}}}}]}};const t=await h.task(admin,content.lesson,{title:instruction,instruction,tests:[{inputs:[],expected:String(n),hidden:false}],reference_solution:`print(${n})`,learning_config:{modes:['blocks','mixed'],palette:['text_print','math_number'],skills:['output']},block_solution:workspace});await h.request(`/tasks/${t.id}/publish`,{published:true},admin);return {...t,workspace}}
    async function assign(t,repeat_of){return h.request('/assignments',{group_id:group.id,task_id:t.id,mode_policy:{allowed:['blocks','mixed','python'],start:'blocks',switching:'teacher'},...(repeat_of?{repeat_of}:{})},admin)}
    async function submit(t,a,mode='blocks'){
      if(mode!=='blocks'){await h.request(`/assignments/${a.id}/students/${user.id}/mode`,{offer:mode,reason:'Проверка перехода'},admin,200,'PUT');await h.request(`/assignments/${a.id}/mode`,{mode},child)}
      const program=mode==='python'?{mode,code:'print(99)'}:{mode,workspace:t.workspace};let job=await h.request(`/tasks/${t.id}/submissions`,{...program,assignment_id:a.id,request_key:crypto.randomUUID()},child);for(let i=0;i<100&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,child)}assert.equal(job.result.status,'passed');return job;
    }
    const first=await task('Выведи ответ первой задачи'),a=await assign(first);await submit(first,a);
    const repeat=await assign(first,a.id);await submit(first,repeat);
    const copy=await task('Выведи ответ первой задачи'),copyAssignment=await assign(copy);await submit(copy,copyAssignment);
    assert.equal((await h.request('/recommendations',undefined,admin)).items.length,0,'repeats and copies are not three distinct successes');
    const second=await task('Выведи число для другой истории',43),b=await assign(second);await submit(second,b);
    let items=(await h.request('/recommendations',undefined,admin)).items;assert.equal(items.filter(r=>r.status==='proposed').length,1);
    const rec=items[0];assert.equal(rec.target_mode,'mixed');assert.equal(new Set(rec.basis.families).size,2);
    await h.request(`/recommendations/${rec.id}/approve`,{},other.admin,404);
    await h.request(`/recommendations/${rec.id}/approve`,{},admin);await h.request(`/recommendations/${rec.id}/approve`,{},admin);
    const offered=(await h.request('/state',undefined,child)).tasks.find(t=>t.assignment_id===rec.assignment_id);assert.equal(offered.modes.current,'blocks');assert.equal(offered.modes.offered,'mixed');
    await h.request(`/assignments/${rec.assignment_id}/mode`,{mode:'mixed'},child);
    items=(await h.request('/recommendations',undefined,child)).items;assert.equal(items.find(r=>r.id===rec.id).status,'accepted');
    assert.equal(h.db.prepare('SELECT COUNT(*) n FROM recommendation_events WHERE recommendation_id=?').get(rec.id).n,2);
    const third=await task('Выведи результат самостоятельной задачи',99),c=await assign(third);await submit(third,c,'python');
    const evidence=await h.request(`/students/${user.id}/evidence`,undefined,admin);assert.ok(evidence.labels.includes('Решил другое задание в Python'));assert.equal(evidence.items.filter(i=>i.mode==='blocks').length,2);assert.equal(evidence.transfer_attempts.length,1);assert.ok(evidence.limitations.includes('Внешняя помощь не измерена'));
    await h.request(`/students/${user.id}/evidence`,undefined,other.admin,404);
    const next=(await h.request('/recommendations',undefined,admin)).items.find(r=>r.status==='proposed');assert.ok(next);await h.request(`/recommendations/${next.id}/approve`,{},admin);
    h.db.prepare("UPDATE recommendations SET expires_at='2000-01-01' WHERE id=?").run(next.id);
    await h.request(`/assignments/${next.assignment_id}/mode`,{mode:next.target_mode},child,409);
    assert.equal(h.db.prepare('SELECT status FROM recommendations WHERE id=?').get(next.id).status,'expired');
  }finally{await h.close()}
});
