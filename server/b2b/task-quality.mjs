import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {grade} from './grader.mjs';
import {taskTemplates} from './task-templates.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
function runtimeHash(){try{return digest(readFileSync(new URL('../../.runner/runner.cjs',import.meta.url)))}catch{return 'unavailable'}}
const fingerprint=t=>{const fields=[t.check_mode,t.tests,t.starter,t.reference_solution,t.wrong_solutions,t.manual_criteria];if(t.learning_rules&&t.learning_rules!=='[]')fields.push(t.learning_rules);return digest(JSON.stringify(fields))};
export function createTaskQuality({db,own,teacher,fail,tx,validateTask,limit}){
  const get=(sql,...args)=>db.prepare(sql).get(...args);
  function approval(task){const proof=get("SELECT id,revision,created_at,runtime_hash,status FROM task_verifications WHERE org_id=? AND task_id=? AND revision=? AND fingerprint=? AND runtime_hash=? AND status='approved' ORDER BY created_at DESC LIMIT 1",task.org_id,task.id,task.revision,fingerprint(task),runtimeHash());return proof||null}
  function assertApproved(task){const proof=approval(task);if(!proof)fail(409,'Сначала сохраните и подтвердите проверку именно этой ревизии задания. Изменения требуют новой проверки.');return proof}
  function assertPublishedVersion(id,u){const version=own('task_versions',id,u),proof=version.verification_id&&get('SELECT * FROM task_verifications WHERE id=? AND org_id=?',version.verification_id,u.org_id);if(!proof||proof.status!=='approved'||proof.runtime_hash!==runtimeHash())fail(409,'Сохраните новую ревизию практики, подтвердите её проверку и опубликуйте перед новой выдачей. Назначенные работы остаются доступны.');return proof}
  async function handle(path,method,b,u){
    let match;
    if(path==='/api/task-templates'&&method==='GET'){teacher(u);return {items:taskTemplates}}
    if((match=/^\/api\/tasks\/([^/]+)\/verifications$/.exec(path))&&method==='GET'){
      teacher(u);own('tasks',match[1],u);return {items:db.prepare('SELECT id,author_id,revision,runtime_hash,status,reference_result,wrong_results,created_at FROM task_verifications WHERE org_id=? AND task_id=? ORDER BY created_at DESC LIMIT 50').all(u.org_id,match[1]).map(v=>({...v,reference_result:JSON.parse(v.reference_result),wrong_results:JSON.parse(v.wrong_results)}))};
    }
    if((match=/^\/api\/tasks\/([^/]+)\/verify$/.exec(path))&&method==='POST'){
      teacher(u);limit(`execute:${u.id}`,50,60000);
      const working=own('tasks',match[1],u);let task=working,replay=false;
      if(b.verification_id){
        const previous=own('task_verifications',b.verification_id,u);
        if(previous.task_id!==working.id||previous.revision!==b.revision)fail(404,'Проверка этой ревизии не найдена.');
        const candidates=[...db.prepare('SELECT snapshot AS content FROM task_versions WHERE task_id=? AND revision=? AND org_id=?').all(working.id,previous.revision,u.org_id),...db.prepare('SELECT content FROM material_revisions WHERE task_id=? AND org_id=? AND accepted_revision=? AND conflict=0 ORDER BY created_at DESC LIMIT 200').all(working.id,u.org_id,previous.revision)].map(r=>JSON.parse(r.content));
        task=candidates.find(t=>fingerprint(t)===previous.fingerprint);
        if(!task)fail(409,'Исходный снимок проверки недоступен. Текущий черновик не изменён.');
        replay=true;
      }else if(b.revision!==task.revision)fail(409,'Ревизия изменилась. Сохраните актуальный черновик.');
      validateTask({...task,hints:JSON.parse(task.hints),tests:JSON.parse(task.tests),wrong_solutions:JSON.parse(task.wrong_solutions),learning_rules:JSON.parse(task.learning_rules||'[]')},u,true);
      const wrong=JSON.parse(task.wrong_solutions),runtime=runtimeHash();
      let reference,results=[],status;
      if(task.check_mode==='manual'){
        if(!task.manual_criteria.trim())fail(400,'Добавьте понятные критерии ручной проверки.');
        reference={status:'manual_configured',message:'Критерии ручной проверки сохранены. Качество работы оценивает преподаватель.'};status='approved';
      }else{
        if(!task.reference_solution.trim())fail(400,'Добавьте закрытое эталонное решение.');
        if(!wrong.length||wrong.some(code=>!code.trim()))fail(400,'Добавьте хотя бы один характерный неправильный пример.');
        reference=await grade(task,task.reference_solution,{tenant:u.org_id});
        if(reference.status==='checker_error')status='checker_error';
        else if(reference.status!=='passed')status='bad_reference';
        else{
          for(const [index,code] of wrong.entries())results.push({index:index+1,...await grade(task,code,{tenant:u.org_id})});
          status=results.some(r=>r.status==='checker_error')?'checker_error':results.some(r=>r.status==='passed')?'weak_tests':'approved';
        }
      }
      // No await inside the transaction; a second author can edit while checks run.
      const current=own('tasks',task.id,u);
      if((!replay&&(current.revision!==task.revision||fingerprint(current)!==fingerprint(task)))||runtimeHash()!==runtime)fail(409,'Задание или исполнитель изменились во время проверки. Результат не подтверждает новую ревизию.');
      const id=randomUUID(),at=new Date().toISOString();
      tx(()=>{
        db.prepare('INSERT INTO task_verifications VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,u.org_id,task.id,u.id,task.revision,fingerprint(task),runtime,status,JSON.stringify(reference),JSON.stringify(results),at);
        db.prepare('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)').run(randomUUID(),u.org_id,u.id,replay?'task.verification_replayed':'task.verified',task.id,JSON.stringify({verification_id:id,revision:task.revision,status,runtime_hash:runtime}),at);
      });
      return {id,revision:task.revision,status,replay,publication_eligible:current.revision===task.revision&&fingerprint(current)===fingerprint(task),reference,wrong:results,message:({approved:task.check_mode==='manual'?'Критерии ручной проверки подтверждены.':'Эталон проходит, неправильные примеры отклоняются.',bad_reference:'Эталон не проходит проверку. Исправьте решение или тесты.',weak_tests:'Неправильное решение прошло. Усильте тесты перед публикацией.',checker_error:'Технический сбой проверки. Подтверждение не выдано.'})[status]};
    }
    return undefined;
  }
  return {handle,approval,assertApproved,assertPublishedVersion};
}
