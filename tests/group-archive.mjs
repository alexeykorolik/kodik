import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness} from './helpers/b2b-harness.mjs';
// Audit of ae54497: an archived group blocked practice, but a learner could still complete theory and
// code-example steps and answer questions, and a teacher could open lessons of the archived group.
test('an archived group stops every new learning action of the lesson and keeps what was done',async(t)=>{
  const h=await harness();try{
    const {admin}=await h.school('archive'),base=await h.content(admin),group=await h.request('/groups',{title:'Архивный класс'},admin);
    const ahead={},behind={};
    async function learner(login,client){const u=await h.request('/users',{name:login,login,password:h.password,role:'student'},admin);await h.request(`/groups/${group.id}/members`,{user_id:u.id},admin);await h.request('/auth/login',{login,password:h.password},client);return u}
    const uAhead=await learner('archive-ahead',ahead),uBehind=await learner('archive-behind',behind);
    const second=await h.request('/lessons',{module_id:base.module.id,title:'Второй урок'},admin);
    for(const [index,l] of [base.lesson,second].entries()){
      const practice=await h.task(admin,l,{title:`Практика ${index}`,check_mode:'output',tests:[{inputs:[],expected:'42',hidden:false}]}),final=await h.task(admin,l,{title:`Итог ${index}`,check_mode:'output',tests:[{inputs:[],expected:'43',hidden:false}]});
      for(const task of [practice,final])await h.request(`/tasks/${task.id}/publish`,{published:true},admin);
      await h.request(`/lesson-content/${l.id}`,{title:`Урок ${index+1}`,goal:'Вывести значение',description:'',duration:40,teacher_notes:'',revision:1,steps:[
        {id:'text',type:'text',title:'Объяснение',body:'print выводит значение.'},
        {id:'code',type:'code',title:'Пример',body:'Одна команда.',code:'print(42)'},
        {id:'practice',type:'practice',title:'Практика',body:'Выведи 42',task_id:practice.id},
        {id:'question',type:'question',title:'Вопрос',body:'Что выведет программа?',choices:['42','43'],correct_index:0,explanation:'Верно.'},
        {id:'final',type:'final',title:'Итоговая работа',body:'Выведи 43',task_id:final.id},
        {id:'summary',type:'summary',title:'Итог',body:'Готово.'}]},admin,200,'PUT');
      await h.request(`/lesson-content/${l.id}/publish`,{revision:2},admin);
    }
    const body={group_id:group.id,scope:'course',source_id:base.course.id,request_key:'archive-program-key'},preview=await h.request('/programs/preview',body,admin);
    const program=await h.request('/programs',{...body,preview_hash:preview.preview_hash},admin);
    const runs=h.db.prepare('SELECT * FROM lesson_runs WHERE run_id=? ORDER BY position').all(program.id),[first,next]=runs;
    const lessonPractice=h.db.prepare("SELECT * FROM assignments WHERE lesson_run_id=? AND step_id='practice'").get(first.id);
    const step=(client,id,payload,expected=200)=>h.request(`/lesson-runs/${first.id}/steps/${id}`,payload,client,expected);
    async function submit(client,taskId,assignmentId,code){let job=await h.request(`/tasks/${taskId}/submissions`,{mode:'python',code,assignment_id:assignmentId,request_key:randomUUID()},client);for(let i=0;i<200&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,client)}return job}
    // The learner ahead reaches the question; the other one only reads the explanation.
    await step(ahead,'text',{acknowledged:true});await step(ahead,'code',{acknowledged:true});
    assert.equal((await submit(ahead,lessonPractice.task_id,lessonPractice.id,'print(42)')).result.status,'passed');
    await step(behind,'text',{acknowledged:true});
    await h.request(`/tasks/${lessonPractice.task_id}/draft`,{assignment_id:lessonPractice.id,mode:'python',code:'print(4',revision:0},ahead,200,'PUT');
    // A separate manual task waiting for review and an automatic one, outside the program.
    const manual=await h.task(admin,base.lesson,{title:'Ручная',check_mode:'manual',tests:[]});await h.request(`/tasks/${manual.id}/publish`,{published:true},admin);
    const manualA=await h.request('/assignments',{group_id:group.id,task_id:manual.id},admin);
    const pending=await submit(ahead,manual.id,manualA.id,'print("моё решение")');assert.equal(pending.result.status,'pending_review');
    const before={progress:h.db.prepare('SELECT * FROM lesson_step_progress ORDER BY user_id,step_id').all(),attempts:h.db.prepare('SELECT id,status,feedback FROM attempts ORDER BY id').all(),drafts:h.db.prepare('SELECT * FROM assignment_drafts ORDER BY user_id').all()};
    const opened=await h.request(`/lesson-runs/${first.id}`,undefined,ahead);assert.notEqual(opened.group_archived,true);

    await h.request(`/groups/${group.id}/archive`,{archived:true},admin);

    await t.test('late learner actions from an open tab are refused: steps, questions, runs, checks, mode',async()=>{
      const refusal=await step(behind,'code',{acknowledged:true},409);assert.match(refusal.error,/архив/i);assert.equal(refusal.code,'group_archived');
      const answer=await step(ahead,'question',{answer:0},409);assert.equal(answer.code,'group_archived');
      await h.request(`/tasks/${lessonPractice.task_id}/run`,{assignment_id:lessonPractice.id,mode:'python',code:'print(42)',inputs:[]},ahead,409);
      const check=await h.request(`/tasks/${manual.id}/submissions`,{mode:'python',code:'print(1)',assignment_id:manualA.id,request_key:randomUUID()},ahead,409);assert.match(check.error,/архив/i);
      await h.request(`/assignments/${manualA.id}/mode`,{mode:'python'},ahead,409);
      assert.equal(h.db.prepare('SELECT COUNT(*) n FROM lesson_step_events').get().n,3,'only the three steps before the archive are recorded');
    });
    await t.test('unsaved work can still be saved as a draft; nothing else changes',async()=>{
      const saved=await h.request(`/tasks/${lessonPractice.task_id}/draft`,{assignment_id:lessonPractice.id,mode:'python',code:'print(42) # дописал',revision:h.db.prepare('SELECT revision FROM assignment_drafts WHERE user_id=?').get(uAhead.id).revision},ahead,200,'PUT');assert.ok(saved.revision);
      assert.deepEqual(h.db.prepare('SELECT * FROM lesson_step_progress ORDER BY user_id,step_id').all(),before.progress);
      assert.deepEqual(h.db.prepare('SELECT id,status,feedback FROM attempts ORDER BY id').all(),before.attempts);
    });
    await t.test('materials, past results and history stay readable and say the group is archived',async()=>{
      const view=await h.request(`/lesson-runs/${first.id}`,undefined,ahead);assert.equal(view.group_archived,true);
      assert.equal(view.progress.find(p=>p.step_id==='practice').status,'completed');assert.equal(view.lesson.steps.length,6);
      const state=await h.request('/state',undefined,ahead);assert.equal(state.tasks.find(x=>x.assignment_id===manualA.id).group_archived,true);
      assert.ok(state.programs[0].group_archived);
      const teacherView=await h.request(`/lesson-runs/${first.id}`,undefined,admin);assert.equal(teacherView.group_archived,true);assert.equal(teacherView.students.length,2);
      assert.ok((await h.request(`/reports?group_id=${group.id}`,undefined,admin)).total>=2,'journal of the archived group');
    });
    await t.test('the teacher cannot open lessons of the archived group; closing is still possible',async()=>{
      const refused=await h.request(`/lesson-runs/${next.id}/state`,{state:'open',revision:next.revision},admin,409);assert.match(refused.error,/архив/i);
      assert.equal(h.db.prepare('SELECT state FROM lesson_runs WHERE id=?').get(next.id).state,'scheduled');
      await h.request(`/lesson-runs/${first.id}/state`,{state:'closed',revision:first.revision},admin);
      await h.request(`/lesson-runs/${first.id}/state`,{state:'open',revision:first.revision+1},admin,409);
      await h.request(`/programs/${program.id}/enroll`,{mode:'from_start',user_ids:[uBehind.id]},admin,409);
    });
    await t.test('manual review of an earlier attempt continues; archiving rewrote no result',async()=>{
            const attempt=h.db.prepare("SELECT id FROM attempts WHERE status='pending_review'").get();assert.ok(attempt,'the waiting attempt is still waiting');
      await h.request(`/attempts/${attempt.id}/review`,{status:'passed',feedback:'Хорошо',revision:0},admin);
    });
    await t.test('restoring the group keeps identities, drafts and progress and resumes from the current state',async()=>{
      await h.request(`/groups/${group.id}/archive`,{archived:false},admin);
      const view=await h.request(`/lesson-runs/${first.id}`,undefined,ahead);assert.equal(view.group_archived,false);assert.equal(view.state,'closed','the lesson stays as the teacher left it');
      await step(ahead,'question',{answer:0},409);
      await h.request(`/lesson-runs/${first.id}/state`,{state:'open',revision:first.revision+1},admin);
      assert.equal((await step(ahead,'question',{answer:0})).status,'completed');
      assert.equal((await step(behind,'code',{acknowledged:true})).status,'completed');
      assert.equal(h.db.prepare('SELECT id FROM lesson_runs WHERE id=?').get(first.id).id,first.id);
      assert.equal(h.db.prepare('SELECT code FROM assignment_drafts WHERE user_id=?').get(uAhead.id).code,'print(42) # дописал');
      assert.equal(h.db.prepare('SELECT COUNT(*) n FROM run_enrollments WHERE run_id=?').get(program.id).n,2);
    });
  }finally{await h.close()}
});
