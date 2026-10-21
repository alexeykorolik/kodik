// Fills a NEW database with realistic pilot data through the HTTP API of whatever release this file is
// run against: owner + client card + connected school + licence, teachers, a class, block and Python
// drafts, passed/failed/manual attempts with a teacher review, help, a recommendation and an accepted
// job. Used to rehearse migration and restore of a filled database. Never point it at a working DB.
//   node scripts/fill-pilot-database.mjs NEW.sqlite [RELEASE_DIR]
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const [target,releaseDir='.']=process.argv.slice(2);
if(!target)throw new Error('Usage: node scripts/fill-pilot-database.mjs NEW.sqlite [RELEASE_DIR]');
if(existsSync(resolve(target)))throw new Error('Choose a new file; existing databases are never filled.');
const {createApp}=await import(pathToFileURL(join(resolve(releaseDir),'server/b2b/app.mjs')).href);
const {server,db}=createApp({dbPath:resolve(target),secure:false,registrationBudget:100});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,password='Fill-pilot-data-321!';
async function call(client,path,body,method='POST',expected=200){
  const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':method,headers:{Origin:origin,'X-Kodik-Client':'2','Content-Type':'application/json',...(client.cookie?{Cookie:client.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();if(r.status!==expected)throw new Error(`${path}: ${r.status} ${JSON.stringify(data)}`);
  if(r.headers.get('set-cookie'))client.cookie=r.headers.get('set-cookie').split(';')[0];return data;
}
const login=async(name)=>{const c={};await call(c,'/auth/login',{login:name,password});return c};
async function settle(client,job){for(let i=0;i<300&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,30));job=await call(client,`/submissions/${job.id}`)}if(job.status!=='completed')throw new Error('check did not finish');return job}
try{
  const owner={};const o=await call(owner,'/auth/register',{school:'Kodik',name:'Владелец',login:'fill-owner',password});
  db.prepare('UPDATE users SET platform_owner=1 WHERE id=?').run(o.user.id);
  const company=await call(owner,'/owner/companies',{name:'Школа «Пилот»'});
  const card=(await call(owner,'/owner/companies')).items.find(c=>c.id===company.id);
  await call(owner,`/owner/companies/${company.id}`,{...card,stage:'pilot',contact_name:'Директор',contact:'office@school.test',source:'Рекомендация',responsible:'Владелец',notes:'Пилот на два класса',next_action:'Собрать отзывы',next_at:'2099-01-15'},'PUT');
  const school=await call(owner,`/owner/companies/${company.id}/connect`,{request_key:'fill-connect-school-1',name:'Администратор',login:'fill-admin',password});
  const lic=(await call(owner,`/owner/schools/${school.org_id}/licenses`)).current;
  await call(owner,`/owner/schools/${school.org_id}/licenses`,{revision:lic.revision,status:'active',student_limit:40,expires_at:'2099-06-30'});
  const admin=await login('fill-admin');
  const teacher=await call(admin,'/users',{name:'Учитель',login:'fill-teacher',password,role:'teacher'});
  const group=await call(admin,'/groups',{title:'7А'});
  await call(admin,`/groups/${group.id}/teachers`,{items:[{user_id:teacher.id,kind:'primary'}]},'PUT');
  const kids=[];for(const [name,loginName] of [['Аня','fill-anya'],['Боря','fill-borya'],['Вика','fill-vika']]){const k=await call(admin,'/users',{name,login:loginName,password,role:'student'});await call(admin,`/groups/${group.id}/members`,{user_id:k.id});kids.push(k)}
  const course=await call(admin,'/courses',{title:'Python'}),module=await call(admin,'/modules',{title:'Начало',course_id:course.id}),lesson=await call(admin,'/lessons',{title:'Удвоение',module_id:module.id});
  const ws=(vars,...roots)=>({blocks:{languageVersion:0,blocks:roots},variables:vars.map(name=>({name,id:`v-${name}`}))});
  const solution=ws(['n'],{type:'variables_set',id:'s',x:10,y:10,fields:{VAR:{id:'v-n'}},inputs:{VALUE:{block:{type:'kodik_input_int',id:'i'}}},next:{block:{type:'text_print',id:'p',inputs:{TEXT:{block:{type:'math_arithmetic',id:'m',fields:{OP:'MULTIPLY'},inputs:{A:{block:{type:'variables_get',id:'g',fields:{VAR:{id:'v-n'}}}},B:{block:{type:'math_number',id:'k',fields:{NUM:2}}}}}}}}}});
  const taskBody={lesson_id:lesson.id,title:'Удвой число',description:'',goal:'Удвоить',theory:'',instruction:'Выведи удвоенное число',difficulty:'easy',starter:'',hints:[],check_mode:'tests',tests:[{inputs:['2'],expected:'4',hidden:false},{inputs:['21'],expected:'42',hidden:true}],reference_solution:'n = int(input())\nprint(n * 2)',wrong_solutions:['n = int(input())\nprint(n + 2)'],learning_config:{modes:['blocks','mixed'],palette:['kodik_input_int','variables_set','variables_get','math_arithmetic','math_number','text_print']},block_solution:solution};
  const task=await call(admin,'/tasks',taskBody);const rev=(await call(admin,'/state')).tasks.find(t=>t.id===task.id).revision;
  const proof=await call(admin,`/tasks/${task.id}/verify`,{revision:rev});if(proof.status!=="approved")throw new Error("verification: "+JSON.stringify(proof.block));await call(admin,`/tasks/${task.id}/publish`,{published:true,revision:rev});
  const manual=await call(admin,'/tasks',{lesson_id:lesson.id,title:'Опиши программу',description:'',goal:'Объяснить',theory:'',instruction:'Напиши программу и объясни её',difficulty:'easy',starter:'',hints:[],check_mode:'manual',tests:[],reference_solution:'',wrong_solutions:[],manual_criteria:'Программа работает, объяснение понятное.'});
  const mrev=(await call(admin,"/state")).tasks.find(t=>t.id===manual.id).revision;await call(admin,`/tasks/${manual.id}/verify`,{revision:mrev});await call(admin,`/tasks/${manual.id}/publish`,{published:true,revision:mrev});
  const a1=await call(admin,'/assignments',{request_key:randomUUID(),group_id:group.id,task_id:task.id,mode_policy:{allowed:['blocks','mixed','python'],start:'blocks',switching:'free'}});
  const a2=await call(admin,'/assignments',{request_key:randomUUID(),group_id:group.id,task_id:manual.id});
  const [anya,borya,vika]=[await login('fill-anya'),await login('fill-borya'),await login('fill-vika')];
  // Drafts: a block draft (Аня) and a Python draft (Боря) left in progress.
  await call(anya,`/tasks/${task.id}/draft`,{mode:'blocks',workspace:ws(['n'],{type:'variables_set',id:'d1',x:5,y:5,fields:{VAR:{id:'v-n'}},inputs:{VALUE:{block:{type:'kodik_input_int',id:'d2'}}}}),revision:0,assignment_id:a1.id},'PUT');
  await call(borya,`/tasks/${task.id}/draft`,{code:'n = int(input())\n# думаю…',revision:0,assignment_id:a1.id},'PUT');
  // Attempts: passed in blocks and Python, failed, manual with a teacher review.
  await settle(anya,await call(anya,`/tasks/${task.id}/submissions`,{assignment_id:a1.id,mode:'blocks',workspace:solution,request_key:'fill-anya-blocks-1'}));
  await settle(vika,await call(vika,`/tasks/${task.id}/submissions`,{assignment_id:a1.id,mode:'python',code:'n = int(input())\nprint(n * 2)',request_key:'fill-vika-python-1'}));
  await settle(borya,await call(borya,`/tasks/${task.id}/submissions`,{assignment_id:a1.id,mode:'python',code:'n = int(input())\nprint(n + 2)',request_key:'fill-borya-python-1'}));
  await settle(vika,await call(vika,`/tasks/${manual.id}/submissions`,{assignment_id:a2.id,code:'print("Привет")',request_key:'fill-vika-manual-1'}));
  const teacherClient=await login('fill-teacher');
  const manualAttempt=(await call(teacherClient,'/state')).attempts.find(a=>a.assignment_id===a2.id);
  await call(teacherClient,`/attempts/${manualAttempt.id}/review`,{revision:manualAttempt.review_revision??0,status:'passed',feedback:'Хорошее объяснение.'});
  await call(borya,'/help',{assignment_id:a1.id,message:'Не получается удвоить'});
  // A pending recommendation in the shape this release stores (normally produced by the evidence rule).
  db.prepare("INSERT INTO recommendations(id,org_id,assignment_id,user_id,target_mode,rule_version,basis,status,expires_at,created_at,teacher_id) VALUES(?,?,?,?,?,?,?,'proposed',?,?,NULL)").run(randomUUID(),school.org_id,a1.id,kids[2].id,'python','pilot-transition/1',JSON.stringify({reason:'Свежие успешные решения двух заданий',families:2}),new Date(Date.now()+7*86400000).toISOString(),new Date().toISOString());
  // A SENT recommendation (Боря) as the release stores it: status, invitation and its 'offered' event;
  // closed history; a teacher's own manual offer (Аня). Uses only what the filled release's schema has:
  // before schema 16 there is no stored reason and no 'withdrawn' status.
  const withReason=db.prepare('PRAGMA table_info(recommendations)').all().some(c=>c.name==='reason'),eventReason=db.prepare('PRAGMA table_info(recommendation_events)').all().some(c=>c.name==='reason');
  const at=new Date().toISOString(),rec=(id,user,mode,version,status,reason=null)=>db.prepare(`INSERT INTO recommendations(id,org_id,assignment_id,user_id,target_mode,rule_version,basis,status,expires_at,created_at,teacher_id${withReason?',reason':''}) VALUES(?,?,?,?,?,?,?,?,?,?,?${withReason?',?':''})`).run(id,school.org_id,a1.id,user,mode,version,JSON.stringify({reason:'Свежие успешные решения двух заданий',families:['f1','f2'],checks:[],attempts:[]}),status,new Date(Date.now()+7*86400000).toISOString(),at,status==='proposed'?null:teacher.id,...(withReason?[reason]:[]));
  const recEvent=(id,kind,reason)=>db.prepare(`INSERT INTO recommendation_events(id,recommendation_id,actor_id,kind,created_at${eventReason?',reason':''}) VALUES(?,?,?,?,?${eventReason?',?':''})`).run(randomUUID(),id,teacher.id,kind,at,...(eventReason?[reason]:[]));
  const sent=randomUUID();rec(sent,kids[1].id,'mixed','pilot-transition/2','offered');
  db.prepare("INSERT INTO assignment_mode_state(assignment_id,user_id,org_id,mode,offered_mode,override,revision,updated_at,updated_by) VALUES(?,?,?,NULL,'mixed',NULL,1,?,?)").run(a1.id,kids[1].id,school.org_id,at,teacher.id);
  db.prepare("INSERT INTO mode_events VALUES(?,?,?,?,?,'offered','blocks','mixed',?,?,?)").run(randomUUID(),school.org_id,a1.id,kids[1].id,teacher.id,`Рекомендация ${sent}: основание`,JSON.stringify({recommendation_id:sent}),at);
  recEvent(sent,'approve',null);
  for(const [status,reason,version] of [['dismissed','Преподаватель отклонил предложение.','pilot-transition/0.1'],[withReason?'withdrawn':'expired',withReason?'Преподаватель закрепил режим ученика.':'Срок предложения истёк.','pilot-transition/0.2']]){const id=randomUUID();rec(id,kids[0].id,'mixed',version,status,reason);recEvent(id,status,reason)}
  // Newer schemas store lifecycle fields directly; fixtures must satisfy the same
  // invariants as real API-created recommendations, without relying on a future migration.
  if(db.prepare('PRAGMA table_info(recommendations)').all().some(c=>c.name==='closed_at'))db.prepare("UPDATE recommendations SET closed_at=? WHERE status NOT IN ('proposed','offered') AND closed_at IS NULL").run(at);
  if(db.prepare('PRAGMA table_info(assignment_mode_state)').all().some(c=>c.name==='offer_recommendation_id'))db.prepare('UPDATE assignment_mode_state SET offer_recommendation_id=? WHERE assignment_id=? AND user_id=?').run(sent,a1.id,kids[1].id);
  await call(teacherClient,`/assignments/${a1.id}/students/${kids[0].id}/mode`,{offer:'mixed',reason:'Решение преподавателя'},'PUT');
  // An archived group with an issued task and Аня's draft in it.
  const archived=await call(admin,'/groups',{title:'Архив 6В'});await call(admin,`/groups/${archived.id}/members`,{user_id:kids[0].id});
  const a3=await call(admin,'/assignments',{request_key:randomUUID(),group_id:archived.id,task_id:manual.id});
  await call(anya,`/tasks/${manual.id}/draft`,{code:'print("черновик в архиве")',revision:0,assignment_id:a3.id},'PUT');
  await call(admin,`/groups/${archived.id}/archive`,{archived:true});
  console.log(JSON.stringify({filled:resolve(target),schema:db.prepare('PRAGMA user_version').get().user_version,org:school.org_id,task:task.id,assignment:a1.id}));
}finally{await new Promise(r=>server.close(r))}
