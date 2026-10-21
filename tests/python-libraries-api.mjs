import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness} from './helpers/b2b-harness.mjs';
import {taskTemplates} from '../server/b2b/task-templates.mjs';
import {libraryLessons} from '../server/b2b/library-course.mjs';
import {execute} from '../server/b2b/grader.mjs';
// Full path through the real API for library tasks: template → quality check (reference passes, wrong
// examples fail, start does not pass) → publish → assign → learner run with a scene → graded submissions.
const template=id=>taskTemplates.find(t=>t.id===id).task;
async function setup(h,tag){
  const {admin}=await h.school(tag),{lesson}=await h.content(admin);
  const group=await h.request('/groups',{title:'7Б'},admin),kid=await h.request('/users',{name:'Ученик',login:`${tag}-kid`,password:h.password,role:'student'},admin);
  await h.request(`/groups/${group.id}/members`,{user_id:kid.id},admin);
  const child={};await h.request('/auth/login',{login:`${tag}-kid`,password:h.password},child);
  const publish=async(id)=>{
    const body={...template(id),lesson_id:lesson.id,learning_config:{modes:[]}};
    const task=await h.request('/tasks',body,admin),revision=(await h.request('/state',undefined,admin)).tasks.find(t=>t.id===task.id).revision;
    const proof=await h.request(`/tasks/${task.id}/verify`,{revision},admin);
    assert.equal(proof.status,'approved',`${id}: ${JSON.stringify(proof).slice(0,600)}`);
    await h.request(`/tasks/${task.id}/publish`,{published:true,revision},admin);
    const assignment=await h.request('/assignments',{group_id:group.id,task_id:task.id},admin);
    return {task,assignment,proof};
  };
  const submit=async({task,assignment},code)=>{let job=await h.request(`/tasks/${task.id}/submissions`,{assignment_id:assignment.id,code,request_key:randomUUID()},child);for(let i=0;i<400&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,child)}return job.result};
  const run=({task,assignment},code,inputs=[])=>h.request(`/tasks/${task.id}/run`,{assignment_id:assignment.id,code,inputs},child);
  return {admin,lesson,child,publish,submit,run};
}

test('turtle, Robot and plot tasks are checked by their scene end to end',async()=>{
  const h=await harness({verifyPublications:false});try{
    const s=await setup(h,'libs');
    // ---- turtle: drawing compared with the reference ----
    const turtle=await s.publish('turtle-square');
    assert.equal(turtle.proof.wrong.every(r=>r.status==='failed'),true,'wrong drawings are rejected by the quality check');
    const ran=await s.run(turtle,'import turtle\nt = turtle.Turtle()\nfor i in range(4):\n    t.forward(100)\n    t.left(90)');
    assert.equal(ran.scene.turtle.items.filter(i=>i.kind==='line').length,4,'a run returns the turtle scene');
    assert.ok(ran.scene.duration>0,'with an animation timeline');
    const good=await s.submit(turtle,'import turtle\nt = turtle.Turtle()\nt.left(90)\nfor i in range(4):\n    t.forward(100)\n    t.right(90)');
    assert.equal(good.status,'passed',JSON.stringify(good).slice(0,300));
    assert.ok(good.scene?.turtle,'the graded result keeps the learner picture for the journal');
    const bad=await s.submit(turtle,'import turtle\nt = turtle.Turtle()\nfor i in range(4):\n    t.forward(60)\n    t.left(90)');
    assert.equal(bad.status,'failed');assert.match(bad.message,/Рисунок отличается/);
    assert.ok(bad.cases[0].expected_scene?.turtle,'an open test shows the picture to aim for');
    assert.equal(bad.cases[0].text_checked,false,'text was not compared in a drawing test');
    assert.equal((await s.submit(turtle,'import turtle\nt = turtle.Turtle()\nt.forward(100)\nt.left(90)\nt.forward(100)\nt.left(90)\nt.forward(100)\nt.left(90)\nt.forward(100)')).status,'failed','without a loop the learning rule kind:for is not met');
    // ---- Robot: field from the task, solved field required ----
    const robot=await s.publish('robot-fill');
    const kidView=(await h.request('/state',undefined,s.child)).tasks.find(t=>t.assignment_id===robot.assignment.id);
    assert.equal(kidView.examples.length,1,'only the open test is visible');
    assert.match(kidView.examples[0].world,/R \. \. \. \. \*/,'the learner sees the field');
    assert.deepEqual(kidView.examples[0].checks,['robot']);
    assert.equal(kidView.reference_solution,undefined,'no reference for the learner');
    const walk=await s.run(robot,'from pyrob.api import *\nmove_right(2)');
    assert.deepEqual([walk.scene.robot.cols,walk.scene.robot.final.c],[6,2],'a trial run uses the field of the open test');
    assert.equal((await s.submit(robot,'from pyrob.api import *\nwhile not wall_is_on_the_right():\n    move_right()\nfill_cell()')).status,'passed');
    const fixed=await s.submit(robot,'from pyrob.api import *\nwhile not wall_is_on_the_right():\n    move_right()\nmove_left()\nmove_right()\nfill_cell()');
    assert.equal(fixed.status,'passed','another correct path passes');
    const crash=await s.submit(robot,'from pyrob.api import *\nwhile True:\n    move_right()');
    assert.equal(crash.status,'runtime_error');assert.match(crash.message,/врезался в стену справа/);
    assert.ok(crash.scene?.robot?.final.crashed,'the crash is visible on the returned field');
    const unfilled=await s.submit(robot,'from pyrob.api import *\nwhile not wall_is_on_the_right():\n    move_right()');
    assert.equal(unfilled.status,'failed');assert.match(unfilled.message,/Не закрашено/);
    const hidden=await s.submit(robot,'from pyrob.api import *\ni = 0\nwhile i < 5:\n    move_right()\n    i += 1\nfill_cell()');
    assert.equal(hidden.status,'runtime_error');assert.equal(hidden.message,'Ошибка выполнения на скрытом тесте.','a hidden field gives no details');
    // ---- plot: data, title and grid compared with the reference ----
    const plot=await s.publish('plot-parabola');
    const shown=await s.run(plot,'import numpy as np\nimport matplotlib.pyplot as plt\nx = np.arange(-5, 6)\nplt.plot(x, x ** 2)\nplt.show()');
    assert.equal(shown.scene.plots[0].figure.series[0].y[0],25,'a run returns the figure');
    assert.equal((await s.submit(plot,'import matplotlib.pyplot as plt\nxs = []\nys = []\nfor x in range(-5, 6):\n    xs.append(x)\n    ys.append(x * x)\nplt.plot(xs, ys)\nplt.title("Парабола")\nplt.grid(True)\nplt.show()')).status,'passed','lists built in a loop give the same plot');
    const untitled=await s.submit(plot,'import numpy as np\nimport matplotlib.pyplot as plt\nx = np.arange(-5, 6)\nplt.plot(x, x ** 2)\nplt.grid(True)\nplt.show()');
    assert.equal(untitled.status,'failed');assert.match(untitled.message,/заголовок должен быть «Парабола»/);
    // ---- math and random: printed text, as before ----
    const math=await s.publish('math-hypotenuse');
    assert.equal((await s.submit(math,'import math\na = float(input())\nb = float(input())\nprint(round(math.hypot(a, b), 2))')).status,'passed','math.hypot is accepted as well');
    assert.equal((await s.submit(math,'from math import sqrt\na = float(input())\nb = float(input())\nprint(round(sqrt(a * a + b * b)))')).status,'failed');
    const dice=await s.publish('random-dice');
    assert.equal((await s.submit(dice,'from random import randint, seed\nseed(7)\nfor i in range(3):\n    print(randint(1, 6))')).status,'passed','seeded random equals CPython');
    assert.equal((await s.submit(dice,'import random\nrandom.seed(8)\nfor i in range(3):\n    print(random.randint(1, 6))')).status,'failed','another seed gives other numbers');
    // ---- teacher preview: field and reference of the draft ----
    const draft={...template('robot-fill'),lesson_id:s.lesson.id};
    const preview=await h.request('/preview/run',{mode:'python',code:'from pyrob.api import *\nmove_right()',inputs:[],learning_config:{modes:[]},world:draft.tests[0].world},s.admin);
    assert.equal(preview.scene.robot.final.c,1,'preview run uses the given field');
    const previewCheck=await h.request('/preview',{task:draft,mode:'python',code:template('robot-fill').reference_solution},s.admin);
    assert.equal(previewCheck.status,'passed','preview check grades with the scene');
    const drawingPreview=await h.request('/preview',{task:{...template('turtle-square'),lesson_id:s.lesson.id},mode:'python',code:'import turtle\nturtle.forward(100)'},s.admin);
    assert.equal(drawingPreview.status,'failed','preview check compares with the reference of the draft');
  }finally{await h.close()}
});

test('the ready course «Python с библиотеками» installs with verified practice and runnable lesson examples',async()=>{
  const h=await harness({verifyPublications:false});try{
    const {admin}=await h.school('libs-course');
    const course=await h.request('/library-course/install',{},admin);
    assert.equal(course.ready,true);assert.equal(course.lessons,libraryLessons.length);
    const state=await h.request('/state',undefined,admin),mine=state.courses.find(c=>c.id===course.id);
    assert.equal(mine.import_template,'libraries/v1');
    const lessons=state.lessons.filter(l=>state.modules.some(m=>m.id===l.module_id&&m.course_id===course.id));
    assert.equal(lessons.length,5);
    const tasks=state.tasks.filter(t=>lessons.some(l=>l.id===t.lesson_id));
    assert.equal(tasks.length,10);assert.ok(tasks.every(t=>t.published),'every practice passed the quality gate and is published');
    for(const lesson of lessons){const steps=typeof lesson.steps==='string'?JSON.parse(lesson.steps):lesson.steps,code=steps.find(s=>s.type==='code').code,r=await execute(code,[]);assert.ok(!r.error,`${lesson.title}: ${r.error}`);if(/turtle|pyrob|matplotlib/.test(code))assert.ok(r.scene,`${lesson.title} example shows a scene`)}
    assert.deepEqual(await h.request('/library-course/install',{},admin),{id:course.id,lessons:5,ready:true},'installing again returns the same course');
    // The first starter course can still be added next to it.
    assert.equal(state.courses.filter(c=>c.import_template==='starter/v1').length,0);
  }finally{await h.close()}
});

test('test settings for scenes are validated and old tests stay unchanged',async()=>{
  const h=await harness({verifyPublications:false});try{
    const {admin}=await h.school('libs-validate'),{lesson}=await h.content(admin);
    const base={...template('robot-fill'),lesson_id:lesson.id};
    const refuse=async(tests,pattern)=>{const e=await h.request('/tasks',{...base,tests},admin,400).catch(error=>error);assert.match(JSON.stringify(e),pattern)};
    await refuse([{inputs:[],expected:'',hidden:false,checks:['robot'],world:'R R'}],/Поле Робота в тесте/);
    await refuse([{inputs:[],expected:'',hidden:false,checks:['sound']}],/Что проверять/);
    await refuse([{inputs:[],expected:'',hidden:false,checks:['robot']}],/добавьте в тест поле/);
    await refuse([{inputs:[],expected:'',hidden:false,checks:[]}],/Что проверять/);
    await refuse([{inputs:[],expected:'',hidden:false,world:'x'.repeat(2001)}],/до 2000 символов/);
    // A test without the new fields is stored exactly as before (same fingerprint of old tasks).
    const plain=await h.request('/tasks',{...base,learning_rules:[],tests:[{inputs:['2'],expected:'4',hidden:false}]},admin);
    const stored=(await h.request('/state',undefined,admin)).tasks.find(t=>t.id===plain.id).tests;
    assert.deepEqual(stored,[{inputs:['2'],expected:'4',hidden:false}]);
  }finally{await h.close()}
});
