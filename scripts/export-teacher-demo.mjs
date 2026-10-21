// Creates an isolated fictional school; never reads the working school's database.
import {harness} from '../tests/helpers/b2b-harness.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const h=await harness();
try{
  const {admin}=await h.school('teacher-preview-'+Date.now());
  const teacher={};
  const author=await h.request('/users',{name:'Ангелина Костян',login:'teacher-demo',role:'teacher',password:h.password},admin);
  await h.request('/auth/login',{login:'teacher-demo',password:h.password},teacher);
  const installed=await h.request('/starter-course/install',{},admin);
  const names=['Алиса Морозова','Марк Соколов','София Коваль','Даниил Орлов','Ева Белова','Матвей Волков','Полина Савина','Артём Лис','Варвара Миронова','Михаил Новик','Виктория Романова','Илья Петров','Арина Смирнова','Тимофей Козлов'];
  const groups=[];for(const title of ['6"Б"','7"А"']){
    const group=await h.request('/groups',{title},admin);groups.push(group);
    await h.request(`/groups/${group.id}/teachers`,{items:[{user_id:author.id,kind:'primary'}],expected:[]},admin,200,'PUT');
  }
  for(const [i,name] of names.entries()){
    const user=await h.request('/users',{name,login:`demo-student-${i+1}`,role:'student',password:h.password},admin);
    await h.request(`/groups/${groups[i<8?0:1].id}/members`,{user_id:user.id},admin);
  }
  for(const group of groups){const body={group_id:group.id,scope:'course',source_id:installed.id,due_at:new Date(Date.now()+7*86400000).toISOString()};const preview=await h.request('/programs/preview',body,teacher);await h.request('/programs',{...body,preview_hash:preview.preview_hash,request_key:randomUUID()},teacher)}
  const initial=await h.request('/state',undefined,teacher);
  const columns=new Set(h.db.prepare('PRAGMA table_info(attempts)').all().map(c=>c.name));
  for(const [i,user] of initial.users.filter(u=>u.role==='student').entries()){
    const group=initial.members.find(m=>m.user_id===user.id)?.group_id;
    const assignments=initial.assignments.filter(a=>a.group_id===group).slice(0,2+(i%4));
    for(const [j,a] of assignments.entries()){
      const task=initial.tasks.find(t=>t.id===a.task_id),snapshot=JSON.parse(h.db.prepare('SELECT snapshot FROM task_versions WHERE id=?').get(a.version_id).snapshot);
      const status=i%5===0&&j===assignments.length-1?'failed':i%6===0&&j===assignments.length-1?'pending_review':'passed';
      const result={status,message:status==='passed'?'Отлично! Все тесты пройдены.':status==='pending_review'?'Работа ждёт комментария преподавателя.':'Проверь порядок команд и попробуй ещё раз.',cases:[]};
      const row={id:randomUUID(),org_id:user.org_id,user_id:user.id,task_id:task.id,assignment_id:a.id,version_id:a.version_id,code:status==='failed'?'print("Привет")':snapshot.reference_solution,status,result:JSON.stringify(result),snapshot:JSON.stringify(snapshot),feedback:status==='passed'?'Хорошая работа! Объясни, что делает каждая команда.':'',created_at:new Date(Date.now()-(i*17+j*4)*60000).toISOString(),mode:i%3===0?'blocks':i%3===1?'mixed':'python',context_origin:'assignment'};
      row.org_id=initial.user.org_id;
      const keys=Object.keys(row).filter(k=>columns.has(k));h.db.prepare(`INSERT INTO attempts(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));
    }
  }
  h.db.prepare('UPDATE organizations SET name=?').run('Kodik · Демошкола');
  const state=await h.request('/state',undefined,teacher);
  const pages={};
  for(const a of state.attempts){pages[`/attempts/${a.id}`]=await h.request(`/attempts/${a.id}`,undefined,teacher);pages[`/attempts/${a.id}/reviews`]={items:[]}}
  for(const p of state.programs)for(const lesson of p.lessons)pages[`/lesson-runs/${lesson.id}`]=await h.request(`/lesson-runs/${lesson.id}`,undefined,teacher);
  for(const a of state.assignments)pages[`/assignments/${a.id}/modes`]=await h.request(`/assignments/${a.id}/modes`,undefined,teacher);
  pages['/reports']=await h.request('/reports?limit=100',undefined,teacher);
  pages['/task-templates']=await h.request('/task-templates',undefined,teacher);
  pages['/help']=await h.request('/help?limit=100',undefined,teacher);
  // Only public account fields come from /state; session tokens/passwords never leave this script.
  await mkdir('teacher-demo',{recursive:true});
  await writeFile('teacher-demo/seed.json',JSON.stringify({state,pages},null,2));
  console.log(JSON.stringify({students:state.users.filter(u=>u.role==='student').length,groups:state.groups.length,lessons:state.lessons.length,attempts:state.attempts.length}));
}finally{await h.close()}

