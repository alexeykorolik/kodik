import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {harness} from './helpers/b2b-harness.mjs';
test('three schools, 60 learners: blocks, mixed, short, long, wrong, runtime and manual work share both queues',async()=>{
  const h=await harness(),requests=[],reports=[];try{
    const workspace={blocks:{languageVersion:0,blocks:[{type:'text_print',inputs:{TEXT:{block:{type:'math_number',fields:{NUM:42}}}}}]}};
    for(let school=0;school<3;school++){
      const {admin}=await h.school(`mixed-load-${school}`),base=await h.content(admin),group=await h.request('/groups',{title:'20 учеников'},admin);
      const auto=await h.task(admin,base.lesson,{title:'Автоматическая',instruction:'Выведи 42',tests:[{inputs:[],expected:'42',hidden:false}],learning_config:{modes:['blocks','mixed'],palette:['text_print','math_number']},block_solution:workspace}),manual=await h.task(admin,base.lesson,{title:'Ручная',check_mode:'manual',manual_criteria:'Проверьте понятность объяснения.'});
      for(const t of [auto,manual])await h.request(`/tasks/${t.id}/publish`,{published:true},admin);
      const aa=await h.request('/assignments',{group_id:group.id,task_id:auto.id},admin),ma=await h.request('/assignments',{group_id:group.id,task_id:manual.id},admin);
      const rows=Array.from({length:20},(_,i)=>({name:`Ученик ${i}`,login:`mixed-load-${school}-${i}`})),preview=await h.request(`/groups/${group.id}/import/preview`,{rows},admin),batch=await h.request(`/groups/${group.id}/import`,{rows,preview_hash:preview.preview_hash,request_key:`mixed-load-import-${school}`},admin);
      const clients=await Promise.all(batch.credentials.map(async(c,i)=>{const client={};await h.request('/auth/login',{login:c.login,password:c.password},client);return {client,i}}));
      for(const {client,i} of clients){const kind=i%7,mode=kind===0?'blocks':kind===1?'mixed':'python',expected=kind===4?'failed':kind===5?'runtime_error':kind===6?'pending_review':'passed',task=kind===6?manual:auto,assignment=kind===6?ma:aa;
        const program=mode!=='python'?{mode,workspace}:{mode,code:kind===3?'n = 0\nfor i in range(500):\n    n = n + 1\nprint(42)':kind===4?'print(41)':kind===5?'print(1 / 0)':'print(42)'};
        requests.push({school,client,task,assignment,kind,expected,program,acceptedAt:0,queuedObservationMs:0,latency:0,job:null});
      }
      reports.push({admin,school});
    }
    const started=performance.now();
    let peakDurable=0,peakExecutor=0;const sample=async()=>{peakDurable=Math.max(peakDurable,h.db.prepare("SELECT COUNT(*) n FROM submission_jobs WHERE status IN ('queued','running')").get().n);const health=await h.request('/health');peakExecutor=Math.max(peakExecutor,health.queue.waiting)};
    await Promise.all(requests.map(async r=>{r.acceptedAt=performance.now();r.job=await h.request(`/tasks/${r.task.id}/submissions`,{...r.program,assignment_id:r.assignment.id,request_key:crypto.randomUUID()},r.client);await sample()}));
    const pending=new Set(requests);while(pending.size&&performance.now()-started<120000){
      await sample();await Promise.all([...pending].map(async r=>{const job=await h.request(`/submissions/${r.job.id}`,undefined,r.client);if(job.status==='queued')r.queuedObservationMs=performance.now()-r.acceptedAt;if(job.status==='completed'){assert.equal(job.result.status,r.expected,`school ${r.school}, kind ${r.kind}: ${JSON.stringify(job.result)}`);r.latency=performance.now()-r.acceptedAt;pending.delete(r)}else assert.ok(['queued','running'].includes(job.status))}));
      if(pending.size)await new Promise(r=>setTimeout(r,100));
    }
    assert.equal(pending.size,0);assert.equal(h.db.prepare('SELECT COUNT(*) n FROM attempts').get().n,60);
    const duration=requests.map(r=>r.latency).sort((a,b)=>a-b),report={at:new Date().toISOString(),environment:{os:process.platform,node:process.version,storage:'local SQLite WAL'},schools:3,learners:60,totalMs:Math.round(performance.now()-started),p50Ms:Math.round(duration[30]),p95Ms:Math.round(duration[56]),maxMs:Math.round(duration.at(-1)),observedQueueWaitMaxMs:Math.round(Math.max(...requests.map(r=>r.queuedObservationMs))),peakDurable,peakExecutor,results:Object.fromEntries(['passed','failed','runtime_error','pending_review'].map(status=>[status,requests.filter(r=>r.expected===status).length])),checkerErrors:0,scope:'Local mixed workload; target host has not been selected or measured.'};
    await mkdir('work',{recursive:true});await writeFile('work/multi-school-load-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
    // Tenant reads and end state remain separate after a mixed concurrent load.
    for(const {admin,school} of reports){const state=await h.request('/state',undefined,admin);assert.equal(state.attempts.length,20);assert.ok(state.users.every(u=>!u.login.startsWith('mixed-load-')||u.login.startsWith(`mixed-load-${school}-`)))}
  }finally{await h.close()}
});
