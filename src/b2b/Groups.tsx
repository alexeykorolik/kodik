import {useState,type ReactNode} from 'react';
import {type Row,type State} from './api';
import {Header,Empty,Glyph,plural} from './App';
import {ClassImport,GroupTeachers} from './PilotPanels';
import {useConfirm} from './confirm';

type Field={key:string;label:string;type?:string;options?:Row[];optional?:boolean;value?:string};
export type GroupActions={
  go:(path:string)=>void;
  mutate:(path:string,body:Row,method?:string)=>Promise<any>;
  act:(fn:()=>Promise<unknown>)=>Promise<void>;
  dialog:(d:{title:string;text?:string;fields:Field[];submit:(b:Row)=>Promise<unknown>})=>void;
  issueProgram:(group:Row)=>void;
  assign:(group:Row,repeat?:Row)=>void;
  refresh:()=>Promise<void>;
};
const teachersOf=(s:State,groupId:string)=>((s as Row).group_teachers||[]).filter((g:Row)=>g.group_id===groupId).map((g:Row)=>({...g,name:s.users.find(u=>u.id===g.user_id)?.name})).filter((g:Row)=>g.name);
/** What the group needs next, in the order a school starts a class. */
function nextStep(s:State,g:Row){
  const members=s.members.filter(m=>m.group_id===g.id),programs=s.programs.filter(r=>r.group_id===g.id&&!r.archived);
  const open=programs.flatMap(r=>r.lessons.filter((l:Row)=>l.state==='open').map((l:Row)=>({...l,program:r})))[0];
  if(g.archived)return {kind:'archived' as const};
  if(!members.length)return {kind:'students' as const};
  if(!programs.length)return {kind:'program' as const};
  if(open)return {kind:'lesson' as const,lesson:open};
  return {kind:'wait' as const,program:programs[0]};
}
export function GroupsList({state:s,actions}:{state:State;actions:GroupActions}){
  const admin=s.user.role==='admin';
  return <>
    <Header title="Учебные группы" text="Группа — это класс: ученики, преподаватели и выданная программа.">
      <button className="primary" onClick={()=>actions.dialog({title:'Новая группа',text:'Например: «5Б Программирование». Учеников и программу добавите на странице группы.',fields:[{key:'title',label:'Название'}],submit:async b=>{const g=await actions.mutate('/groups',b);if(g?.id)actions.go(`group/${g.id}`)}})}>+ Создать группу</button>
    </Header>
    {!s.groups.length&&<Empty title="Создайте первую группу" text="Группа объединяет учеников одного класса. Нажмите «+ Создать группу» выше, затем добавьте учеников и выдайте программу."/>}
    <div className="groups-grid">{s.groups.map(g=>{const members=s.members.filter(m=>m.group_id===g.id),teachers=teachersOf(s,g.id),step=nextStep(s,g);
      return <section className={`panel group-card${g.archived?' archived':''}`} key={g.id}>
        <div className="section-title"><div><div className="overline">{g.archived?'ГРУППА В АРХИВЕ':'УЧЕБНАЯ ГРУППА'}</div><h2><a href={`#group/${g.id}`}>{g.title}</a></h2></div><div className="round-icon"><Glyph name="users"/></div></div>
        <dl className="group-facts"><div><dt>Ученики</dt><dd>{members.length}</dd></div><div><dt>Преподаватель</dt><dd>{teachers.find((t:Row)=>t.kind==='primary')?.name||teachers[0]?.name||(admin?'Не назначен':'—')}</dd></div><div><dt>Программа</dt><dd>{s.programs.filter(r=>r.group_id===g.id&&!r.archived).map(r=>r.title).join(', ')||'Не выдана'}</dd></div></dl>
        <p className="group-next">{step.kind==='students'?'Следующий шаг: добавьте учеников.':step.kind==='program'?'Следующий шаг: выдайте учебную программу.':step.kind==='lesson'?`Сейчас открыто: ${step.lesson.title}`:step.kind==='wait'?'Откройте следующее занятие, когда класс будет готов.':'Группа в архиве: только просмотр.'}</p>
        <div className="actions">{step.kind==='lesson'?<button className="primary" onClick={()=>actions.go(`lesson-run/${step.lesson.id}`)}>Провести занятие</button>:null}<button className={step.kind==='lesson'?'':'primary'} onClick={()=>actions.go(`group/${g.id}`)}>Открыть группу</button></div>
      </section>})}</div>
  </>;
}
export function GroupPage({state:s,group:g,actions}:{state:State;group:Row;actions:GroupActions}){
  const admin=s.user.role==='admin',[tab,setTab]=useState<'students'|'teachers'|'program'>(()=>s.members.some(m=>m.group_id===g.id)?'program':'students'),confirm=useConfirm();
  const members=s.members.filter(m=>m.group_id===g.id),students=s.users.filter(u=>u.role==='student'),teachers=teachersOf(s,g.id),step=nextStep(s,g);
  const programs=s.programs.filter(r=>r.group_id===g.id&&!r.archived),assignments=s.assignments.filter(a=>a.group_id===g.id&&!a.run_id);
  const outside=students.filter(u=>u.active!==0&&u.active!==false&&!members.some(m=>m.user_id===u.id));
  const addExisting=()=>actions.dialog({title:`Добавить в «${g.title}»`,fields:[{key:'user_id',label:'Ученик',options:outside}],submit:b=>actions.mutate(`/groups/${g.id}/members`,b)});
  const remove=async(m:Row,name:string)=>{if(await confirm.ask({title:`Убрать ${name} из группы?`,text:<p>Ученик перестанет видеть задания группы. Его аккаунт, работы и результаты сохранятся — его можно вернуть в группу.</p>,confirm:'Убрать из группы',danger:true}))void actions.act(()=>actions.mutate(`/groups/${g.id}/members`,{user_id:m.user_id},'DELETE'))};
  const archive=async()=>{const back=!!g.archived;if(!back&&!await confirm.ask({title:`Архивировать группу «${g.title}»?`,text:<><p>Ученики не смогут запускать и проверять решения, занятия нельзя будет открыть.</p><p>Работы, результаты и журнал сохранятся. Группу можно вернуть из архива.</p></>,confirm:'Архивировать группу',danger:true}))return;void actions.act(()=>actions.mutate(`/groups/${g.id}/archive`,{archived:!back}))};
  const unassign=async(a:Row)=>{if(await confirm.ask({title:'Снять задание с группы?',text:<p>«{a.title}» исчезнет у учеников группы. Уже отправленные работы останутся в журнале.</p>,confirm:'Снять задание',danger:true}))void actions.act(()=>actions.mutate(`/assignments/${a.id}`,{},'DELETE'))};
  const primary:ReactNode=step.kind==='students'?<button className="primary" onClick={()=>setTab('students')}>Добавить учеников</button>:step.kind==='program'?<button className="primary" onClick={()=>actions.issueProgram(g)}>Выдать учебную программу</button>:step.kind==='lesson'?<button className="primary" onClick={()=>actions.go(`lesson-run/${step.lesson.id}`)}>Провести занятие: {step.lesson.title}</button>:null;
  return <>
    <a className="breadcrumb" href="#groups">← Все группы</a>
    <Header eyebrow={g.archived?'ГРУППА В АРХИВЕ':'УЧЕБНАЯ ГРУППА'} title={g.title} text={`${plural(members.length,['ученик','ученика','учеников'])} · ${teachers.length?'преподаватель: '+teachers.map((t:Row)=>t.name).join(', '):'преподаватель не назначен'}`}>
      {primary}
      {admin&&<details className="more-menu"><summary>Ещё действия</summary><div className="more-menu-items"><button className={g.archived?'':'danger-text'} onClick={()=>void archive()}>{g.archived?'Вернуть группу из архива':'Архивировать группу…'}</button></div></details>}
    </Header>
    {!!g.archived&&<p className="notice view-only-note" role="status">Группа в архиве: работы и результаты доступны для просмотра.</p>}
    <div className="tabs page-tabs" role="tablist" aria-label="Разделы группы">{([['students',`Ученики · ${members.length}`],['teachers',`Преподаватели · ${teachers.length}`],['program','Программа и задания']] as const).map(([k,n])=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{n}</button>)}</div>
    {tab==='students'&&<div className="group-tab" role="tabpanel">
      <section className="panel"><div className="panel-heading"><h2>Ученики группы</h2><div className="actions"><button disabled={!outside.length||g.archived} onClick={addExisting}>+ Добавить ученика из школы</button></div></div>
        {!outside.length&&!g.archived&&<p className="muted inset">Все ученики школы уже в группе. Новых учеников подключите списком{admin?' ниже':' — это делает администратор'}.</p>}
        {members.length?<ul className="member-list">{members.map(m=>{const u=s.users.find(x=>x.id===m.user_id);return <li className="member inset" key={m.user_id}><span>{u?.name}<small>{u?.login}</small></span>{!g.archived&&<button className="link danger-text" onClick={()=>void remove(m,u?.name||'ученика')}>Убрать…</button>}</li>})}</ul>:<p className="inset">В группе пока нет учеников.</p>}
      </section>
      {admin&&!g.archived&&<ClassImport state={s} group={g.id} refresh={actions.refresh}/>}
    </div>}
    {tab==='teachers'&&<div className="group-tab" role="tabpanel">{admin?<GroupTeachers state={s} group={g.id} refresh={actions.refresh}/>:<section className="panel"><h2>Преподаватели</h2><ul className="plain-list">{teachers.map((t:Row)=><li key={t.user_id}>{t.name} · {t.kind==='primary'?'основной':'совместное преподавание'}</li>)}</ul><p className="muted">Состав преподавателей меняет администратор школы.</p></section>}</div>}
    {tab==='program'&&<div className="group-tab" role="tabpanel">
      {programs.map(r=>{const open=r.lessons.find((l:Row)=>l.state==='open'),next=r.lessons.find((l:Row)=>l.state==='scheduled');return <section className="panel program-summary" key={r.id}><div className="panel-heading"><div><span className="overline">УЧЕБНАЯ ПРОГРАММА</span><h2>{r.title}</h2></div><button onClick={()=>actions.go(`program/${r.id}`)}>Все занятия →</button></div>
        <div className="inset"><p>{plural(r.lessons.length,['занятие','занятия','занятий'])}{r.due_at?` · срок ${new Date(r.due_at).toLocaleDateString('ru')}`:''}</p>{open?<div className="lesson-callout"><span className="state-chip open">Открыто</span><b>{open.title}</b><button className="primary" onClick={()=>actions.go(`lesson-run/${open.id}`)}>Провести занятие</button></div>:next?<div className="lesson-callout"><span className="state-chip scheduled">Следующее</span><b>{next.title}</b><button onClick={()=>actions.go(`program/${r.id}`)}>Открыть для класса</button></div>:<p>Все занятия завершены.</p>}</div></section>})}
      {!programs.length&&<p className="panel inset">Программа ещё не выдана.{step.kind==='students'?' Сначала добавьте учеников.':''}</p>}
      {!g.archived&&step.kind!=='program'&&<div className="actions spaced"><button onClick={()=>actions.issueProgram(g)}>{programs.length?'Выдать ещё одну программу':'Выдать учебную программу'}</button></div>}
      <section className="panel"><div className="panel-heading"><div><h2>Отдельные задания</h2><p className="muted">Задания вне программы — например, домашняя работа.</p></div>{!g.archived&&<button disabled={!s.tasks.some(t=>t.published)} title={s.tasks.some(t=>t.published)?undefined:'Сначала опубликуйте задание в «Курсах»'} onClick={()=>actions.assign(g)}>+ Назначить задание</button>}</div>
        {assignments.length?assignments.map(a=><div className="member inset" key={a.id}><span>{a.title||s.tasks.find(t=>t.id===a.task_id)?.title}{a.due_at&&<small>до {new Date(a.due_at).toLocaleDateString('ru')}</small>}</span><span className="actions"><button className="link" onClick={()=>actions.dialog({title:'Изменить срок',fields:[{key:'due_at',label:'Срок (необязательно)',type:'date',optional:true,value:a.due_at?.slice(0,10)||''}],submit:b=>actions.mutate(`/assignments/${a.id}`,{...b,revision:a.revision},'PUT')})}>Изменить срок</button><button className="link" disabled={!s.tasks.some(t=>t.id===a.task_id&&t.published)} onClick={()=>actions.assign(g,a)}>Назначить повторно</button><button className="link danger-text" onClick={()=>void unassign(a)}>Снять с группы…</button></span></div>):<p className="muted inset">Отдельных заданий нет.</p>}
      </section>
    </div>}
    {confirm.element}
  </>;
}
