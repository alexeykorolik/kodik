import {randomUUID,randomBytes,createHash} from 'node:crypto';
const now=()=>new Date().toISOString();
const stages=['new','demo','pilot','agreement','active','paused','lost'];
export function createPilot({db,fail,tx,own,teacher,admin,passwordHash,passwordText,publicUser,makeSession,availableTask,curriculum,modes,adaptive}){
  const get=(q,...a)=>db.prepare(q).get(...a),all=(q,...a)=>db.prepare(q).all(...a),run=(q,...a)=>db.prepare(q).run(...a);
  const field=(v,label,max=200,optional=false)=>{if(optional&&(v===undefined||v===null))return '';if(typeof v!=='string'||v.length>max||(!optional&&!v.trim()))fail(400,`${label}: до ${max} символов.`);return v.trim()};
  const date=v=>{if(!v)return null;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))fail(400,'Проверьте дату.');return new Date(v).toISOString()};
  const audit=(u,action,id,details={},org=u.org_id)=>run('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',randomUUID(),org,u.id,action,id,JSON.stringify(details),now());
  function groupAllowed(u,id){return u.role!=='teacher'||!!get('SELECT 1 FROM group_teachers WHERE group_id=? AND user_id=?',id,u.id)}
  function groupManager(u,id){if(u.role==='teacher'&&get('SELECT kind FROM group_teachers WHERE group_id=? AND user_id=?',id,u.id)?.kind!=='primary')fail(403,'Состав и назначения группы меняет основной преподаватель или администратор.')}
  function userAllowed(u,id){return u.role!=='teacher'||id===u.id||!!get('SELECT 1 FROM users u WHERE u.id=? AND u.created_by=? AND NOT EXISTS(SELECT 1 FROM group_members gm WHERE gm.user_id=u.id)',id,u.id)||!!get('SELECT 1 FROM group_members gm JOIN group_teachers gt ON gt.group_id=gm.group_id WHERE gm.user_id=? AND gt.user_id=?',id,u.id)}
  function assertScope(table,row,u){
    if(u.role!=='teacher')return;
    let group=row.group_id;
    if(table==='groups_')group=row.id;
    if(table==='lesson_runs')group=get('SELECT group_id FROM teaching_runs WHERE id=?',row.run_id)?.group_id;
    if(['attempts','submission_jobs'].includes(table)&&row.assignment_id)group=get('SELECT group_id FROM assignments WHERE id=?',row.assignment_id)?.group_id;
    if((group&&!groupAllowed(u,group))||(table==='users'&&!userAllowed(u,row.id))||(['attempts','submission_jobs'].includes(table)&&!group&&!userAllowed(u,row.user_id)))fail(404,'Объект не найден.');
  }
  function license(org){const l=get('SELECT * FROM licenses WHERE org_id=? ORDER BY revision DESC LIMIT 1',org);const used=get("SELECT COUNT(*) n FROM users WHERE org_id=? AND role='student' AND active=1",org).n;return {...l,used,valid:!!l&&l.status!=='suspended'&&(!l.expires_at||Date.parse(l.expires_at)>Date.now())}}
  function checkLicense(u){if(u.platform_owner)return;const l=license(u.org_id);if(!l.valid)fail(403,'Лицензия школы приостановлена или истекла. История и черновики сохранены. Попросите администратора связаться с владельцем.',{code:'license_expired'})}
  function seats(u,extra=1){checkLicense(u);const l=license(u.org_id);if(l.used+extra>l.student_limit)fail(409,`Лимит учеников: ${l.student_limit}. Освободите место или продлите лицензию.`,{code:'seat_limit'})}
  function scopeState(s,u){
    s.license=license(u.org_id);
    if(u.role==='admin')s.group_teachers=all('SELECT gt.* FROM group_teachers gt JOIN groups_ g ON g.id=gt.group_id WHERE g.org_id=?',u.org_id);
    if(u.role==='teacher'){
      s.groups=s.groups.filter(g=>groupAllowed(u,g.id));const ids=new Set(s.groups.map(g=>g.id));
      s.members=s.members.filter(m=>ids.has(m.group_id));s.assignments=s.assignments.filter(a=>ids.has(a.group_id));
      s.users=s.users.filter(v=>userAllowed(u,v.id));
      s.attempts=s.attempts.filter(a=>a.assignment_id?groupAllowed(u,get('SELECT group_id FROM assignments WHERE id=?',a.assignment_id)?.group_id):userAllowed(u,a.user_id));
    }
    return s;
  }
  function replay(u,key,kind,payload){if(typeof key!=='string'||!/^[\w-]{10,100}$/.test(key))fail(400,'Обновите страницу и повторите действие.');const old=get('SELECT * FROM pilot_operations WHERE org_id=? AND request_key=?',u.org_id,key);if(old){if(old.actor_id!==u.id||old.kind!==kind||old.payload!==JSON.stringify(payload))fail(409,'Этот запрос уже использован с другими данными.');return {...JSON.parse(old.response),replayed:true}}}
  const remember=(u,key,kind,payload,response)=>run('INSERT INTO pilot_operations VALUES(?,?,?,?,?,?,?)',u.org_id,key,u.id,kind,JSON.stringify(payload),JSON.stringify(response),now());
  function reportRows(u,params){
    teacher(u);const group=params.get('group_id');if(group)own('groups_',group,u);
    const limit=Math.min(100,Math.max(1,Math.floor(Number(params.get('limit'))||30))),offset=Math.min(1000000,Math.max(0,Math.floor(Number(params.get('offset'))||0))),status=params.get('status'),mode=params.get('mode');
    const q=["a.org_id=?"],args=[u.org_id];
    if(u.role==='teacher'){q.push('EXISTS(SELECT 1 FROM assignments x JOIN group_teachers gt ON gt.group_id=x.group_id WHERE x.id=a.assignment_id AND gt.user_id=?)');args.push(u.id)}
    if(group){q.push('x.group_id=?');args.push(group)}
    if(status){if(!['passed','failed','runtime_error','pending_review','checker_error'].includes(status))fail(400,'Неизвестный результат.');q.push('a.status=?');args.push(status)}
    if(mode){if(!adaptive.isMode(mode))fail(400,'Неизвестный режим.');q.push('a.mode=?');args.push(mode)}
    const from=`FROM attempts a LEFT JOIN assignments x ON x.id=a.assignment_id JOIN users u ON u.id=a.user_id WHERE ${q.join(' AND ')}`;
    return {total:get('SELECT COUNT(*) n '+from,...args).n,limit,offset,items:all(`SELECT a.id,a.user_id,u.name,a.assignment_id,a.version_id,a.status,a.mode,a.feedback,a.review_revision,a.created_at,json_extract(a.snapshot,'$.title') title,json_extract(a.snapshot,'$.revision') version_revision ${from} ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?`,...args,limit,offset)};
  }
  async function handle(path,method,b,u,req,res){let m;
    if(path.startsWith('/api/owner/')){
      if(!u.platform_owner)fail(403,'Доступно владельцу платформы.');
      if(path==='/api/owner/companies'&&method==='GET')return {items:all('SELECT c.* FROM companies c WHERE c.org_id IS NULL OR NOT EXISTS(SELECT 1 FROM users u WHERE u.org_id=c.org_id AND u.platform_owner=1) ORDER BY c.created_at DESC').map(c=>({...c,license:c.org_id?license(c.org_id):null})),stages};
      if(path==='/api/owner/companies'&&method==='POST'){
        const id=randomUUID(),name=field(b.name,'Компания');run('INSERT INTO companies(id,name,created_at) VALUES(?,?,?)',id,name,now());audit(u,'company.created',id);return {id};
      }
      if((m=/^\/api\/owner\/companies\/([^/]+)$/.exec(path))&&method==='PUT'){
        const c=get('SELECT * FROM companies WHERE id=?',m[1]);if(!c)fail(404,'Компания не найдена.');if(c.revision!==b.revision)fail(409,'Карточку уже изменили. Обновите данные.');
        if(!stages.includes(b.stage))fail(400,'Выберите этап.');const values=[field(b.name,'Компания'),field(b.contact_name,'Контактное лицо',200,true),field(b.contact,'Деловой контакт',500,true),field(b.source,'Источник',500,true),field(b.responsible,'Ответственный',200,true),b.stage,field(b.notes,'Заметки',8000,true),field(b.next_action,'Следующее действие',500,true),date(b.next_at)];
        tx(()=>{run('UPDATE companies SET name=?,contact_name=?,contact=?,source=?,responsible=?,stage=?,notes=?,next_action=?,next_at=?,revision=revision+1 WHERE id=?',...values,c.id);audit(u,'company.updated',c.id,{before:c,after:values})});return {ok:true};
      }
      if((m=/^\/api\/owner\/companies\/([^/]+)\/connect$/.exec(path))&&method==='POST'){
        const c=get('SELECT * FROM companies WHERE id=?',m[1]);if(!c)fail(404,'Компания не найдена.');const payload={company_id:c.id,name:b.name,login:b.login};const old=replay(u,b.request_key,'connect',payload);if(old)return old;
        if(c.org_id)fail(409,'Школа уже подключена.');const name=field(b.name,'Администратор'),login=field(b.login,'Логин',120).toLowerCase(),password=await passwordHash(passwordText(b.password));
        const replayed=replay(u,b.request_key,'connect',payload);if(replayed)return replayed;
        if(get('SELECT org_id FROM companies WHERE id=?',c.id)?.org_id)fail(409,'Школа уже подключена.');
        if(get('SELECT 1 FROM users WHERE login=?',login))fail(409,'Логин занят.');const org=randomUUID(),id=randomUUID(),recovery=randomBytes(24).toString('hex');const response={org_id:org,admin_id:id};
        tx(()=>{run('INSERT INTO organizations VALUES(?,?,?)',org,c.name,now());run("INSERT INTO users(id,org_id,name,login,password,role,recovery,created_at) VALUES(?,?,?,?,?,'admin',?,?)",id,org,name,login,password,createHash('sha256').update(recovery).digest('hex'),now());run('UPDATE companies SET org_id=?,revision=revision+1 WHERE id=?',org,c.id);run("INSERT INTO licenses VALUES(?,?,1,0,NULL,'suspended',?,?)",randomUUID(),org,u.id,now());remember(u,b.request_key,'connect',payload,response);audit(u,'school.connected',org,{company_id:c.id},org)});return {...response,recovery};
      }
      if((m=/^\/api\/owner\/schools\/([^/]+)\/licenses$/.exec(path))){
        const org=get('SELECT * FROM organizations WHERE id=?',m[1]);if(!org)fail(404,'Школа не найдена.');
        if(method==='GET')return {current:license(org.id),items:all('SELECT * FROM licenses WHERE org_id=? ORDER BY revision DESC',org.id)};
        if(method==='POST'){
          const current=license(org.id);if(b.revision!==current.revision)fail(409,'Лицензия уже изменена. Обновите данные.');if(!Number.isInteger(b.student_limit)||b.student_limit<0||b.student_limit>10000||!['active','suspended'].includes(b.status))fail(400,'Укажите лимит учеников и состояние.');
          const expires=date(b.expires_at);if(b.status==='active'&&!expires)fail(400,'Укажите срок лицензии.');
          tx(()=>{run('INSERT INTO licenses VALUES(?,?,?,?,?,?,?,?)',randomUUID(),org.id,current.revision+1,b.student_limit,expires,b.status,u.id,now());audit(u,'license.changed',org.id,{before:current,after:b},org.id)});return {current:license(org.id)};
        }
      }
      if((m=/^\/api\/owner\/companies\/([^/]+)\/history$/.exec(path))&&method==='GET'){const c=get('SELECT * FROM companies WHERE id=?',m[1]);if(!c)fail(404,'Компания не найдена.');return {items:all("SELECT actor_id,action,details,created_at FROM audit_log WHERE target_id=? OR (org_id=? AND action IN ('license.changed','school.connected')) ORDER BY created_at DESC LIMIT 100",c.id,c.org_id)}}
      fail(404,'Раздел владельца не найден.');
    }
    if(path==='/api/school/license'&&method==='GET'){admin(u);return license(u.org_id)}
    if((m=/^\/api\/groups\/([^/]+)\/teachers$/.exec(path))&&method==='PUT'){
      admin(u);own('groups_',m[1],u);if(!Array.isArray(b.items)||b.items.length>20||b.items.some(i=>!i||typeof i!=='object'||typeof i.user_id!=='string')||new Set(b.items.map(i=>i.user_id)).size!==b.items.length||b.items.filter(i=>i.kind==='primary').length>1)fail(400,'Назначьте одного основного преподавателя и до 19 совместных.');
      for(const item of b.items){const t=own('users',item.user_id,u);if(t.role!=='teacher'||!['primary','co'].includes(item.kind))fail(400,'Выберите преподавателя и его полномочия.')}
      tx(()=>{run('DELETE FROM group_teachers WHERE group_id=?',m[1]);for(const i of b.items)run('INSERT INTO group_teachers VALUES(?,?,?)',m[1],i.user_id,i.kind);audit(u,'group.teachers_changed',m[1],b)});return {ok:true};
    }
    if((m=/^\/api\/groups\/([^/]+)\/archive$/.exec(path))&&method==='POST'){admin(u);own('groups_',m[1],u);if(typeof b.archived!=='boolean')fail(400,'Укажите состояние.');tx(()=>{run('UPDATE groups_ SET archived=? WHERE id=?',Number(b.archived),m[1]);audit(u,'group.archived',m[1],b)});return {ok:true}}
    if((m=/^\/api\/groups\/([^/]+)\/import(?:\/(preview))?$/.exec(path))&&method==='POST'){
      admin(u);const g=own('groups_',m[1],u);if(g.archived)fail(409,'Группа архивирована.');
      const rows=b.rows;if(!Array.isArray(rows)||!rows.length||rows.length>100||rows.some(r=>!r||typeof r!=='object'))fail(400,'Список: от 1 до 100 учеников.');
      const seen=new Set(),items=rows.map((r,i)=>{const name=field(r.name,'Имя'),login=field(r.login,'Логин',120).toLowerCase(),existing=get('SELECT id,org_id,role FROM users WHERE login=?',login);let error=seen.has(login)?'Повтор логина в списке':existing?'Логин уже занят':'';seen.add(login);return {row:i+1,name,login,error}});
      const fingerprint=createHash('sha256').update(JSON.stringify({group:g.id,revision:items})).digest('hex');
      if(m[2])return {items,preview_hash:fingerprint,can_import:!items.some(i=>i.error)};
      const payload={group:g.id,rows};const old=replay(u,b.request_key,'class_import',payload);if(old)return old;
      if(items.some(i=>i.error)||b.preview_hash!==fingerprint)fail(409,'Список изменился или содержит ошибки. Повторите предпросмотр.');seats(u,items.length);
      const credentials=[];for(const item of items){const password=`K-${randomUUID().slice(0,18)}`;credentials.push({...item,id:randomUUID(),password,hash:await passwordHash(password)})}
      const response={count:credentials.length,credentials:credentials.map(({hash,error,row,...c})=>c)};
      // Passwords are returned once; retries identify the completed operation without storing secrets.
      const replayed=replay(u,b.request_key,'class_import',payload);if(replayed)return replayed;
      tx(()=>{seats(u,credentials.length);for(const c of credentials){if(get('SELECT 1 FROM users WHERE login=?',c.login))fail(409,'Один из логинов уже занят. Повторите предпросмотр.');run("INSERT INTO users(id,org_id,name,login,password,role,created_at,created_by) VALUES(?,?,?,?,?,'student',?,?)",c.id,u.org_id,c.name,c.login,c.hash,now(),u.id);run('INSERT INTO group_members VALUES(?,?)',g.id,c.id)}remember(u,b.request_key,'class_import',payload,{count:response.count,credentials:[],credentials_already_issued:true});audit(u,'class.imported',g.id,{count:response.count})});return response;
    }
    if(path==='/api/help'&&method==='POST'){
      if(u.role!=='student')fail(403,'Помощь запрашивает ученик.');let assignment=null,lesson=null,step=null;
      if(b.assignment_id){assignment=own('assignments',b.assignment_id,u);availableTask(assignment.task_id,u,assignment.id);lesson=assignment.lesson_run_id;step=assignment.step_id}
      else {lesson=field(b.lesson_run_id,'Урок',100);const detail=curriculum.details(lesson,u);step=field(b.step_id,'Шаг',100);if(!detail.lesson.steps.some(s=>s.id===step))fail(404,'Шаг не найден.')}
      const message=field(b.message,'Вопрос',1000,true)||'Нужна помощь';
      const existing=assignment?get("SELECT id FROM help_requests WHERE user_id=? AND assignment_id=? AND status='open'",u.id,assignment.id):get("SELECT id FROM help_requests WHERE user_id=? AND lesson_run_id=? AND step_id=? AND status='open'",u.id,lesson,step);if(existing)return {id:existing.id};
      const id=randomUUID();run('INSERT INTO help_requests(id,org_id,user_id,assignment_id,lesson_run_id,step_id,message,created_at) VALUES(?,?,?,?,?,?,?,?)',id,u.org_id,u.id,assignment?.id??null,lesson,step,message,now());return {id};
    }
    if(path==='/api/help'&&method==='GET')return {items:all('SELECT h.*,u.name FROM help_requests h JOIN users u ON u.id=h.user_id WHERE h.org_id=? ORDER BY h.created_at DESC LIMIT 200',u.org_id).filter(h=>u.role==='student'?h.user_id===u.id:h.assignment_id?groupAllowed(u,get('SELECT group_id FROM assignments WHERE id=?',h.assignment_id)?.group_id):groupAllowed(u,get('SELECT t.group_id FROM lesson_runs l JOIN teaching_runs t ON t.id=l.run_id WHERE l.id=?',h.lesson_run_id)?.group_id))};
    if((m=/^\/api\/help\/([^/]+)$/.exec(path))&&method==='PUT'){teacher(u);const h=own('help_requests',m[1],u);if(h.assignment_id)own('assignments',h.assignment_id,u);else own('lesson_runs',h.lesson_run_id,u);if(h.status!=='open')return {ok:true};run("UPDATE help_requests SET status='resolved',answer=?,resolved_at=?,resolved_by=? WHERE id=?",field(b.answer,'Ответ',2000,true),now(),u.id,h.id);audit(u,'help.resolved',h.id);return {ok:true}}
    if((m=/^\/api\/attempts\/([^/]+)\/review$/.exec(path))&&method==='POST'){
      teacher(u);const a=own('attempts',m[1],u);if(JSON.parse(a.snapshot).check_mode!=='manual')fail(400,'Автоматическая проверка не пересматривается.');if((b.revision??0)!==a.review_revision)fail(409,'Другой преподаватель уже оценил работу. Откройте её заново.',{revision:a.review_revision});
      if(!['passed','failed'].includes(b.status))fail(400,'Выберите результат.');const feedback=field(b.feedback,'Комментарий',4000,true);if(b.status==='failed'&&!feedback)fail(400,'Объясните, что нужно исправить.');
      tx(()=>{run('INSERT INTO review_history VALUES(?,?,?,?,?,?,?,?,?,?)',randomUUID(),u.org_id,a.id,u.id,a.review_revision+1,a.status,b.status,a.feedback,feedback,now());run('UPDATE attempts SET status=?,feedback=?,review_revision=review_revision+1,result=? WHERE id=?',b.status,feedback,JSON.stringify({status:b.status,message:feedback||(b.status==='passed'?'Преподаватель принял решение.':'Нужны исправления.'),cases:[]}),a.id);audit(u,'attempt.reviewed',a.id,{revision:a.review_revision+1,status:b.status})});return {ok:true,revision:a.review_revision+1};
    }
    if((m=/^\/api\/attempts\/([^/]+)\/reviews$/.exec(path))&&method==='GET'){const a=own('attempts',m[1],u);if(u.role==='student'&&a.user_id!==u.id)fail(404,'Работа не найдена.');return {items:all('SELECT h.*,u.name actor_name FROM review_history h JOIN users u ON u.id=h.actor_id WHERE h.attempt_id=? ORDER BY h.revision',a.id)}}
    if(path==='/api/reports'&&method==='GET'){return reportRows(u,new URL(req.url,'http://localhost').searchParams)}
    return undefined;
  }
  return {handle,license,checkLicense,seats,assertScope,groupAllowed,userAllowed,scopeState,audit,groupManager};
}
