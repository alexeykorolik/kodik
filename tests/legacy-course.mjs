import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {harness} from './helpers/b2b-harness.mjs';
import {legacyCourse} from '../server/b2b/legacy-course.mjs';
// The 12 chapters of the first Kodik version install as 12 school courses, all 100 tasks
// through the ordinary quality gate; the data matches src/course.ts.
test('legacy courses: data is current, every chapter installs as its own course, every task is approved',async()=>{
  execFileSync(process.execPath,['./node_modules/tsx/dist/cli.mjs','scripts/export-legacy-course.ts','--check'],{stdio:'pipe'});
  const h=await harness();
  try{
    const {admin}=await h.school('legacy');
    let step;
    for(let attempt=0;attempt<60;attempt++){
      // The server limits checks per minute; a busy answer means "continue a little later".
      const r=await fetch(`${h.origin}/api/legacy-course/install`,{method:'POST',headers:{Origin:h.origin,'Content-Type':'application/json','X-Kodik-Client':'2',Cookie:admin.cookie},body:'{}'});
      const data=await r.json();
      if(r.status===429){await new Promise(done=>setTimeout(done,15000));continue}
      assert.equal(r.status,200,JSON.stringify(data));step=data;if(step.ready)break;
    }
    assert.equal(step?.ready,true,'course installed');
    const again=await h.request('/legacy-course/install',{},admin);
    assert.deepEqual([again.ready,again.ids],[true,step.ids],'a second install returns the same courses');
    const s=await h.request('/state',undefined,admin);
    const courses=s.courses.filter(c=>step.ids.includes(c.id));
    assert.equal(courses.length,legacyCourse.chapters.length,'one course per chapter');
    assert.deepEqual(courses.map(c=>c.title).sort(),legacyCourse.chapters.map((c,i)=>`Kodik · ${i+1}. ${c.title}`).sort());
    const modules=s.modules.filter(m=>step.ids.includes(m.course_id)),lessons=s.lessons.filter(l=>modules.some(m=>m.id===l.module_id));
    const tasks=s.tasks.filter(t=>lessons.some(l=>l.id===t.lesson_id));
    assert.equal(lessons.length,legacyCourse.chapters.length,'one lesson in each course');
    assert.equal(tasks.length,100);
    assert.ok(tasks.every(t=>t.published),'every task is published after its approved check');
    const blocks=tasks.filter(t=>(typeof t.learning_config==='string'?JSON.parse(t.learning_config):t.learning_config||{}).modes?.length);
    assert.equal(blocks.length,legacyCourse.chapters.flatMap(c=>c.tasks).filter(t=>t.blocks).length,'block tasks keep their blocks');
  }finally{await h.close()}
});
