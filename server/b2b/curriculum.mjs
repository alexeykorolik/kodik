import {randomUUID,createHash} from 'node:crypto';
const now=()=>new Date().toISOString();
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const kinds=new Set(['text','code','practice','question','final','summary']);
const practical=s=>s.type==='practice'||s.type==='final';
export function createCurriculum({db,own,teacher,fail,tx,safeTask,assertPublishedVersion,modePolicyFor,modesFor,groupManager}){
  const get=(sql,...args)=>db.prepare(sql).get(...args),all=(sql,...args)=>db.prepare(sql).all(...args),run=(sql,...args)=>db.prepare(sql).run(...args);
  const audit=(u,action,id,details={})=>run('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',randomUUID(),u.org_id,u.id,action,id,JSON.stringify(details),now());
  const field=(value,label,max=12000)=>{if(typeof value!=='string'||value.length>max)fail(400,`${label}: не более ${max} символов.`);return value};
  const parseLesson=l=>({...l,steps:JSON.parse(l.steps)});
  const publicStep=s=>({id:s.id,type:s.type,title:s.title,body:s.body,...(s.type==='code'?{code:s.code}:{}),...(s.type==='question'?{choices:s.choices}:{}),...(practical(s)?{task_id:s.task_id,task_version_id:s.task_version_id}:{})});
  const publicLesson=l=>({id:l.id,title:l.title,goal:l.goal,description:l.description,duration:l.duration,revision:l.revision,steps:l.steps.map(publicStep)});
  function validateLesson(b,u,publication=false){
    const value={title:field(b.title??'','Название',200),goal:field(b.goal??'','Цель',1000),description:field(b.description??'','Описание',4000),duration:b.duration??45,teacher_notes:field(b.teacher_notes??'','Заметки',16000),steps:[]};
    if(!Number.isInteger(value.duration)||value.duration<5||value.duration>240)fail(400,'Продолжительность урока — от 5 до 240 минут.');
    if(!Array.isArray(b.steps)||b.steps.length>40)fail(400,'В уроке может быть до 40 шагов.');
    const ids=new Set(),tasks=new Set();
    value.steps=b.steps.map((s,i)=>{
      if(!s||typeof s.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(s.id)||ids.has(s.id)||!kinds.has(s.type))fail(400,`Шаг ${i+1}: проверьте тип и уникальность шага.`);
      ids.add(s.id);
      const step={id:s.id,type:s.type,title:field(s.title??'','Название шага',200),body:field(s.body??'','Содержание шага',12000)};
      if(s.type==='code')step.code=field(s.code??'','Пример кода');
      if(practical(s)){
        step.task_id=field(s.task_id??'','Практическое задание',100);
        if(step.task_id){const task=own('tasks',step.task_id,u);if(task.lesson_id!==b.id)fail(400,`Шаг ${i+1}: выберите задание этого урока.`)}
        if(publication){if(!step.task_id||tasks.has(step.task_id))fail(400,`Шаг ${i+1}: выберите отдельное практическое задание.`);tasks.add(step.task_id);const task=own('tasks',step.task_id,u);if(!task.published||!task.published_version_id)fail(400,`Шаг ${i+1}: задание ещё не опубликовано.`);assertPublishedVersion(task.published_version_id,u);step.task_version_id=task.published_version_id}
      }
      if(s.type==='question'){
        if(!Array.isArray(s.choices)||s.choices.length>6||s.choices.some(c=>typeof c!=='string'||c.length>1000))fail(400,`Шаг ${i+1}: до шести вариантов ответа.`);
        step.choices=s.choices;step.correct_index=s.correct_index??0;step.explanation=field(s.explanation??'','Объяснение ответа',2000);
        if(!Number.isInteger(step.correct_index)||step.correct_index<0||step.correct_index>=Math.max(1,step.choices.length))fail(400,`Шаг ${i+1}: выберите верный ответ.`);
        if(publication&&(step.choices.length<2||step.choices.some(c=>!c.trim())||new Set(step.choices.map(c=>c.trim())).size!==step.choices.length))fail(400,`Шаг ${i+1}: нужны разные непустые варианты ответа.`);
      }
      if(publication&&(!step.title.trim()||(!practical(s)&&!step.body.trim())||(s.type==='code'&&!step.code.trim())))fail(400,`Шаг ${i+1}: заполните название и материал.`);
      return step;
    });
    if(publication){
      if(!value.title.trim()||!value.goal.trim())fail(400,'Для публикации заполните название и цель урока.');
      for(const type of ['text','code','practice','question','final','summary'])if(!value.steps.some(s=>s.type===type))fail(400,`Добавьте шаг «${({text:'Объяснение',code:'Пример кода',practice:'Практика',question:'Вопрос',final:'Итоговая работа',summary:'Итог'})[type]}».`);
      if(value.steps.at(-1)?.type!=='summary')fail(400,'Последним шагом должен быть итог урока.');
    }
    return value;
  }
  const history=(u,l,base,accepted,conflict)=>{const id=randomUUID();run('INSERT INTO lesson_revisions VALUES(?,?,?,?,?,?,?,?,?)',id,u.org_id,l.id,u.id,base,accepted,JSON.stringify(l),Number(conflict),now());return id};
  function enrolled(runId,u){return get('SELECT e.* FROM run_enrollments e JOIN teaching_runs r ON r.id=e.run_id JOIN group_members gm ON gm.group_id=r.group_id AND gm.user_id=e.user_id WHERE e.run_id=? AND e.user_id=? AND r.org_id=? AND r.archived=0',runId,u.id,u.org_id)}
  function canAccessAssignment(a,u,writing=false){
    if(!a.run_id)return true;
    const r=get('SELECT * FROM teaching_runs WHERE id=? AND org_id=? AND archived=0',a.run_id,u.org_id),e=r&&enrolled(r.id,u);
    if(!r||!e)return false;
    if(!a.lesson_run_id)return true;
    const lesson=get('SELECT * FROM lesson_runs WHERE id=?',a.lesson_run_id);
    if(!lesson||lesson.position<e.start_position||(writing?lesson.state!=='open':lesson.state==='scheduled'))return false;
    if(writing&&a.step_id){
      const content=JSON.parse(get('SELECT snapshot FROM lesson_versions WHERE id=?',lesson.version_id).snapshot),index=content.steps.findIndex(s=>s.id===a.step_id);
      if(index<0||progress(lesson.id,u,content.steps).slice(0,index).some(p=>p.status!=='completed'))return false;
    }
    return true;
  }
  function lessonRun(id,u,writing=false){
    const l=own('lesson_runs',id,u),r=own('teaching_runs',l.run_id,u);
    if(u.role==='student'){
      const e=enrolled(r.id,u);
      if(!e||l.position<e.start_position||r.archived||l.state==='scheduled')fail(404,'Занятие ещё не открыто преподавателем.');
      if(writing&&l.state!=='open')fail(409,'Занятие завершено. Результаты доступны для просмотра.');
    }
    return {row:l,program:r,content:JSON.parse(own('lesson_versions',l.version_id,u).snapshot)};
  }
  function progress(id,u,steps){
    const saved=all('SELECT step_id,status,answer,updated_at FROM lesson_step_progress WHERE lesson_run_id=? AND user_id=?',id,u.id);
    const assignments=all('SELECT id,step_id FROM assignments WHERE lesson_run_id=? AND archived=0',id);
    return steps.map(s=>{
      if(practical(s)){
        const a=assignments.find(a=>a.step_id===s.id),passed=a&&get("SELECT id FROM attempts WHERE assignment_id=? AND user_id=? AND status='passed'",a.id,u.id);
        const latest=a&&get('SELECT id,status,mode,created_at FROM attempts WHERE assignment_id=? AND user_id=? ORDER BY created_at DESC LIMIT 1',a.id,u.id),draft=a&&get('SELECT updated_at FROM assignment_drafts WHERE assignment_id=? AND user_id=? UNION ALL SELECT updated_at FROM assignment_block_drafts WHERE assignment_id=? AND user_id=? ORDER BY updated_at DESC LIMIT 1',a.id,u.id,a.id,u.id);
        return {step_id:s.id,status:passed?'completed':latest?.status||draft?'started':'available',assignment_id:a?.id,attempt_id:latest?.id,attempt_status:latest?.status,mode:latest?.mode,updated_at:latest?.created_at||draft?.updated_at};
      }
      return saved.find(p=>p.step_id===s.id)||{step_id:s.id,status:'available'};
    });
  }
  function details(id,u){
    const {row,program,content}=lessonRun(id,u),assignments=all('SELECT * FROM assignments WHERE lesson_run_id=? AND archived=0 ORDER BY rowid',id);
    const students=u.role==='student'?undefined:all('SELECT u.id,u.name,u.org_id,e.start_position FROM users u JOIN run_enrollments e ON e.user_id=u.id WHERE e.run_id=? AND u.org_id=?',program.id,u.org_id).filter(s=>s.start_position<=row.position).map(s=>({id:s.id,name:s.name,progress:progress(id,s,content.steps)}));
    return {id:row.id,run_id:row.run_id,state:row.state,state_revision:row.revision,group_title:own('groups_',program.group_id,u).title,due_at:program.due_at,lesson:u.role==='student'?publicLesson(content):content,progress:u.role==='student'?progress(id,u,content.steps):[],...(students?{students}:{}),assignments:assignments.map(a=>{
      const task=JSON.parse(own('task_versions',a.version_id,u).snapshot);
      return {id:a.id,step_id:a.step_id,task:safeTask({...task,...(u.role==='student'?{modes:modesFor(a,u.id,task)}:{}),assignment_id:a.id,version_id:a.version_id,group_id:program.group_id,group_title:own('groups_',program.group_id,u).title,due_at:a.due_at,lesson_run_id:id,run_id:program.id,published:1},u)};
    })};
  }
  function plan(b,u){
    if(b.scope==='course'&&get("SELECT 1 FROM course_imports WHERE course_id=? AND org_id=? AND status='building'",b.source_id,u.org_id))fail(409,'Стартовый курс ещё готовится. Дождитесь завершения подготовки или продолжите её из раздела «Курсы».');
    if(!['course','module','lesson','selection'].includes(b.scope))fail(400,'Выберите курс, модуль, урок или подборку.');
    let rows=[],title='',sourceId=b.source_id||'';
    if(b.scope==='selection'){
      if(!Array.isArray(b.task_ids)||!b.task_ids.length||b.task_ids.length>100||new Set(b.task_ids).size!==b.task_ids.length)fail(400,'Выберите от 1 до 100 разных заданий.');
      const tasks=b.task_ids.map(id=>own('tasks',id,u));
      for(const t of tasks){if(!t.published||!t.published_version_id)fail(400,'В подборке есть неопубликованное задание.');assertPublishedVersion(t.published_version_id,u)}
      const selected=tasks.map(t=>{const content=JSON.parse(own('task_versions',t.published_version_id,u).snapshot),l=own('lessons',content.lesson_id,u),m=own('modules',l.module_id,u);return {task_id:t.id,version_id:t.published_version_id,title:content.title,order:{course_id:m.course_id,module_id:m.id,module_position:m.position,lesson_id:l.id,lesson_position:l.position,task_position:content.position}}});
      selected.sort((a,b)=>{const course=a.order.course_id.localeCompare(b.order.course_id);if(course)return course;for(const key of ['module_position','lesson_position','task_position']){const delta=a.order[key]-b.order[key];if(delta)return delta}return a.task_id.localeCompare(b.task_id)});sourceId=digest([...b.task_ids].sort());title='Подборка заданий';
      return {scope:b.scope,source_id:sourceId,title,lessons:[],tasks:selected};
    }
    if(b.scope==='course'){const c=own('courses',sourceId,u);title=c.title;rows=all('SELECT l.*,m.position AS module_position FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=? AND l.org_id=? ORDER BY m.position,m.id,l.position,l.id',c.id,u.org_id)}
    if(b.scope==='module'){const m=own('modules',sourceId,u);title=m.title;rows=all('SELECT l.*,? AS module_position FROM lessons l WHERE module_id=? AND org_id=? ORDER BY position,id',m.position,m.id,u.org_id)}
    if(b.scope==='lesson'){const l=own('lessons',sourceId,u),m=own('modules',l.module_id,u);title=l.title;rows=[{...l,module_position:m.position}]}
    if(!rows.length||rows.length>100)fail(400,'Программа должна содержать от 1 до 100 уроков.');
    const lessons=rows.map(l=>{
      if(!l.published_version_id)fail(400,`Сначала опубликуйте урок «${l.title}».`);
      const version=own('lesson_versions',l.published_version_id,u),content=JSON.parse(version.snapshot),module=own('modules',l.module_id,u),course=own('courses',module.course_id,u);
      for(const s of content.steps)if(practical(s))assertPublishedVersion(s.task_version_id,u);
      return {lesson_id:l.id,version_id:version.id,revision:version.revision,title:content.title,duration:content.duration,course_id:course.id,course_title:course.title,module_id:module.id,module_title:module.title,module_position:l.module_position,lesson_position:l.position,steps:content.steps.map(s=>({id:s.id,type:s.type,title:s.title,...(practical(s)?{task_id:s.task_id,version_id:s.task_version_id}:{})}))};
    });
    return {scope:b.scope,source_id:sourceId,title,lessons,tasks:[]};
  }
  function dueDate(value){if(!value)return null;if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail(400,'Неверный срок.');return new Date(value).toISOString()}
  function issuancePlan(b,u){if(own('groups_',b.group_id,u).archived)fail(409,'Группа архивирована.');return {...plan(b,u),participants:all("SELECT u.id FROM users u JOIN group_members gm ON gm.user_id=u.id WHERE gm.group_id=? AND u.org_id=? AND u.role='student' AND u.active=1 ORDER BY u.id",b.group_id,u.org_id).map(u=>u.id)}}
  function programState(u){
    const programs=u.role==='student'?all('SELECT r.* FROM teaching_runs r JOIN run_enrollments e ON e.run_id=r.id JOIN group_members gm ON gm.group_id=r.group_id AND gm.user_id=e.user_id WHERE r.org_id=? AND e.user_id=? AND r.archived=0 ORDER BY r.created_at',u.org_id,u.id):all('SELECT * FROM teaching_runs WHERE org_id=? ORDER BY created_at DESC',u.org_id);
    return programs.filter(r=>u.role!=='teacher'||!!get('SELECT 1 FROM group_teachers WHERE group_id=? AND user_id=?',r.group_id,u.id)).map(r=>{
      const enrollment=u.role==='student'?enrolled(r.id,u):null;
      const lessons=all('SELECT * FROM lesson_runs WHERE run_id=? ORDER BY position',r.id).filter(l=>!enrollment||l.position>=enrollment.start_position).map(l=>{
        const content=JSON.parse(own('lesson_versions',l.version_id,u).snapshot),p=u.role==='student'?progress(l.id,u,content.steps):[];
        return {id:l.id,lesson_id:l.lesson_id,version_id:l.version_id,revision:l.revision,position:l.position,state:l.state,title:content.title,duration:content.duration,goal:content.goal,total:content.steps.length,completed:p.filter(s=>s.status==='completed').length};
      });
      const tasks=r.scope==='selection'?all('SELECT a.id,v.snapshot FROM assignments a JOIN task_versions v ON v.id=a.version_id WHERE a.run_id=? ORDER BY a.rowid',r.id).map(a=>({id:a.id,title:JSON.parse(a.snapshot).title,completed:u.role==='student'?Boolean(get("SELECT id FROM attempts WHERE assignment_id=? AND user_id=? AND status='passed'",a.id,u.id)):false})):[];
      return {id:r.id,title:r.title,group_id:r.group_id,group_title:own('groups_',r.group_id,u).title,scope:r.scope,due_at:r.due_at,archived:r.archived,created_at:r.created_at,lessons,tasks,...(u.role==='student'?{}:{enrollments:all('SELECT user_id,start_position FROM run_enrollments WHERE run_id=?',r.id)})};
    });
  }
  function state(u,base){
    return {...base,assignments:u.role==='student'?base.assignments.filter(a=>canAccessAssignment(get('SELECT * FROM assignments WHERE id=?',a.id),u)):base.assignments,lessons:base.lessons.map(l=>u.role==='student'?{id:l.id,module_id:l.module_id,title:l.title,position:l.position}:parseLesson(l)),programs:programState(u)};
  }
  async function handle(path,method,b,u){
    let match;
    if((match=/^\/api\/lesson-content\/([^/]+)$/.exec(path))&&method==='PUT'){
      teacher(u);const l=own('lessons',match[1],u),values=validateLesson({...b,id:l.id},u);
      if(!Number.isInteger(b.revision)||b.revision<1)fail(400,'Укажите ревизию урока.');
      if(b.revision!==l.revision){const conflict_id=history(u,{...values,id:l.id},b.revision,null,true);fail(409,'Другой преподаватель сохранил урок. Обе версии сохранены.',{current:parseLesson(l),conflict_id})}
      tx(()=>{history(u,parseLesson(l),l.revision,l.revision,false);run('UPDATE lessons SET title=?,goal=?,description=?,duration=?,teacher_notes=?,steps=?,revision=revision+1,updated_at=? WHERE id=?',values.title,values.goal,values.description,values.duration,values.teacher_notes,JSON.stringify(values.steps),now(),l.id);history(u,{...values,id:l.id},l.revision,l.revision+1,false)});
      return {id:l.id,revision:l.revision+1};
    }
    if((match=/^\/api\/lesson-content\/([^/]+)\/publish$/.exec(path))&&method==='POST'){
      teacher(u);const l=own('lessons',match[1],u);
      if(b.revision!==l.revision)fail(409,'Урок изменился. Сохраните и проверьте текущую ревизию.');
      const content={id:l.id,revision:l.revision,...validateLesson({...parseLesson(l),id:l.id},u,true)};
      const id=tx(()=>{const old=get('SELECT * FROM lesson_versions WHERE lesson_id=? AND revision=?',l.id,l.revision);if(old&&old.snapshot!==JSON.stringify(content))fail(409,'Версии практики изменились. Сохраните новую ревизию урока перед публикацией.');let id=old?.id;if(!id){id=randomUUID();run('INSERT INTO lesson_versions VALUES(?,?,?,?,?,?)',id,u.org_id,l.id,l.revision,JSON.stringify(content),now())}run('UPDATE lessons SET published_version_id=? WHERE id=?',id,l.id);audit(u,'lesson.published',l.id,{version_id:id,revision:l.revision});return id});
      return {id:l.id,version_id:id,revision:l.revision};
    }
    if(path==='/api/programs/preview'&&method==='POST'){teacher(u);own('groups_',b.group_id,u);const snapshot=issuancePlan(b,u);return {snapshot,preview_hash:digest(snapshot),students:snapshot.participants.length}}
    if(path==='/api/programs'&&method==='POST'){
      teacher(u);if(typeof b.request_key!=='string'||!/^[a-zA-Z0-9_-]{10,100}$/.test(b.request_key))fail(400,'Укажите ключ выдачи программы.');
      own('groups_',b.group_id,u);groupManager(u,b.group_id);
      const payload=JSON.stringify({group_id:b.group_id,scope:b.scope,source_id:b.source_id||'',task_ids:b.task_ids||[],due_at:dueDate(b.due_at),preview_hash:b.preview_hash,repeat_of:b.repeat_of||null});
      const old=get('SELECT * FROM teaching_runs WHERE org_id=? AND request_key=?',u.org_id,b.request_key);
      if(old){if(old.actor_id!==u.id||old.payload!==payload)fail(409,'Ключ выдачи использован для другой программы.');return {id:old.id,replayed:true}}
      own('groups_',b.group_id,u);const snapshot=issuancePlan(b,u);
      if(b.preview_hash!==digest(snapshot))fail(409,'Состав или версии программы изменились. Обновите предпросмотр.');
      const existing=get('SELECT id FROM teaching_runs WHERE org_id=? AND group_id=? AND scope=? AND source_id=? AND archived=0',u.org_id,b.group_id,b.scope,snapshot.source_id);
      if(b.repeat_of){const previous=own('teaching_runs',b.repeat_of,u);if(previous.group_id!==b.group_id||previous.scope!==b.scope||previous.source_id!==snapshot.source_id)fail(400,'Выберите прежнее прохождение этой программы и группы.')}
      else if(existing)fail(409,'Программа уже выдана. Выберите явное повторное прохождение.');
      const id=randomUUID(),at=now(),due=dueDate(b.due_at);
      tx(()=>{
        run('INSERT INTO teaching_runs(id,org_id,group_id,actor_id,request_key,payload,scope,source_id,title,snapshot,due_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,u.org_id,b.group_id,u.id,b.request_key,payload,b.scope,snapshot.source_id,snapshot.title,JSON.stringify(snapshot),due,at);
        for(const [position,l] of snapshot.lessons.entries()){
          const lessonId=randomUUID();run("INSERT INTO lesson_runs(id,org_id,run_id,lesson_id,version_id,position,state) VALUES(?,?,?,?,?,?,?)",lessonId,u.org_id,id,l.lesson_id,l.version_id,position,position===0?'open':'scheduled');
          for(const [index,s] of l.steps.entries())if(practical(s))createAssignment(s.task_id,s.version_id,lessonId,s.id,{...l,steps:undefined,program_position:position,step_position:index,task_position:index},id,b.group_id,due,at,u);
        }
        for(const [position,t] of snapshot.tasks.entries())createAssignment(t.task_id,t.version_id,null,null,{...t.order,program_position:position},id,b.group_id,due,at,u);
        for(const userId of snapshot.participants)run('INSERT INTO run_enrollments VALUES(?,?,0,?)',id,userId,at);
        audit(u,b.repeat_of?'program.repeated':'program.created',id,{group_id:b.group_id,scope:b.scope,lessons:snapshot.lessons.length,tasks:snapshot.tasks.length});
      });
      return {id};
    }
    if((match=/^\/api\/programs\/([^/]+)\/enroll$/.exec(path))&&method==='POST'){
      teacher(u);const r=own('teaching_runs',match[1],u);groupManager(u,r.group_id);if(r.archived)fail(409,'Прохождение архивировано.');
      if(!['from_start','current'].includes(b.mode)||!Array.isArray(b.user_ids)||!b.user_ids.length||b.user_ids.length>100||new Set(b.user_ids).size!==b.user_ids.length)fail(400,'Выберите участников и начало программы.');
      const start=b.mode==='from_start'?0:get("SELECT MIN(position) AS n FROM lesson_runs WHERE run_id=? AND state='open'",r.id)?.n;
      if(start===null||start===undefined)fail(409,'Сначала откройте текущее занятие.');
      for(const id of b.user_ids){const target=own('users',id,u);if(target.role!=='student'||!target.active||!get('SELECT user_id FROM group_members WHERE group_id=? AND user_id=?',r.group_id,id))fail(400,'Ученик должен иметь доступ и входить в группу.');const old=get('SELECT * FROM run_enrollments WHERE run_id=? AND user_id=?',r.id,id);if(old&&old.start_position!==start)fail(409,'Ученик уже проходит программу с другой точки. Его прогресс не изменён.')}
      tx(()=>{for(const id of b.user_ids){const added=run('INSERT OR IGNORE INTO run_enrollments VALUES(?,?,?,?)',r.id,id,start,now());if(added.changes)audit(u,'program.enrolled',r.id,{user_id:id,start_position:start})}});return {ok:true};
    }
    if((match=/^\/api\/programs\/([^/]+)$/.exec(path))&&method==='DELETE'){
      teacher(u);const r=own('teaching_runs',match[1],u);groupManager(u,r.group_id);tx(()=>{run('UPDATE teaching_runs SET archived=1 WHERE id=?',r.id);audit(u,'program.archived',r.id)});return {ok:true};
    }
    if((match=/^\/api\/lesson-runs\/([^/]+)$/.exec(path))&&method==='GET')return details(match[1],u);
    if((match=/^\/api\/lesson-runs\/([^/]+)\/state$/.exec(path))&&method==='POST'){
      teacher(u);const {row,program}=lessonRun(match[1],u);if(program.archived)fail(409,'Программа архивирована.');if(!['open','closed'].includes(b.state)||b.revision!==row.revision)fail(409,'Состояние занятия изменилось. Обновите экран.');
      tx(()=>{run('UPDATE lesson_runs SET state=?,revision=revision+1 WHERE id=?',b.state,row.id);audit(u,'lesson_run.state_changed',row.id,{previous:row.state,current:b.state})});return {ok:true};
    }
    if((match=/^\/api\/lesson-runs\/([^/]+)\/steps\/([^/]+)$/.exec(path))&&method==='POST'){
      if(u.role!=='student')fail(403,'Шаг завершает ученик.');
      const {content,row}=lessonRun(match[1],u,true),step=content.steps.find(s=>s.id===match[2]);if(!step)fail(404,'Шаг не найден.');
      const saved=progress(row.id,u,content.steps),index=content.steps.indexOf(step);
      if(saved[index].status==='completed')return {status:'completed',message:'Шаг уже завершён.'};
      if(saved.slice(0,index).some(p=>p.status!=='completed'))fail(409,'Сначала завершите предыдущий шаг урока.');
      if(practical(step))fail(409,'Сначала выполните практическое задание.');
      let correct=true,answer=null;
      if(step.type==='question'){
        if(!Number.isInteger(b.answer)||b.answer<0||b.answer>=step.choices.length)fail(400,'Выберите ответ.');answer=b.answer;correct=answer===step.correct_index;
        if(get('SELECT COUNT(*) AS n FROM lesson_step_events WHERE lesson_run_id=? AND user_id=? AND step_id=?',row.id,u.id,step.id).n>=100)fail(429,'Много попыток ответа. Обратитесь к преподавателю.');
      }else if(b.acknowledged!==true)fail(400,'Подтвердите, что материал прочитан.');
      const at=now();tx(()=>{
        run('INSERT INTO lesson_step_progress VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,lesson_run_id,step_id) DO UPDATE SET status=excluded.status,answer=excluded.answer,updated_at=excluded.updated_at',u.id,row.id,step.id,correct?'completed':'incorrect',answer,at);
        run('INSERT INTO lesson_step_events VALUES(?,?,?,?,?,?,?,?)',randomUUID(),u.org_id,u.id,row.id,step.id,answer,Number(correct),at);
      });return {status:correct?'completed':'incorrect',message:correct?(step.explanation||'Верно. Можно продолжать.'):'Пока не совпало. Вернитесь к примеру и попробуйте ещё раз.'};
    }
    return undefined;
  }
  function createAssignment(taskId,versionId,lessonRunId,stepId,order,runId,groupId,due,at,u){
    // Referenced versions come from the published lesson, never the mutable task.
    const version=own('task_versions',versionId,u);if(version.task_id!==taskId)fail(409,'Ссылка на версию задания повреждена.');
    run('INSERT INTO assignments(id,org_id,group_id,task_id,due_at,version_id,created_at,order_snapshot,run_id,lesson_run_id,step_id,mode_policy) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',randomUUID(),u.org_id,groupId,taskId,due,versionId,at,JSON.stringify(order),runId,lessonRunId,stepId,modePolicyFor(version.snapshot));
  }
  return {handle,state,canAccessAssignment,details};
}
