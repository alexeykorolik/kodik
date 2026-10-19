import {randomUUID,createHash} from 'node:crypto';
/**
 * Learning conclusions and mode recommendations (docs/adaptive/RECOMMENDATION_RULES.md).
 * A passed check stays a passed check. Whether it may support a learning conclusion is decided
 * separately: an untouched (or only re-commented / re-arranged) start never does.
 */
export const RULE_VERSION='pilot-transition/2';
export const RULES={freshDays:21,minFamilies:2,recentFailures:2};
const GRADED=['passed','failed','runtime_error'];
export function createLearningEvidence({db,own,teacher,fail,tx,modes,adaptive,groupAllowed}){
  const get=(q,...a)=>db.prepare(q).get(...a),all=(q,...a)=>db.prepare(q).all(...a),run=(q,...a)=>db.prepare(q).run(...a),now=()=>new Date().toISOString();
  function family(task){
    const known=get('SELECT family FROM task_families WHERE task_id=?',task.id);if(known)return known.family;
    // Copies with the same condition and tests are one exercise; versions retain the original family.
    const key=createHash('sha256').update(JSON.stringify([task.instruction?.trim(),task.tests])).digest('hex');
    run('INSERT OR IGNORE INTO task_families VALUES(?,?,?)',task.id,task.org_id,key);return key;
  }
  const skillsOf=task=>adaptive.parseLearningConfig(task.learning_config).skills;
  /** One successful attempt, classified for learning conclusions. */
  function classify(a){
    const task=JSON.parse(a.snapshot),config=adaptive.parseLearningConfig(task.learning_config);
    const unchanged=adaptive.isUnchangedStart(a.code,a.mode,task.starter||'',config.starter_blocks);
    return {attempt_id:a.id,assignment_id:a.assignment_id,task_id:a.task_id,family:family(task),mode:a.mode,title:task.title,difficulty:task.difficulty,skills:config.skills,created_at:a.created_at,
      eligible:!unchanged,reason:unchanged?'Отправлена заготовка без содержательных изменений: проверка пройдена, но это не основание для учебных выводов.':''};
  }
  function evidence(u,studentId){
    const rows=all("SELECT * FROM attempts WHERE org_id=? AND user_id=? AND status='passed' ORDER BY created_at",u.org_id,studentId).filter(a=>u.role!=='teacher'||a.assignment_id&&groupAllowed(u,get('SELECT group_id FROM assignments WHERE id=?',a.assignment_id)?.group_id));
    const seen=new Set(),items=[];
    for(const a of rows){const item=classify(a);if(item.eligible){const key=item.family+':'+item.mode;if(seen.has(key))continue;seen.add(key)}items.push(item)}
    const eligible=items.filter(i=>i.eligible),blocks=eligible.filter(a=>a.mode!=='python'),python=eligible.filter(a=>a.mode==='python');
    const transfer=python.filter(p=>blocks.some(b=>b.family!==p.family&&b.difficulty===p.difficulty&&b.created_at<p.created_at&&b.skills.some(s=>p.skills.includes(s))));
    return {items,labels:[...(items.length?['Есть успешные проверки']:[]),...(blocks.length?['Решал с блоками']:[]),...(python.length?['Есть решения в Python']:[]),...(transfer.length?['Решил другое задание в Python']:[])],transfer_attempts:transfer.map(a=>a.attempt_id),limitations:'Успешная проверка не подтверждает освоение каждого навыка. Внешняя помощь не измерена. Копии, повторные прохождения и отправка заготовки без изменений не добавляют оснований.'};
  }
  /**
   * Evaluate whether proposing the next mode in THIS assignment is justified now. Every check is
   * returned with a plain explanation so the teacher can see why there is (or is not) a proposal.
   */
  function evaluate(a,student,u){
    const checks=[],add=(rule,ok,detail)=>{checks.push({rule,ok,detail});return ok};
    const e=modes.effectiveFor(a,student),current=e.eff.current,target=current==='blocks'?'mixed':current==='mixed'?'python':null;
    const task=JSON.parse(get('SELECT snapshot FROM task_versions WHERE id=?',a.version_id).snapshot),skills=skillsOf(task),fam=family({...task,id:a.task_id});
    const lessonRun=a.lesson_run_id?get('SELECT state FROM lesson_runs WHERE id=?',a.lesson_run_id):null,member=get('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?',a.group_id,student);
    add('context',!a.archived&&!!member&&(!lessonRun||lessonRun.state==='open'),!a.archived&&member?(lessonRun&&lessonRun.state!=='open'?'Занятие не открыто: предлагать переход в нём сейчас бесполезно.':'Назначение доступно ученику.'):'Назначение закрыто или недоступно ученику.');
    const done=get("SELECT 1 FROM attempts WHERE assignment_id=? AND user_id=? AND status='passed'",a.id,student);
    add('not_finished',!done,done?'Это задание уже выполнено — переход в нём не нужен.':'Задание ещё не выполнено.');
    add('policy',!!target&&e.eff.switching!=='locked'&&e.eff.allowed.includes(target),!target?'Ученик уже в самом самостоятельном режиме.':e.eff.switching==='locked'?'Режим закреплён преподавателем.':e.eff.allowed.includes(target)?`Режим «${adaptive.MODE_LABEL[target]}» разрешён в этом назначении.`:`Режим «${adaptive.MODE_LABEL[target]}» не разрешён в этом назначении.`);
    add('topic',skills.length>0,skills.length?`Целевые навыки задания: ${skills.join(', ')}.`:'У задания не подтверждены целевые навыки — тему не с чем сопоставить.');
    const since=Date.now()-RULES.freshDays*86400000;
    const proof=evidence(u,student).items.filter(i=>i.eligible&&i.mode===current&&i.family!==fam&&Date.parse(i.created_at)>=since&&i.skills.some(s=>skills.includes(s)));
    const families=[...new Set(proof.map(p=>p.family))];
    add('fresh_successes',families.length>=RULES.minFamilies,`Свежих (за ${RULES.freshDays} дней) успешных решений других заданий с теми же навыками в режиме «${adaptive.MODE_LABEL[current]}»: ${families.length} из ${RULES.minFamilies} нужных.`);
    const recent=all(`SELECT status FROM attempts WHERE assignment_id=? AND user_id=? AND status IN (${GRADED.map(()=>'?').join(',')}) ORDER BY created_at DESC LIMIT ?`,a.id,student,...GRADED,RULES.recentFailures);
    const struggling=recent.length>=RULES.recentFailures&&recent.every(r=>r.status!=='passed');
    add('no_current_difficulty',!struggling,struggling?`Последние ${RULES.recentFailures} проверки в этом задании неуспешны — сейчас уместнее помощь, а не новый режим.`:'В этом задании нет серии неудачных проверок (сбои сервиса и отмены не учитываются).');
    const ok=checks.every(c=>c.ok);
    return {ok,target,current,checks,basis:{attempts:proof.map(p=>p.attempt_id),families,checks,reason:ok?`Свежие успешные решения ${families.length} разных заданий с навыками ${skills.join(', ')} в режиме «${adaptive.MODE_LABEL[current]}», текущее задание не выполнено и без серии ошибок. Предложить следующий способ без автоматического перехода.`:''}};
  }
  function expire(){for(const r of all("SELECT * FROM recommendations WHERE status IN ('proposed','offered') AND expires_at<?",now())){const event=get("SELECT reason FROM mode_events WHERE assignment_id=? AND user_id=? AND kind='offered' ORDER BY created_at DESC LIMIT 1",r.assignment_id,r.user_id);if(r.status==='offered'&&event?.reason.includes(r.id))run('UPDATE assignment_mode_state SET offered_mode=NULL,revision=revision+1 WHERE assignment_id=? AND user_id=? AND offered_mode=?',r.assignment_id,r.user_id,r.target_mode);run("UPDATE recommendations SET status='expired' WHERE id=?",r.id)}}
  function propose(a,student,u){
    if(get("SELECT 1 FROM recommendations WHERE user_id=? AND status IN ('proposed','offered')",student))return;
    const r=evaluate(a,student,u);if(!r.ok)return;
    run("INSERT OR IGNORE INTO recommendations VALUES(?,?,?,?,?,?,?,'proposed',?,?,NULL)",randomUUID(),u.org_id,a.id,student,r.target,RULE_VERSION,JSON.stringify(r.basis),new Date(Date.now()+7*86400000).toISOString(),now());
  }
  function respond(assignmentId,userId,mode,declined){
    expire();const rec=get("SELECT * FROM recommendations WHERE assignment_id=? AND user_id=? AND target_mode=? AND status='offered'",assignmentId,userId,mode);if(!rec)return;
    const status=declined?'declined':'accepted';run('UPDATE recommendations SET status=? WHERE id=?',status,rec.id);run('INSERT INTO recommendation_events VALUES(?,?,?,?,?)',randomUUID(),rec.id,userId,status,now());
    return rec.id;
  }
  async function handle(path,method,b,u){let m;
    if((m=/^\/api\/tasks\/([^/]+)\/family$/.exec(path))&&method==='PUT'){
      teacher(u);if(typeof b.source_task_id!=='string')fail(400,'Выберите исходное упражнение.');const task=own('tasks',m[1],u),source=own('tasks',b.source_task_id,u);if(task.published_version_id)fail(409,'Семейство опубликованного материала закреплено. Для варианта используйте копирование.');
      const key=family(source);run('INSERT INTO task_families VALUES(?,?,?) ON CONFLICT(task_id) DO UPDATE SET family=excluded.family',task.id,u.org_id,key);return {ok:true};
    }
    if((m=/^\/api\/students\/([^/]+)\/evidence$/.exec(path))&&method==='GET'){
      if(u.role==='student'&&m[1]!==u.id)fail(404,'Ученик не найден.');own('users',m[1],u);const proof=evidence(u,m[1]);return u.role==='student'?{...proof,items:proof.items.map(({family,...item})=>item)}:proof;
    }
    // Why is there (or is there not) a proposal for this learner in this assignment?
    if((m=/^\/api\/assignments\/([^/]+)\/students\/([^/]+)\/recommendation-check$/.exec(path))&&method==='GET'){
      teacher(u);const a=own('assignments',m[1],u);if(!groupAllowed(u,a.group_id))fail(404,'Объект не найден.');own('users',m[2],u);const r=evaluate(a,m[2],u);return {rule_version:RULE_VERSION,rules:RULES,ok:r.ok,current:r.current,target:r.target,checks:r.checks};
    }
    if(path==='/api/recommendations'&&method==='GET'){
      expire();if(u.role!=='student'){
        teacher(u);const assignments=all('SELECT * FROM assignments WHERE org_id=? AND archived=0',u.org_id).filter(a=>groupAllowed(u,a.group_id));
        for(const a of assignments)for(const student of all("SELECT u.id FROM users u JOIN group_members gm ON gm.user_id=u.id WHERE gm.group_id=? AND u.active=1 AND u.role='student'",a.group_id))propose(a,student.id,u);
      }
      return {items:all('SELECT r.*,u.name student_name FROM recommendations r JOIN users u ON u.id=r.user_id WHERE r.org_id=? ORDER BY r.created_at DESC LIMIT 200',u.org_id).filter(r=>u.role==='student'?r.user_id===u.id:groupAllowed(u,get('SELECT group_id FROM assignments WHERE id=?',r.assignment_id)?.group_id)).map(r=>{const {families,checks,...basis}=JSON.parse(r.basis);return {...r,basis:u.role==='student'?basis:{...basis,families,checks}}})};
    }
    if((m=/^\/api\/recommendations\/([^/]+)\/(approve|dismiss)$/.exec(path))&&method==='POST'){
      teacher(u);expire();const r=own('recommendations',m[1],u),a=own('assignments',r.assignment_id,u);
      if(r.status===(m[2]==='approve'?'offered':'dismissed'))return {ok:true};if(r.status!=='proposed')fail(409,'Рекомендация уже обработана или истекла.');
      const effective=modes.effectiveFor(a,r.user_id).eff;if(a.archived||effective.switching==='locked'||!effective.allowed.includes(r.target_mode)||effective.current===r.target_mode)fail(409,'Настройки задания изменились. Рекомендация больше не подходит.');
      tx(()=>{if(m[2]==='approve')modes.offerRecommendation(a,r.user_id,u,r.target_mode,r.id,JSON.parse(r.basis).reason);run('UPDATE recommendations SET status=?,teacher_id=? WHERE id=?',m[2]==='approve'?'offered':'dismissed',u.id,r.id);run('INSERT INTO recommendation_events VALUES(?,?,?,?,?)',randomUUID(),r.id,u.id,m[2],now())});return {ok:true};
    }
    return undefined;
  }
  return {handle,evidence,respond,family,expire,evaluate};
}
