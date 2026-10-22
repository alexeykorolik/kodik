import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
import {practicum} from '../server/b2b/practicum.mjs';
// «Практикум Kodik» installs as one school course per topic, every task through the ordinary quality
// gate (reference passes, the characteristic mistake fails, block solutions load in Blockly and pass);
// block tasks open in their mode and every task keeps its difficulty. The data itself is checked
// against CPython by tests/problem-book.mjs (export --check covers both sets).
test('practicum: every topic installs as its own course, every task is approved with its modes and level',async()=>{
  const h=await harness();
  try{
    const {admin}=await h.school('practicum');
    let step;
    for(let attempt=0;attempt<80;attempt++){
      // The server limits checks per minute; a busy answer means "continue a little later".
      const r=await fetch(`${h.origin}/api/practicum/install`,{method:'POST',headers:{Origin:h.origin,'Content-Type':'application/json','X-Kodik-Client':'2',Cookie:admin.cookie},body:'{}'});
      const data=await r.json();
      if(r.status===429){await new Promise(done=>setTimeout(done,15000));continue}
      assert.equal(r.status,200,JSON.stringify(data));step=data;if(step.ready)break;
    }
    assert.equal(step?.ready,true,'practicum installed');
    const again=await h.request('/practicum/install',{},admin);
    assert.deepEqual([again.ready,again.ids],[true,step.ids],'a second install returns the same courses');
    const s=await h.request('/state',undefined,admin);
    const courses=s.courses.filter(c=>step.ids.includes(c.id));
    assert.deepEqual(courses.map(c=>c.title).sort(),practicum.chapters.map((c,i)=>`Практикум · ${i+1}. ${c.title}`).sort());
    const modules=s.modules.filter(m=>step.ids.includes(m.course_id)),lessons=s.lessons.filter(l=>modules.some(m=>m.id===l.module_id));
    const tasks=s.tasks.filter(t=>lessons.some(l=>l.id===t.lesson_id));
    const all=practicum.chapters.flatMap(c=>c.tasks);
    assert.equal(lessons.length,practicum.chapters.length,'one lesson in each course');
    assert.equal(tasks.length,all.length);
    assert.ok(tasks.every(t=>t.published),'every task is published after its approved check');
    for(const [i,chapter] of practicum.chapters.entries()){
      const course=courses.find(c=>c.title===`Практикум · ${i+1}. ${chapter.title}`);
      const lesson=lessons.find(l=>modules.some(m=>m.id===l.module_id&&m.course_id===course.id));
      const own=tasks.filter(t=>t.lesson_id===lesson.id).sort((a,b)=>a.position-b.position);
      assert.deepEqual(own.map(t=>t.title),chapter.tasks.map(t=>t.title),`${chapter.title}: tasks in order`);
      for(const [k,t] of own.entries()){
        const m=chapter.tasks[k],config=typeof t.learning_config==='string'?JSON.parse(t.learning_config):t.learning_config;
        assert.equal(t.difficulty,m.level||'easy',`${m.key}: difficulty`);
        assert.deepEqual(config?.modes??[],m.blocks?.modes??[],`${m.key}: block modes`);
      }
    }
  }finally{await h.close()}
});
