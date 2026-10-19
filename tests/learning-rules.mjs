import test from 'node:test';
import assert from 'node:assert/strict';
import {grade,execute} from '../server/b2b/grader.mjs';
import {harness} from './helpers/b2b-harness.mjs';

test('learning checks use observed execution, rejecting comments, unused functions and dead loops',async()=>{
  const task={check_mode:'tests',tests:JSON.stringify([{inputs:['5'],expected:'25',hidden:false},{inputs:['-3'],expected:'9',hidden:true}]),learning_rules:JSON.stringify(['kind:function','kind:return'])};
  const plain='x = int(input())\nprint(x * x)';
  assert.equal((await grade({...task,learning_rules:'[]'},plain)).status,'passed');
  for(const code of [plain,'# def square(n): return n * n\n'+plain,'def unused(n):\n    return n * n\n'+plain,'def unused():\n    print(25)\nx = int(input())\nunused()\nprint(x * x)']){
    const result=await grade(task,code);assert.equal(result.status,'failed');assert.match(result.message,/функци|return/);
  }
  assert.equal((await grade(task,'def square(n):\n    return n * n\nx = int(input())\nprint(square(x))')).status,'passed');
  const loop={check_mode:'output',tests:JSON.stringify([{inputs:[],expected:'3',hidden:false}]),learning_rules:JSON.stringify(['kind:for'])};
  assert.equal((await grade(loop,'for i in range(3):\n    unused = i\nprint(3)')).status,'failed');
  assert.equal((await grade(loop,'total = 0\nfor i in range(3):\n    total = total + 1\nprint(total)')).status,'passed');
  assert.equal((await grade(loop,'for i in range(0):\n    print(3)\nprint(3)')).status,'failed');
  assert.equal((await grade(loop,'print(1 / 0)')).status,'runtime_error');
  assert.deepEqual((await execute('print(3)')).output,['3'],'trial run does not grade pedagogy');
});

test('variables, input, condition, while and nested repetition must reach an observable result',async()=>{
  const examples=[
    ['assign:1',[], '3','value = 3\nprint(value)','value = 3\nprint(3)'],
    ['input:1',['3'],'3','value = input()\nprint(value)','unused = input()\nprint(3)'],
    ['kind:if',['3'],'yes','value = int(input())\nif value > 0:\n    print("yes")','if False:\n    print("yes")\nprint("yes")'],
    ['kind:while',[],'3','value = 0\nwhile value < 3:\n    value = value + 1\nprint(value)','while False:\n    print(3)\nprint(3)'],
    ['nested_loop',[],'4','total = 0\nfor i in range(2):\n    for j in range(2):\n        total = total + 1\nprint(total)','total = 0\nfor i in range(4):\n    total = total + 1\nprint(total)'],
  ];
  for(const [rule,inputs,expected,correct,bypass] of examples){
    const task={check_mode:'output',tests:JSON.stringify([{inputs,expected,hidden:false}]),learning_rules:JSON.stringify([rule])};
    assert.equal((await grade(task,correct)).status,'passed',rule);
    assert.equal((await grade({...task,learning_rules:'[]'},bypass)).status,'passed',`same observable output: ${rule}`);
    assert.equal((await grade(task,bypass)).status,'failed',rule);
  }
  const hidden={check_mode:'tests',tests:JSON.stringify([{inputs:['private-input'],expected:'private-output',hidden:true}]),learning_rules:JSON.stringify(['input:1'])};
  const result=await grade(hidden,'print("private-output")');assert.equal(result.status,'failed');assert.ok(!JSON.stringify(result).includes('private-'));
});

test('published learning rules remain pinned, private tests stay private and copies need new approval',async()=>{
  const h=await harness({verifyPublications:false});
  try{
    const {admin}=await h.school('learning-rules'),other=await h.school('learning-rules-other'),{lesson}=await h.content(admin);
    const template=(await h.request('/task-templates',undefined,admin)).items.find(t=>t.id==='function');
    const task=await h.task(admin,lesson,template.task);
    const current=async()=> (await h.request('/state',undefined,admin)).tasks.find(t=>t.id===task.id);
    const proof=await h.request(`/tasks/${task.id}/verify`,{revision:1},admin);assert.equal(proof.status,'approved');
    await h.request(`/tasks/${task.id}/publish`,{published:true,revision:1},admin);
    const student={},user=await h.request('/users',{name:'Learner',login:'rules-student',password:h.password,role:'student'},admin),group=await h.request('/groups',{title:'Class'},admin);
    await h.request(`/groups/${group.id}/members`,{user_id:user.id},admin);
    const assignment=await h.request('/assignments',{group_id:group.id,task_id:task.id},admin);
    await h.request('/auth/login',{login:'rules-student',password:h.password},student);
    const visible=(await h.request('/state',undefined,student)).tasks.find(t=>t.id===task.id);
    assert.deepEqual(visible.learning_rules,['kind:function','kind:return']);
    assert.equal(visible.tests,undefined);assert.equal(visible.reference_solution,undefined);
    const plain='x = int(input())\nprint(x * x)';
    const preview=await h.request('/preview',{task:await current(),code:plain},admin);assert.equal(preview.status,'failed');
    async function submit(code){let job=await h.request(`/tasks/${task.id}/submissions`,{assignment_id:assignment.id,code,request_key:crypto.randomUUID()},student);for(let n=0;n<200&&job.status!=='completed';n++){await new Promise(r=>setTimeout(r,20));job=await h.request(`/submissions/${job.id}`,undefined,student)}assert.equal(job.status,'completed');return job.result}
    assert.equal((await submit(plain)).status,'failed');
    assert.equal((await submit(template.task.reference_solution)).status,'passed');
    // A historical published snapshot keeps its original checker evidence.
    // Rechecking the working draft must not pretend to replace that evidence.
    h.db.prepare('UPDATE task_verifications SET runtime_hash=? WHERE id=?').run('historical-runtime',proof.id);
    assert.equal((await h.request(`/tasks/${task.id}/verify`,{revision:1},admin)).status,'approved');
    const stale=await h.request(`/tasks/${task.id}/publish`,{published:true,revision:1},admin,409);assert.match(stale.error,/новую ревизию/);
    await h.request(`/tasks/${task.id}`,{...await current(),starter:'# Проверено новым исполнителем\n'},admin,200,'PUT');
    assert.equal((await h.request(`/tasks/${task.id}/verify`,{revision:2},admin)).status,'approved');
    const republished=await h.request(`/tasks/${task.id}/publish`,{published:true,revision:2},admin);assert.notEqual(republished.version_id,assignment.version_id);
    const repeated=await h.request('/assignments',{group_id:group.id,task_id:task.id,repeat_of:assignment.id},admin);assert.equal(repeated.version_id,republished.version_id);
    const copy=await h.request(`/tasks/${task.id}/copy`,{},admin);assert.deepEqual((await h.request('/state',undefined,admin)).tasks.find(t=>t.id===copy.id).learning_rules,template.task.learning_rules);
    await h.request(`/tasks/${copy.id}/publish`,{published:true},admin,409);
    await h.request(`/tasks/${task.id}`,{...await current(),learning_rules:['kind:while']},other.admin,404,'PUT');
    for(const rules of [['kind:fake'],['kind:for','kind:for'],'kind:for'])await h.request(`/tasks/${task.id}`,{...await current(),learning_rules:rules},admin,400,'PUT');
    await h.request(`/tasks/${task.id}`,{...await current(),learning_rules:[]},admin,200,'PUT');assert.equal((await current()).verification,null);
    await h.request(`/tasks/${task.id}/publish`,{published:true},admin,409);
    assert.equal((await submit(plain)).status,'failed','assigned version retains its learning rules after draft edits');
    await h.restart();assert.equal((await submit(plain)).status,'failed');
    const replay=await h.request(`/tasks/${task.id}/verify`,{revision:1,verification_id:proof.id},admin);assert.equal(replay.status,'approved');assert.equal(replay.publication_eligible,false);
  }finally{await h.close()}
});
