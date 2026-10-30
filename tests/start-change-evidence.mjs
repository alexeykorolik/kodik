import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness} from './helpers/b2b-harness.mjs';
// Audit: a learner who fixes a broken start (`1 / / 2` → `1 // 2`) passes the check, but learning
// conclusions treated the result as "the untouched start" because spacing was stripped and the signs glued.
// Full path through the school API: publish → assign → fix → passed → classification of the evidence.
test('fixing a broken start is the learner’s change; cosmetic edits are not; grades are never rewritten',async()=>{
  const h=await harness();try{
    const {admin}=await h.school('start-change'),{lesson}=await h.content(admin);
    const group=await h.request('/groups',{title:'7Б'},admin),kid=await h.request('/users',{name:'Ученик',login:'start-change-kid',password:h.password,role:'student'},admin);
    await h.request(`/groups/${group.id}/members`,{user_id:kid.id},admin);
    const child={};await h.request('/auth/login',{login:'start-change-kid',password:h.password},child);
    const publish=async(fields)=>{const t=await h.task(admin,lesson,{check_mode:'output',hints:[],...fields});await h.request(`/tasks/${t.id}/publish`,{published:true},admin);return {task:t,assignment:await h.request('/assignments',{group_id:group.id,task_id:t.id},admin)}};
    const submit=async(t,a,code)=>{let job=await h.request(`/tasks/${t.id}/submissions`,{assignment_id:a.id,code,request_key:randomUUID()},child);for(let i=0;i<200&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,child)}return job};
    const evidence=async()=> (await h.request(`/students/${kid.id}/evidence`,undefined,admin)).items;

    // 1. A practice whose start has a syntax error is publishable (the start does not solve the task).
    const broken=await publish({title:'Целое деление',instruction:'Исправь ошибку и выведи результат целочисленного деления 1 на 2.',starter:'print(1 / / 2)',tests:[{inputs:[],expected:'0',hidden:false}],reference_solution:'print(1 // 2)',wrong_solutions:['print(1 / 2)']});
    // Sending the broken start back is not a success at all.
    assert.notEqual((await submit(broken.task,broken.assignment,'print(1 / / 2)')).result.status,'passed');
    // The fix passes and is an eligible basis for learning conclusions.
    const fixed=await submit(broken.task,broken.assignment,'print(1 // 2)');assert.equal(fixed.result.status,'passed');
    const item=(await evidence()).find(i=>i.attempt_id===fixed.attempt_id);
    assert.ok(item,'the passed attempt is listed');assert.equal(item.eligible,true,`fixing the syntax error is a change: ${item.reason}`);

    // 2. Separated signs are not glued into another operator in other places either.
    const power=await publish({title:'Степень',instruction:'Исправь ошибку и выведи 2 в кубе.',starter:'print(2 * * 3)',tests:[{inputs:[],expected:'8',hidden:false}],reference_solution:'print(2 ** 3)',wrong_solutions:['print(2 * 3)']});
    const pw=await submit(power.task,power.assignment,'print(2 ** 3)');assert.equal(pw.result.status,'passed');
    assert.equal((await evidence()).find(i=>i.attempt_id===pw.attempt_id).eligible,true);

    // 3. Historical results with only cosmetic edits of a ready start (from before publication was
    // blocked): the passed check stays passed, but it is not a basis — for spacing, comments and quotes.
    const version=h.db.prepare('SELECT * FROM task_versions WHERE task_id=?').get(broken.task.id);
    const text=await publish({title:'Две строки',instruction:'Выведи «a», затем «c» с новой строки.',starter:"print('a\\nb')",tests:[{inputs:[],expected:'a\nc',hidden:false}],reference_solution:'print("a\\nc")',wrong_solutions:['print("a")']});
    const textVersion=h.db.prepare('SELECT * FROM task_versions WHERE task_id=?').get(text.task.id);
    const historical=(id,code,starter,v=version,a=broken.assignment,t=broken.task)=>h.db.prepare("INSERT INTO attempts(id,org_id,user_id,task_id,code,status,result,snapshot,created_at,assignment_id,version_id,context_origin,mode) VALUES(?,?,?,?,?,'passed','{}',?,?,?,?,'assignment','python')").run(id,v.org_id,kid.id,t.id,code,JSON.stringify({...JSON.parse(v.snapshot),starter,title:'Историческая '+id}),new Date().toISOString(),a.id,v.id);
    historical('cosmetic-spaces','print( 1 // 2 )  # готово','print(1 // 2)');
    historical('cosmetic-quotes','print("a\\nb")',"print('a\\nb')");
    // Its own task: the evidence list shows one eligible success per task family.
    historical('changed-value','print("a\\nc")',"print('a\\nb')",textVersion,text.assignment,text.task);
    const items=await evidence();
    for(const id of ['cosmetic-spaces','cosmetic-quotes']){const i=items.find(x=>x.attempt_id===id);assert.equal(i.eligible,false,id);assert.match(i.reason,/заготовка без содержательных изменений/)}
    assert.equal(items.find(x=>x.attempt_id==='changed-value').eligible,true,'a changed string value is a change');
    for(const id of ['cosmetic-spaces','cosmetic-quotes'])assert.equal((await h.request(`/attempts/${id}`,undefined,admin)).status,'passed','the grade is not rewritten');
  }finally{await h.close()}
});
