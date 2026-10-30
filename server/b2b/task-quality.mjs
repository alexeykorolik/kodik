import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {grade,translateBlocks,checkWithBlockly} from './grader.mjs';
import {taskTemplates} from './task-templates.mjs';
import {adaptive} from './modes.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
// Semantic identity of the checking chain (scripts/build-runner.mjs). Python-only tasks depend on the
// interpreter and learning rules; block tasks additionally on the translator. Rebuilding the bundle
// without changing these sources keeps approvals valid; a semantic change requires re-verification
// (scripts/reverify-published.mjs), which records NEW verifications instead of rewriting history.
function runtimeIdentity(){try{return JSON.parse(readFileSync(new URL('../../.runner/runtime.json',import.meta.url),'utf8'))}catch{return null}}
const configOf=t=>adaptive.parseLearningConfig(t.learning_config||'{}');
const usesBlocks=t=>configOf(t).modes.length>0;
// The learning interpreter is JavaScript, so the Node major version the server actually runs is part of it.
const nodeMajor=`node${process.versions.node.split('.')[0]}`;
export function runtimeFor(t){const id=runtimeIdentity();if(!id)return 'unavailable';const py=`${id.python}:${nodeMajor}`;return usesBlocks(t)?`${py}+${id.blocks}`:py}
const fingerprint=t=>{
  const fields=[t.check_mode,t.tests,t.starter,t.reference_solution,t.wrong_solutions,t.manual_criteria];
  if(t.learning_rules&&t.learning_rules!=='[]')fields.push(t.learning_rules);
  // Block settings only participate when block modes are on, so Python-only approvals stay valid.
  const c=configOf(t);
  if(c.modes.length)fields.push(JSON.stringify({modes:c.modes,palette:c.palette,starter_blocks:c.starter_blocks}),t.block_solution||'');
  return digest(JSON.stringify(fields));
};
export function createTaskQuality({db,own,teacher,fail,tx,validateTask,limit}){
  const get=(sql,...args)=>db.prepare(sql).get(...args);
  const parsed=task=>({...task,hints:JSON.parse(task.hints),tests:JSON.parse(task.tests),wrong_solutions:JSON.parse(task.wrong_solutions||'[]'),learning_rules:JSON.parse(task.learning_rules||'[]'),learning_config:JSON.parse(task.learning_config||'{}'),block_solution:task.block_solution?JSON.parse(task.block_solution):''});
  function approval(task){const proof=get("SELECT id,revision,created_at,runtime_hash,status FROM task_verifications WHERE org_id=? AND task_id=? AND revision=? AND fingerprint=? AND runtime_hash=? AND status='approved' ORDER BY created_at DESC LIMIT 1",task.org_id,task.id,task.revision,fingerprint(task),runtimeFor(task));return proof||null}
  function assertApproved(task){const proof=approval(task);if(!proof)fail(409,'Сначала сохраните и подтвердите проверку именно этой ревизии задания. Изменения требуют новой проверки.');return proof}
  /**
   * A published version is issuable when its own proof was made in the current checking environment,
   * or when the compatibility procedure (scripts/reverify-published.mjs) recorded an approved replay of
   * exactly that snapshot for the current environment. Versions themselves are immutable.
   */
  /** Proof that this exact published snapshot is valid in the current environment, or null. */
  function currentProof(version,orgId){
    const snapshot=JSON.parse(version.snapshot),runtime=runtimeFor(snapshot);
    const proof=version.verification_id&&get('SELECT * FROM task_verifications WHERE id=? AND org_id=?',version.verification_id,orgId);
    if(proof&&proof.status==='approved'&&proof.runtime_hash===runtime)return proof;
    // Only the explicit compatibility procedure may vouch for an old version in a new environment;
    // an ordinary re-check of the working draft never replaces the evidence of a published snapshot.
    return (proof&&get("SELECT v.* FROM task_verifications v JOIN audit_log l ON l.org_id=v.org_id AND l.action='task.version_reverified' AND l.target_id=? AND json_extract(l.details,'$.verification_id')=v.id WHERE v.org_id=? AND v.task_id=? AND v.revision=? AND v.fingerprint=? AND v.runtime_hash=? AND v.status='approved' ORDER BY v.created_at DESC LIMIT 1",version.id,orgId,version.task_id,version.revision,fingerprint(snapshot),runtime))||null;
  }
  function assertPublishedVersion(id,u){
    const proof=currentProof(own('task_versions',id,u),u.org_id);if(proof)return proof;
    fail(409,'Сохраните новую ревизию практики, подтвердите её проверку и опубликуйте перед новой выдачей. Назначенные работы остаются доступны.');
  }
  /**
   * May NEW checks of already issued work run for this pinned version? Yes when its proof is valid in the
   * current environment. Versions published before quality proofs existed never had any proof; they keep
   * running as before (documented legacy exception) and their new results record the environment.
   */
  function versionCompatible(versionId,orgId){
    const version=get('SELECT * FROM task_versions WHERE id=? AND org_id=?',versionId,orgId);
    if(!version)return {ok:false,runtime:'unknown'};
    const runtime=runtimeFor(JSON.parse(version.snapshot));
    if(!version.verification_id)return {ok:true,runtime,legacy:true};
    return {ok:!!currentProof(version,orgId),runtime};
  }
  /** The block solution must pass through exactly the learner path. */
  async function blockProof(task,u){
    const config=configOf(task);
    if(!config.modes.length)return {status:'not_required'};
    const solution=task.block_solution?JSON.parse(task.block_solution):null;
    if(!solution)return {status:'missing',message:'Добавьте закрытый блоковый образец решения.'};
    const loaded=await checkWithBlockly([solution,config.starter_blocks],config.palette,{tenant:u.org_id});
    if(loaded.infrastructure)return {status:'checker_error',message:loaded.error};
    const [sol,starter]=loaded.results||[];
    if(!sol?.ok)return {status:'bad_block_solution',message:'Блоковый образец: '+(sol?.message||'не открывается в Blockly.')};
    if(starter&&!starter.ok)return {status:'bad_block_solution',message:'Стартовые блоки: '+starter.message};
    const translation=await translateBlocks(solution,config.palette,{tenant:u.org_id});
    if(translation.infrastructure)return {status:'checker_error',message:translation.error};
    if(!translation.ok)return {status:'bad_block_solution',message:'Блоковый образец не собирается в программу: '+translation.errors[0]?.message,errors:translation.errors};
    const result=await grade(task,translation.python,{tenant:u.org_id});
    if(result.status==='checker_error')return {status:'checker_error',message:result.message};
    if(result.status!=='passed')return {status:'bad_block_solution',message:'Блоковый образец не проходит тесты или учебные правила: '+result.message,result};
    let starterNote=null;
    if(starter?.translatable){const t=await translateBlocks(config.starter_blocks,config.palette,{tenant:u.org_id});if(t.ok){const r=await grade(task,t.python,{tenant:u.org_id});if(r.status==='passed')starterNote='Стартовые блоки уже проходят все тесты — ученику нечего делать.'}}
    return {status:'approved',python:translation.python,translator:translation.translator,used_blocks:translation.block_types,starter_note:starterNote};
  }
  /** Does submitting the untouched start already pass? Python start always (Python is always supported), block start when block modes are on. */
  async function starterProof(task,block,u){
    const solved=[];
    if(task.starter&&task.starter.trim()){const r=await grade(task,task.starter,{tenant:u.org_id});if(r.status==='checker_error')return {status:'checker_error'};if(r.status==='passed')solved.push({mode:'python',where:'стартовый код Python'})}
    if(block.starter_note)solved.push({mode:'blocks',where:'стартовые блоки'});
    if(!solved.length)return {status:'ok'};
    return {status:'solved_starter',solved,message:`Заготовка уже решает задачу: ${solved.map(s=>s.where).join(' и ')}. Отправив её без изменений, ученик получит «Выполнено». Оставьте в заготовке пропуск или ошибку, которую нужно исправить. Готовую программу для разбора покажите шагом урока «Пример кода».`};
  }
  async function handle(path,method,b,u){
    let match;
    if(path==='/api/task-templates'&&method==='GET'){teacher(u);return {items:taskTemplates}}
    if((match=/^\/api\/tasks\/([^/]+)\/verifications$/.exec(path))&&method==='GET'){
      teacher(u);own('tasks',match[1],u);return {items:db.prepare('SELECT id,author_id,revision,runtime_hash,status,reference_result,wrong_results,block_result,created_at FROM task_verifications WHERE org_id=? AND task_id=? ORDER BY created_at DESC LIMIT 50').all(u.org_id,match[1]).map(v=>({...v,reference_result:JSON.parse(v.reference_result),wrong_results:JSON.parse(v.wrong_results),block_result:JSON.parse(v.block_result||'{}')}))};
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
      validateTask(parsed(task),u,true);
      const wrong=JSON.parse(task.wrong_solutions),runtime=runtimeFor(task);
      let reference,results=[],status,block={status:'not_required'},starter={status:'not_checked'};
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
        if(status==='approved'){block=await blockProof(task,u);if(block.status==='checker_error')status='checker_error';else if(block.status!=='approved'&&block.status!=='not_required')status='bad_block_solution'}
        // Graded practice must leave work for the learner: a start that already passes every test and
        // learning rule in any allowed way of solving cannot be published. Incomplete starts are fine.
        if(status==='approved'){starter=await starterProof(task,block,u);if(starter.status==='checker_error')status='checker_error';else if(starter.status==='solved_starter')status='solved_starter'}
      }
      // No await inside the transaction; a second author can edit while checks run.
      const current=own('tasks',task.id,u);
      if((!replay&&(current.revision!==task.revision||fingerprint(current)!==fingerprint(task)))||runtimeFor(task)!==runtime)fail(409,'Задание или исполнитель изменились во время проверки. Результат не подтверждает новую ревизию.');
      const id=randomUUID(),at=new Date().toISOString();
      tx(()=>{
        db.prepare('INSERT INTO task_verifications VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,u.org_id,task.id,u.id,task.revision,fingerprint(task),runtime,status,JSON.stringify(reference),JSON.stringify(results),at,JSON.stringify({...block,starter}));
        db.prepare('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)').run(randomUUID(),u.org_id,u.id,replay?'task.verification_replayed':'task.verified',task.id,JSON.stringify({verification_id:id,revision:task.revision,status,runtime_hash:runtime}),at);
      });
      return {id,revision:task.revision,status,starter,replay,publication_eligible:current.revision===task.revision&&fingerprint(current)===fingerprint(task),reference,wrong:results,block,message:({approved:task.check_mode==='manual'?'Критерии ручной проверки подтверждены.':block.status==='approved'?'Эталон и блоковый образец проходят, неправильные примеры отклоняются.':'Эталон проходит, неправильные примеры отклоняются.',bad_reference:'Эталон не проходит проверку. Исправьте решение или тесты.',weak_tests:'Неправильное решение прошло. Усильте тесты перед публикацией.',bad_block_solution:block.message||'Блоковый образец не подтверждён.',solved_starter:starter.message,checker_error:'Технический сбой проверки. Подтверждение не выдано.'})[status]};
    }
    return undefined;
  }
  return {handle,approval,assertApproved,assertPublishedVersion,versionCompatible};
}
