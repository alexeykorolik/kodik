import {randomUUID,createHash} from 'node:crypto';
/**
 * Learning conclusions and mode recommendations (docs/adaptive/RECOMMENDATION_RULES.md).
 * A passed check stays a passed check. Whether it may support a learning conclusion is decided
 * separately: an untouched (or only re-commented / re-arranged) start never does.
 */
export const RULE_VERSION='pilot-transition/2';
export const RULES={freshDays:21,minFamilies:2,recentFailures:2};
const GRADED=['passed','failed','runtime_error'];
const ACTIVE=['proposed','offered'],NEXT={blocks:'mixed',mixed:'python'},PREVIOUS={mixed:'blocks',python:'mixed'};
const CLOSED_TEXT={expired:'Срок предложения истёк.',dismissed:'Предложение уже отклонено преподавателем.',accepted:'Ученик уже принял предложение.',declined:'Ученик уже отказался от предложения.',replaced:'Преподаватель уже принял собственное решение.',withdrawn:'Предложение уже снято.'};
export function createLearningEvidence({db,own,teacher,fail,tx,modes,adaptive,groupAllowed}){
  const get=(q,...a)=>db.prepare(q).get(...a),all=(q,...a)=>db.prepare(q).all(...a),run=(q,...a)=>db.prepare(q).run(...a),now=()=>new Date().toISOString();
  // Closing a recommendation, removing its invitation and writing its event are one change.
  const atomic=fn=>db.isTransaction?fn():tx(fn);
  /** Why this assignment is no longer a place for a transition (group, programme, lesson, membership), or null. */
  function contextReason(a,student){
    if(!a||a.archived)return 'Назначение закрыто.';
    if(get('SELECT archived FROM groups_ WHERE id=?',a.group_id)?.archived)return 'Группа в архиве: новые учебные действия недоступны.';
    if(!get('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?',a.group_id,student))return 'Ученик больше не в группе этого назначения.';
    if(a.run_id&&get('SELECT archived FROM teaching_runs WHERE id=?',a.run_id)?.archived)return 'Прохождение программы архивировано.';
    const lessonRun=a.lesson_run_id?get('SELECT state FROM lesson_runs WHERE id=?',a.lesson_run_id):null;
    if(lessonRun&&lessonRun.state!=='open')return lessonRun.state==='closed'?'Занятие этого задания закрыто.':'Занятие этого задания ещё не открыто.';
    return null;
  }
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
    const context=contextReason(a,student);
    add('context',!context,context?`${context} Предлагать переход в нём сейчас бесполезно.`:'Назначение доступно ученику.');
    const done=get("SELECT 1 FROM attempts WHERE assignment_id=? AND user_id=? AND status='passed'",a.id,student);
    add('not_finished',!done,done?'Это задание уже выполнено — переход в нём не нужен.':'Задание ещё не выполнено.');
    add('policy',!!target&&e.eff.switching!=='locked'&&e.eff.allowed.includes(target),!target?'Ученик уже в самом самостоятельном режиме.':e.eff.switching==='locked'?'Режим закреплён преподавателем.':e.eff.allowed.includes(target)?`Режим «${adaptive.MODE_LABEL[target]}» разрешён в этом назначении.`:`Режим «${adaptive.MODE_LABEL[target]}» не разрешён в этом назначении.`);
    add('no_open_offer',!e.eff.offered||!!(e.eff.offered===target&&e.state?.offer_recommendation_id),e.eff.offered&&!e.state?.offer_recommendation_id?`Преподаватель уже сам открыл переход в режим «${adaptive.MODE_LABEL[e.eff.offered]}» — второе предложение не нужно.`:'Других открытых приглашений нет.');
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
  /**
   * Close an active recommendation once: its status and reason, the invitation it made (never a teacher's
   * own one) and one history event change together. A repeat changes nothing and returns false.
   */
  function close(r,status,reason,actor){return atomic(()=>{
    const changed=run(`UPDATE recommendations SET status=?,reason=?,closed_at=?,teacher_id=COALESCE(?,teacher_id) WHERE id=? AND status IN ('proposed','offered')`,status,reason,now(),actor,r.id).changes;if(!changed)return false;
    const a=get('SELECT * FROM assignments WHERE id=?',r.assignment_id);
    if(a)modes.withdrawOffer(a,r.user_id,actor||r.teacher_id||r.user_id,`Предложение системы закрыто: ${reason}`,r.id);
    run('INSERT INTO recommendation_events(id,recommendation_id,actor_id,kind,created_at,reason) VALUES(?,?,?,?,?,?)',randomUUID(),r.id,actor||r.user_id,status,now(),reason);return true;
  })}
  function expire(){for(const r of all("SELECT * FROM recommendations WHERE status IN ('proposed','offered') AND expires_at<?",now()))close(r,'expired','Срок предложения истёк.',null)}
  /**
   * Why an active recommendation (proposed or already sent) can no longer stand, or null. The same rules
   * apply before and after sending: a transition that is no longer allowed or meaningful is closed.
   */
  function invalidReason(r){
    const a=get('SELECT * FROM assignments WHERE id=?',r.assignment_id),context=contextReason(a,r.user_id);if(context)return {status:'withdrawn',reason:context};
    const {eff,state}=modes.effectiveFor(a,r.user_id),label=m=>adaptive.MODE_LABEL[m];
    if(r.status==='offered'&&state?.offer_recommendation_id!==r.id)return {status:'replaced',reason:'Приглашение этой рекомендации заменено решением преподавателя.'};
    if(r.status==='proposed'&&eff.offered&&!state?.offer_recommendation_id)return {status:'replaced',reason:`Преподаватель уже сам открыл переход в режим «${label(eff.offered)}».`};
    if(eff.current===r.target_mode)return {status:'withdrawn',reason:`Ученик уже работает в режиме «${label(r.target_mode)}».`};
    if(NEXT[eff.current]!==r.target_mode)return {status:'withdrawn',reason:`Режим ученика изменился: сейчас «${label(eff.current)}», переход в «${label(r.target_mode)}» уже не следующий шаг.`};
    if(eff.switching==='locked')return {status:'withdrawn',reason:'Преподаватель закрепил режим ученика.'};
    if(!eff.allowed.includes(r.target_mode))return {status:'withdrawn',reason:`Режим «${label(r.target_mode)}» больше не разрешён в этом назначении.`};
    if(get("SELECT 1 FROM attempts WHERE assignment_id=? AND user_id=? AND status='passed'",a.id,r.user_id))return {status:'withdrawn',reason:'Задание уже выполнено — переход в нём не нужен.'};
    return null;
  }
  /** Bring active recommendations (of the school, or of one assignment / learner) in line with the current state. */
  function reconcile(orgId,scope={}){
    expire();const where=["org_id=?","status IN ('proposed','offered')"],args=[orgId];
    if(scope.assignment_id){where.push('assignment_id=?');args.push(scope.assignment_id)}
    if(scope.user_id){where.push('user_id=?');args.push(scope.user_id)}
    for(const r of all(`SELECT * FROM recommendations WHERE ${where.join(' AND ')}`,...args)){const why=invalidReason(r);if(why)close(r,why.status,why.reason,null)}
  }
  /** A teacher's own offer or choice of mode supersedes the learner's active recommendations in this assignment. */
  function replace(a,student,actor,reason){for(const r of all("SELECT * FROM recommendations WHERE assignment_id=? AND user_id=? AND status IN ('proposed','offered')",a.id,student))close(r,'replaced',reason,actor)}
  function propose(a,student,u){
    if(get("SELECT 1 FROM recommendations WHERE user_id=? AND status IN ('proposed','offered')",student))return;
    const r=evaluate(a,student,u);if(!r.ok)return;
    run("INSERT OR IGNORE INTO recommendations(id,org_id,assignment_id,user_id,target_mode,rule_version,basis,status,expires_at,created_at,teacher_id) VALUES(?,?,?,?,?,?,?,'proposed',?,?,NULL)",randomUUID(),u.org_id,a.id,student,r.target,RULE_VERSION,JSON.stringify(r.basis),new Date(Date.now()+7*86400000).toISOString(),now());
  }
  /** The learner answered the invitation of recommendation `linked` (a teacher's own offer has none). */
  function respond(assignmentId,userId,mode,declined,linked){
    if(!linked)return;const rec=get("SELECT * FROM recommendations WHERE id=? AND assignment_id=? AND user_id=? AND target_mode=? AND status='offered'",linked,assignmentId,userId,mode);if(!rec)return;
    const status=declined?'declined':'accepted';run('UPDATE recommendations SET status=?,closed_at=? WHERE id=?',status,now(),rec.id);run('INSERT INTO recommendation_events(id,recommendation_id,actor_id,kind,created_at) VALUES(?,?,?,?,?)',randomUUID(),rec.id,userId,status,now());
    return rec.id;
  }
  /**
   * Recommendations visible to this user, filtered by access BEFORE any limit: a teacher sees the groups
   * they teach, an administrator the school, a learner only their own. Live offers and closed history are
   * separate lists, each with its true total and its own page; the order is stable (time, then id).
   */
  function lists(u,params){
    const where=['r.org_id=?'],args=[u.org_id];
    if(u.role==='student'){where.push('r.user_id=?');args.push(u.id)}
    else if(u.role==='teacher'){where.push('EXISTS(SELECT 1 FROM group_teachers gt WHERE gt.user_id=? AND gt.group_id=a.group_id)');args.push(u.id)}
    for(const [key,column] of [['assignment_id','r.assignment_id'],['user_id','r.user_id']]){const v=params.get(key);if(v){where.push(column+'=?');args.push(v)}}
    const page=(prefix,size)=>({limit:Math.min(100,Math.max(1,Math.floor(Number(params.get(prefix+'limit'))||size))),offset:Math.min(1000000,Math.max(0,Math.floor(Number(params.get(prefix+'offset'))||0)))});
    const from=`FROM recommendations r JOIN users u ON u.id=r.user_id JOIN assignments a ON a.id=r.assignment_id JOIN groups_ g ON g.id=a.group_id LEFT JOIN task_versions tv ON tv.id=a.version_id LEFT JOIN lesson_runs l ON l.id=a.lesson_run_id LEFT JOIN lesson_versions lv ON lv.id=l.version_id WHERE ${where.join(' AND ')}`;
    const fields="r.*,u.name student_name,a.group_id,g.title group_title,g.archived group_archived,json_extract(tv.snapshot,'$.title') task_title,tv.revision version_revision,a.created_at assigned_at,a.due_at,a.lesson_run_id,a.step_id,lv.snapshot lesson_snapshot";
    const shape=row=>{const {lesson_snapshot,basis,...r}=row,{families,checks,...open}=JSON.parse(basis);let lesson_title=null,step_title=null;if(lesson_snapshot){const l=JSON.parse(lesson_snapshot);lesson_title=l.title??null;step_title=(l.steps||[]).find(x=>x.id===r.step_id)?.title??null}
      return {...r,from_mode:PREVIOUS[r.target_mode]??null,lesson_title,step_title,group_archived:!!r.group_archived,basis:u.role==='student'?open:{...open,families,checks}}};
    const live=page('active_',50),closed=page('',20),active="r.status IN ('proposed','offered')";
    return {
      active:{items:all(`SELECT ${fields} ${from} AND ${active} ORDER BY r.created_at,r.id LIMIT ? OFFSET ?`,...args,live.limit,live.offset).map(shape),total:get(`SELECT COUNT(*) n ${from} AND ${active}`,...args).n,...live},
      history:{items:all(`SELECT ${fields} ${from} AND NOT ${active} ORDER BY COALESCE(r.closed_at,r.created_at) DESC,r.id DESC LIMIT ? OFFSET ?`,...args,closed.limit,closed.offset).map(shape),total:get(`SELECT COUNT(*) n ${from} AND NOT ${active}`,...args).n,...closed},
    };
  }
  async function handle(path,method,b,u,req){let m;
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
      if(u.role==='student')atomic(()=>reconcile(u.org_id,{user_id:u.id}));
      else{
        teacher(u);atomic(()=>reconcile(u.org_id));
        const assignments=all('SELECT a.* FROM assignments a JOIN groups_ g ON g.id=a.group_id WHERE a.org_id=? AND a.archived=0 AND g.archived=0',u.org_id).filter(a=>groupAllowed(u,a.group_id));
        for(const a of assignments)for(const student of all("SELECT u.id FROM users u JOIN group_members gm ON gm.user_id=u.id WHERE gm.group_id=? AND u.active=1 AND u.role='student'",a.group_id))propose(a,student.id,u);
      }
      return lists(u,new URL(req?.url||'/','http://localhost').searchParams);
    }
    if((m=/^\/api\/recommendations\/([^/]+)\/(approve|dismiss)$/.exec(path))&&method==='POST'){
      teacher(u);const r0=own('recommendations',m[1],u);own('assignments',r0.assignment_id,u);atomic(()=>reconcile(u.org_id,{assignment_id:r0.assignment_id,user_id:r0.user_id}));
      const r=get('SELECT * FROM recommendations WHERE id=?',r0.id),a=get('SELECT * FROM assignments WHERE id=?',r.assignment_id);
      const why=r.reason||CLOSED_TEXT[r.status]||'Предложение уже обработано.';
      if(m[2]==='dismiss'){
        // Removing a proposal is always possible, whatever the settings are now; a repeat changes nothing.
        if(r.status==='proposed'){close(r,'dismissed','Преподаватель отклонил предложение.',u.id);return {ok:true,status:'dismissed'}}
        if(r.status==='offered'){close(r,'withdrawn','Преподаватель отозвал предложение.',u.id);return {ok:true,status:'withdrawn'}}
        return {ok:true,status:r.status,reason:why};
      }
      if(r.status==='offered')return {ok:true,status:'offered'};
      if(r.status!=='proposed')fail(409,`Предложение уже не действует: ${why} Если переход нужен, разрешите его вручную в карточке ученика («Разрешить переход»).`,{code:'recommendation_closed',status:r.status,reason:why});
      // The teacher confirms today's grounds, not the ones from when the proposal was made.
      const fresh=evaluate(a,r.user_id,u);
      if(!fresh.ok||fresh.target!==r.target_mode){
        const reason='Основания изменились: '+(fresh.checks.filter(c=>!c.ok).map(c=>c.detail).join(' ')||'следующий режим уже другой.');
        close(r,'withdrawn',reason,u.id);
        fail(409,`${reason} Предложение снято. Если переход всё же нужен, разрешите его вручную в карточке ученика («Разрешить переход»).`,{code:'recommendation_stale',status:'withdrawn',reason,checks:fresh.checks});
      }
      tx(()=>{if(!run("UPDATE recommendations SET status='offered',teacher_id=? WHERE id=? AND status='proposed'",u.id,r.id).changes)return;modes.offerRecommendation(a,r.user_id,u,r.target_mode,r.id,JSON.parse(r.basis).reason);run('INSERT INTO recommendation_events(id,recommendation_id,actor_id,kind,created_at,reason) VALUES(?,?,?,?,?,?)',randomUUID(),r.id,u.id,'approve',now(),null)});return {ok:true,status:'offered'};
    }
    return undefined;
  }
  return {handle,evidence,respond,family,expire,reconcile,replace,evaluate};
}
