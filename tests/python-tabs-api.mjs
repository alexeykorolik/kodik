import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness} from './helpers/b2b-harness.mjs';
// Audit: tabs were expanded to four spaces in the whole program, so a real tab inside a string changed
// its value (len("a<TAB>b") was 6). Full path: create → verify → publish → assign → solve with a real tab.
const TAB=String.fromCharCode(9),BS=String.fromCharCode(92);
test('a correct program with a real tab inside a string is graded «Выполнено»',async()=>{
  const h=await harness({verifyPublications:false});try{
    const {admin}=await h.school('tabs'),{lesson}=await h.content(admin);
    const task=await h.task(admin,lesson,{title:'Длина строки с табуляцией',instruction:'Выведи длину строки из буквы a, символа табуляции и буквы b.',check_mode:'output',starter:'',hints:[],
      tests:[{inputs:[],expected:'3',hidden:false}],reference_solution:`print(len("a${BS}tb"))`,wrong_solutions:['print(len("a    b"))','print(2)']});
    const revision=(await h.request('/state',undefined,admin)).tasks.find(t=>t.id===task.id).revision;
    const proof=await h.request(`/tasks/${task.id}/verify`,{revision},admin);assert.equal(proof.status,'approved',JSON.stringify(proof));
    await h.request(`/tasks/${task.id}/publish`,{published:true,revision},admin);
    const group=await h.request('/groups',{title:'8А'},admin),kid=await h.request('/users',{name:'Ученик',login:'tabs-kid',password:h.password,role:'student'},admin);
    await h.request(`/groups/${group.id}/members`,{user_id:kid.id},admin);
    const assignment=await h.request('/assignments',{group_id:group.id,task_id:task.id},admin);
    const child={};await h.request('/auth/login',{login:'tabs-kid',password:h.password},child);
    const submit=async(code)=>{let job=await h.request(`/tasks/${task.id}/submissions`,{assignment_id:assignment.id,code,request_key:randomUUID()},child);for(let i=0;i<200&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,child)}return job};
    const code=`print(len("a${TAB}b"))`;assert.equal(code.split(TAB).length,2,'the submitted program contains a real tab');
    const run=await h.request(`/tasks/${task.id}/run`,{assignment_id:assignment.id,code,inputs:[]},child);assert.deepEqual(run.output,['3'],'the run shows length 3');
    const job=await submit(code);assert.equal(job.result.status,'passed',JSON.stringify(job.result));
    // Both spellings of the same value are graded the same; four spaces are a different value.
    assert.equal((await submit(`print(len("a${BS}tb"))`)).result.status,'passed');
    assert.equal((await submit('print(len("a    b"))')).result.status,'failed');
    // Tab indentation still works for nesting.
    assert.equal((await submit(`if True:\n${TAB}print(len("a${TAB}b"))`)).result.status,'passed');
  }finally{await h.close()}
});
