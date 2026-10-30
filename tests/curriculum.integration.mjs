import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
import {verifyBackup} from '../scripts/verify-backup.mjs';
import {join} from 'node:path';
test('composed lessons, atomic programs, server progress, private content and controlled late enrollment',async(t)=>{
  const h=await harness();
  try{
    const {admin}=await h.school('curriculum'),other=await h.school('curriculum-other'),base=await h.content(admin);
    const student={},late={},lateCurrent={};
    async function learner(login,client){const u=await h.request('/users',{name:login,login,password:h.password,role:'student'},admin);await h.request('/auth/login',{login,password:h.password},client);return u}
    const u=await learner('curriculum-student',student),group=await h.request('/groups',{title:'Class'},admin);
    await h.request(`/groups/${group.id}/members`,{user_id:u.id},admin);
    const lessons=[base.lesson,await h.request('/lessons',{module_id:base.module.id,title:'Second lesson'},admin)],materials=[];
    for(const [index,l] of lessons.entries()){
      const practice=await h.task(admin,l,{title:`Practice ${index}`,check_mode:'output',tests:[{inputs:[],expected:'42',hidden:false},{inputs:['private-test-input'],expected:'42',hidden:true}]}),final=await h.task(admin,l,{title:`Final ${index}`,check_mode:'output',tests:[{inputs:[],expected:'43',hidden:false}]});
      for(const task of [practice,final])await h.request(`/tasks/${task.id}/publish`,{published:true},admin);
      materials.push({practice,final,content:{title:`Complete lesson ${index+1}`,goal:'Print and understand a value',description:'A complete reviewed lesson',duration:40,teacher_notes:'teacher-only-notes',steps:[
        {id:'text',type:'text',title:'Understand',body:'print displays a value.'},
        {id:'code',type:'code',title:'Read example',body:'One command.',code:'print(42)'},
        {id:'practice',type:'practice',title:'Try',body:'Print 42',task_id:practice.id},
        {id:'question',type:'question',title:'Understand the result',body:'What is printed?',choices:['42','43'],correct_index:0,explanation:'Because the value is 42.'},
        {id:'final',type:'final',title:'Independent work',body:'Print 43',task_id:final.id},
        {id:'summary',type:'summary',title:'Remember',body:'You can print a value.'}
      ]}});
    }
    await t.test('incomplete lesson drafts and conflicting authors retain both versions',async()=>{
      const l=lessons[0];await h.request(`/lesson-content/${l.id}`,{title:'',goal:'',steps:[],revision:1},admin,200,'PUT');
      await h.request(`/lesson-content/${l.id}/publish`,{revision:2},admin,400);
      const conflict=await h.request(`/lesson-content/${l.id}`,{...materials[0].content,revision:1},admin,409,'PUT');
      assert.ok(conflict.conflict_id);assert.equal(conflict.current.revision,2);
      assert.equal(h.db.prepare('SELECT conflict FROM lesson_revisions WHERE id=?').get(conflict.conflict_id).conflict,1);
      await h.request(`/lesson-content/${l.id}`,{...materials[0].content,revision:2},admin,200,'PUT');
      await h.request(`/lesson-content/${l.id}/publish`,{revision:3},admin);
      await h.request(`/lesson-content/${lessons[1].id}`,{...materials[1].content,revision:1},admin,200,'PUT');
      await h.request(`/lesson-content/${lessons[1].id}/publish`,{revision:2},admin);
      await h.request(`/lesson-content/${l.id}`,{...materials[0].content,revision:3},other.admin,404,'PUT');
      await h.request(`/lesson-content/${l.id}/publish`,{revision:3},student,403);
      assert.throws(()=>h.db.prepare('UPDATE lesson_versions SET snapshot=?').run('{}'),/immutable/);
    });
    let preview,program,first,second,practiceAssignment,finalAssignment;
    const body={group_id:group.id,scope:'course',source_id:base.course.id,request_key:'curriculum-atomic-operation'};
    await t.test('preview and rollback prevent a partial or stale program issuance',async()=>{
      preview=await h.request('/programs/preview',body,admin);
      assert.equal(preview.snapshot.lessons.length,2);assert.equal(preview.students,1);
      await h.request('/programs',{...body,preview_hash:'stale'},admin,409);
      const joined=await learner('preview-membership-change',{});
      await h.request(`/groups/${group.id}/members`,{user_id:joined.id},admin);
      await h.request('/programs',{...body,preview_hash:preview.preview_hash},admin,409);
      await h.request(`/groups/${group.id}/members`,{user_id:joined.id},admin,200,'DELETE');
      await h.request(`/lesson-content/${lessons[1].id}`,{...materials[1].content,revision:2},admin,200,'PUT');
      await h.request(`/lesson-content/${lessons[1].id}/publish`,{revision:3},admin);
      await h.request('/programs',{...body,preview_hash:preview.preview_hash},admin,409);
      preview=await h.request('/programs/preview',body,admin);
      h.db.exec("CREATE TRIGGER simulate_program_fault BEFORE INSERT ON assignments WHEN NEW.step_id='final' BEGIN SELECT RAISE(ABORT,'test interruption'); END;");
      await h.request('/programs',{...body,preview_hash:preview.preview_hash},admin,500);
      for(const table of ['teaching_runs','lesson_runs','assignments','run_enrollments'])assert.equal(h.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0,table);
      h.db.exec('DROP TRIGGER simulate_program_fault');
      const [a,b]=await Promise.all([h.request('/programs',{...body,preview_hash:preview.preview_hash},admin),h.request('/programs',{...body,preview_hash:preview.preview_hash},admin)]);
      assert.equal(a.id,b.id);program=a;
      assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM teaching_runs').get().n,1);
      assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,4);
      const data=(await h.request('/state',undefined,admin)).programs[0];[first,second]=data.lessons;
      assert.equal(first.state,'open');assert.equal(second.state,'scheduled');
      const detail=await h.request(`/lesson-runs/${first.id}`,undefined,student);
      practiceAssignment=detail.assignments.find(a=>a.step_id==='practice');finalAssignment=detail.assignments.find(a=>a.step_id==='final');
      for(const privateValue of ['teacher-only-notes','private-test-input','correct_index','teacher_notes','Because the value','reference_solution','wrong_solutions','preview_solution']){assert.ok(!JSON.stringify(detail).includes(privateValue),privateValue);assert.ok(!JSON.stringify(await h.request('/state',undefined,student)).includes(privateValue),privateValue)}
      await h.request(`/lesson-runs/${second.id}`,undefined,student,404);
      await h.request(`/lesson-runs/${first.id}`,undefined,other.admin,404);
      await h.request('/programs',{...body,request_key:'another-key-same-course',preview_hash:preview.preview_hash},admin,409);
    });
    async function complete(step,answer){return h.request(`/lesson-runs/${first.id}/steps/${step}`,answer===undefined?{acknowledged:true}:{answer},student)}
    async function submit(a,code){let job=await h.request(`/tasks/${a.task.id}/submissions`,{assignment_id:a.id,code,request_key:crypto.randomUUID()},student);for(let i=0;i<100&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,30));job=await h.request(`/submissions/${job.id}`,undefined,student)}assert.equal(job.result.status,'passed');return job}
    await t.test('server criteria, private quiz feedback and durable per-student progress',async()=>{
      await h.request(`/lesson-runs/${first.id}/steps/summary`,{acknowledged:true},student,409);
      await h.request(`/tasks/${finalAssignment.task.id}/submissions`,{assignment_id:finalAssignment.id,code:'print(43)',request_key:crypto.randomUUID()},student,404);
      await complete('text');await complete('code');await submit(practiceAssignment,'print(42)');
      const wrong=await complete('question',1);assert.equal(wrong.status,'incorrect');assert.ok(!JSON.stringify(wrong).includes('correct_index'));assert.ok(!wrong.message.includes('42'));
      await h.request(`/lesson-runs/${first.id}/steps/summary`,{acknowledged:true},student,409);
      const correct=await complete('question',0);assert.equal(correct.status,'completed');assert.equal(correct.message,'Верно!');assert.equal(correct.explanation,'Because the value is 42.');
      await submit(finalAssignment,'print(43)');await complete('summary');
      await h.restart();
      const detail=await h.request(`/lesson-runs/${first.id}`,undefined,student);
      assert.equal(detail.progress.filter(p=>p.status==='completed').length,6);
      assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM lesson_step_events WHERE step_id=?').get('question').n,2);
      const teacher=await h.request(`/lesson-runs/${first.id}`,undefined,admin);
      assert.equal(teacher.lesson.teacher_notes,'teacher-only-notes');assert.equal(teacher.students[0].progress.filter(p=>p.status==='completed').length,6);
      assert.ok(teacher.students[0].progress.find(p=>p.step_id==='practice').attempt_id);
    });
    await t.test('late membership is explicit; current lesson policy and closed lessons are enforced',async()=>{
      const added=await learner('late-student',late);await h.request(`/groups/${group.id}/members`,{user_id:added.id},admin);
      assert.equal((await h.request('/state',undefined,late)).programs.length,0);
      assert.equal((await h.request('/state',undefined,late)).tasks.length,0);
      await h.request(`/lesson-runs/${first.id}`,undefined,late,404);
      await h.request(`/programs/${program.id}/enroll`,{user_ids:[added.id],mode:'from_start'},admin);
      await h.request(`/programs/${program.id}/enroll`,{user_ids:[added.id],mode:'from_start'},admin);
      assert.equal((await h.request(`/lesson-runs/${first.id}`,undefined,late)).progress.filter(p=>p.status==='completed').length,0);
      await h.request(`/lesson-runs/${first.id}/state`,{state:'closed',revision:1},admin);
      await h.request(`/lesson-runs/${first.id}/state`,{state:'open',revision:1},admin,409);
      await h.request(`/lesson-runs/${first.id}/steps/text`,{acknowledged:true},late,409);
      await h.request(`/tasks/${practiceAssignment.task.id}/run`,{assignment_id:practiceAssignment.id,code:'print(42)',inputs:[]},student,404);
      assert.equal((await h.request(`/lesson-runs/${first.id}`,undefined,student)).progress.filter(p=>p.status==='completed').length,6);
      await h.request(`/lesson-runs/${second.id}/state`,{state:'open',revision:1},admin);
      const addedCurrent=await learner('late-current',lateCurrent);await h.request(`/groups/${group.id}/members`,{user_id:addedCurrent.id},admin);
      await h.request(`/programs/${program.id}/enroll`,{user_ids:[addedCurrent.id],mode:'current'},admin);
      assert.equal((await h.request('/state',undefined,lateCurrent)).programs[0].lessons.length,1);
      await h.request(`/lesson-runs/${first.id}`,undefined,lateCurrent,404);
      await h.request(`/programs/${program.id}/enroll`,{user_ids:[addedCurrent.id],mode:'from_start'},admin,409);
    });
    await t.test('new publication, explicit repeat and copying preserve the original educational evidence',async()=>{
      const state=await h.request('/state',undefined,admin),l=state.lessons.find(l=>l.id===lessons[0].id);
      await h.request(`/lesson-content/${l.id}`,{...l,title:'Revised lesson',teacher_notes:'new-private-notes'},admin,200,'PUT');
      await h.request(`/lesson-content/${l.id}/publish`,{revision:l.revision+1},admin);
      assert.equal((await h.request(`/lesson-runs/${first.id}`,undefined,student)).lesson.title,'Complete lesson 1');
      const nextPreview=await h.request('/programs/preview',body,admin);
      const repeat=await h.request('/programs',{...body,request_key:'program-explicit-repeat',preview_hash:nextPreview.preview_hash,repeat_of:program.id},admin);
      assert.notEqual(repeat.id,program.id);
      const repeated=(await h.request('/state',undefined,student)).programs.find(p=>p.id===repeat.id);
      assert.equal(repeated.lessons[0].completed,0);
      const copy=await h.request(`/courses/${base.course.id}/copy`,{},admin),copiedState=await h.request('/state',undefined,admin);
      const copiedModule=copiedState.modules.find(m=>m.course_id===copy.id),copiedLesson=copiedState.lessons.find(l=>l.module_id===copiedModule.id);
      assert.equal(copiedLesson.published_version_id,null);assert.equal(copiedLesson.steps.length,6);assert.equal(copiedLesson.teacher_notes,'new-private-notes');
      for(const s of copiedLesson.steps.filter(s=>s.task_id)){assert.ok(copiedState.tasks.some(t=>t.id===s.task_id&&t.lesson_id===copiedLesson.id));assert.ok(!s.task_version_id)}
      await h.request(`/programs/${program.id}`,{},admin,200,'DELETE');
      assert.ok(!(await h.request('/state',undefined,student)).programs.some(p=>p.id===program.id));
      assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE user_id=?').get(u.id).n,2);
      assert.deepEqual(h.db.prepare('PRAGMA foreign_key_check').all(),[]);
    });
    await t.test('module, lesson and sorted selection issuance; restored populated curriculum preserves all records',async()=>{
      for(const [scope,source] of [['module',base.module.id],['lesson',lessons[1].id]]){
        const request={group_id:group.id,scope,source_id:source,request_key:crypto.randomUUID()};
        const preview=await h.request('/programs/preview',request,admin);
        assert.equal(preview.snapshot.lessons.length,scope==='module'?2:1);
        await h.request('/programs',{...request,preview_hash:preview.preview_hash},admin);
      }
      const selection={group_id:group.id,scope:'selection',task_ids:[materials[1].final.id,materials[0].practice.id],request_key:crypto.randomUUID()};
      const preview=await h.request('/programs/preview',selection,admin);
      assert.equal(preview.snapshot.tasks[0].task_id,materials[0].practice.id);
      const issued=await h.request('/programs',{...selection,preview_hash:preview.preview_hash},admin);
      const selected=(await h.request('/state',undefined,student)).programs.find(r=>r.id===issued.id);
      assert.equal(selected.tasks.length,2);assert.ok(!selected.tasks.some(t=>t.completed));
      const probe=await verifyBackup(h.dbPath,join(h.dir,'restored.sqlite'));
      assert.equal(probe.verified,true);assert.ok(probe.preservedRows>80);assert.equal(probe.httpReady,true);
    });
  }finally{await h.close()}
});
