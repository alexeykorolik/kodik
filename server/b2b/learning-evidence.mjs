import {randomUUID,createHash} from 'node:crypto';
export function createLearningEvidence({db,own,teacher,fail,tx,modes,adaptive,groupAllowed}){
  const get=(q,...a)=>db.prepare(q).get(...a),all=(q,...a)=>db.prepare(q).all(...a),run=(q,...a)=>db.prepare(q).run(...a),now=()=>new Date().toISOString();
  const version='pilot-transition/1';
  function family(task){
    const known=get('SELECT family FROM task_families WHERE task_id=?',task.id);if(known)return known.family;
    // Copies with the same condition and tests are one exercise; versions retain the original family.
    const key=createHash('sha256').update(JSON.stringify([task.instruction?.trim(),task.tests])).digest('hex');
    run('INSERT OR IGNORE INTO task_families VALUES(?,?,?)',task.id,task.org_id,key);return key;
  }
  function evidence(u,studentId){
    const rows=all("SELECT * FROM attempts WHERE org_id=? AND user_id=? AND status='passed' ORDER BY created_at",u.org_id,studentId).filter(a=>u.role!=='teacher'||a.assignment_id&&groupAllowed(u,get('SELECT group_id FROM assignments WHERE id=?',a.assignment_id)?.group_id));
    const seen=new Set(),items=[];
    const normalized=code=>String(code||'').split('\n').map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')).join('\n');
    for(const a of rows){const task=JSON.parse(a.snapshot),f=family(task),key=f+':'+a.mode;if(seen.has(key))continue;seen.add(key);const c=adaptive.parseLearningConfig(task.learning_config);items.push({attempt_id:a.id,assignment_id:a.assignment_id,task_id:a.task_id,family:f,mode:a.mode,title:task.title,difficulty:task.difficulty,starter_unchanged:!!normalized(task.starter)&&normalized(a.code)===normalized(task.starter),skills:c.skills,created_at:a.created_at})}
    const blocks=items.filter(a=>a.mode!=='python'),python=items.filter(a=>a.mode==='python');
    const transfer=python.filter(p=>!p.starter_unchanged&&blocks.some(b=>b.family!==p.family&&b.difficulty===p.difficulty&&b.created_at<p.created_at&&b.skills.some(s=>p.skills.includes(s))));
    return {items,labels:[...(items.length?['Есть успешные решения']:[]),...(blocks.length?['Решал с блоками']:[]),...(python.length?['Есть успешные решения в Python']:[]),...(transfer.length?['Решил другое задание в Python']:[])],transfer_attempts:transfer.map(a=>a.attempt_id),limitations:'Успех не подтверждает освоение каждого навыка. Внешняя помощь не измерена. Копии и повторные прохождения одного семейства не добавляют новых оснований.'};
  }
  function expire(){for(const r of all("SELECT * FROM recommendations WHERE status IN ('proposed','offered') AND expires_at<?",now())){const event=get("SELECT reason FROM mode_events WHERE assignment_id=? AND user_id=? AND kind='offered' ORDER BY created_at DESC LIMIT 1",r.assignment_id,r.user_id);if(r.status==='offered'&&event?.reason.includes(r.id))run('UPDATE assignment_mode_state SET offered_mode=NULL,revision=revision+1 WHERE assignment_id=? AND user_id=? AND offered_mode=?',r.assignment_id,r.user_id,r.target_mode);run("UPDATE recommendations SET status='expired' WHERE id=?",r.id)}}
  function propose(a,student,u){
    const e=modes.effectiveFor(a,student),current=e.eff.current;
    if(e.eff.switching==='locked')return;
    const target=current==='blocks'?'mixed':current==='mixed'?'python':null;if(!target||!e.eff.allowed.includes(target))return;
    if(get("SELECT 1 FROM recommendations WHERE user_id=? AND status IN ('proposed','offered')",student))return;
    const proof=evidence(u,student),success=proof.items.filter(p=>p.mode===current);
    if(success.length<2)return;
    const id=randomUUID(),basis={attempts:success.map(s=>s.attempt_id),families:success.map(s=>s.family),reason:`Есть успешные решения ${success.length} разных семейств в режиме «${current==='blocks'?'Блоки':'Блоки + Python'}». Предложить следующий способ без автоматического перехода.`};
    run("INSERT OR IGNORE INTO recommendations VALUES(?,?,?,?,?,?,?,'proposed',?,?,NULL)",id,u.org_id,a.id,student,target,version,JSON.stringify(basis),new Date(Date.now()+7*86400000).toISOString(),now());
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
    if(path==='/api/recommendations'&&method==='GET'){
      expire();if(u.role!=='student'){
        teacher(u);const assignments=all('SELECT * FROM assignments WHERE org_id=? AND archived=0',u.org_id).filter(a=>groupAllowed(u,a.group_id));
        for(const a of assignments)for(const student of all("SELECT u.id FROM users u JOIN group_members gm ON gm.user_id=u.id WHERE gm.group_id=? AND u.active=1 AND u.role='student'",a.group_id))propose(a,student.id,u);
      }
      return {items:all('SELECT r.*,u.name student_name FROM recommendations r JOIN users u ON u.id=r.user_id WHERE r.org_id=? ORDER BY r.created_at DESC LIMIT 200',u.org_id).filter(r=>u.role==='student'?r.user_id===u.id:groupAllowed(u,get('SELECT group_id FROM assignments WHERE id=?',r.assignment_id)?.group_id)).map(r=>{const {families,...basis}=JSON.parse(r.basis);return {...r,basis:u.role==='student'?basis:{...basis,families}}})};
    }
    if((m=/^\/api\/recommendations\/([^/]+)\/(approve|dismiss)$/.exec(path))&&method==='POST'){
      teacher(u);expire();const r=own('recommendations',m[1],u),a=own('assignments',r.assignment_id,u);
      if(r.status===(m[2]==='approve'?'offered':'dismissed'))return {ok:true};if(r.status!=='proposed')fail(409,'Рекомендация уже обработана или истекла.');
      const effective=modes.effectiveFor(a,r.user_id).eff;if(a.archived||effective.switching==='locked'||!effective.allowed.includes(r.target_mode)||effective.current===r.target_mode)fail(409,'Настройки задания изменились. Рекомендация больше не подходит.');
      tx(()=>{if(m[2]==='approve')modes.offerRecommendation(a,r.user_id,u,r.target_mode,r.id,JSON.parse(r.basis).reason);run('UPDATE recommendations SET status=?,teacher_id=? WHERE id=?',m[2]==='approve'?'offered':'dismissed',u.id,r.id);run('INSERT INTO recommendation_events VALUES(?,?,?,?,?)',randomUUID(),r.id,u.id,m[2],now())});return {ok:true};
    }
    return undefined;
  }
  return {handle,evidence,respond,family,expire};
}
