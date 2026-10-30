import {useEffect,useRef,useState} from 'react';
import {api,ApiError,type Row,type State} from './api';

type Operation={request_key:string;group_id:string;task_id:string;due_at:string;repeat_of?:string};
export function AssignmentDialog({state,group,repeat,close,refresh}:{state:State;group:Row;repeat?:Row;close:()=>void;refresh:()=>Promise<void>}){
  const storageKey=`kodik:assignment-operation:${state.user.org_id}:${state.user.id}:${group.id}:${repeat?.id||'new'}`;
  const [restored]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}});
  const choices=state.tasks.filter(t=>t.published&&(repeat?t.id===repeat.task_id:!state.assignments.some(a=>a.group_id===group.id&&a.task_id===t.id)));
  const [taskId,setTaskId]=useState(restored?.task_id||repeat?.task_id||choices[0]?.id||''),[due,setDue]=useState(restored?.due_at||''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(Boolean(restored));
  const requestKey=useRef(restored?.request_key||crypto.randomUUID()),inFlight=useRef(false);
  const task=state.tasks.find(t=>t.id===taskId);
  const title=repeat?'Назначить повторно':'Назначить задание';
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;heading.current?.focus();const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};document.addEventListener('keydown',escape);return()=>{document.removeEventListener('keydown',escape);previous?.focus()}},[]);
  async function submit(){
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setError('');
    const operation:Operation={request_key:requestKey.current,group_id:group.id,task_id:taskId,due_at:due,...(repeat?{repeat_of:repeat.id}:{})};
    try{
      localStorage.setItem(storageKey,JSON.stringify(operation));setPending(true);
      await api('/assignments',operation);
      await refresh();localStorage.removeItem(storageKey);close();
    }catch(e){
      setError(e instanceof Error?e.message:'Не удалось проверить результат выдачи.');
      if(e instanceof ApiError&&[400,403,404,409].includes(e.status)){localStorage.removeItem(storageKey);setPending(false);requestKey.current=crypto.randomUUID()}
    }finally{inFlight.current=false;setBusy(false)}
  }
  return <div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
    <div className="dialog-heading"><h2 ref={heading} tabIndex={-1}>{title}</h2><button aria-label="Закрыть" onClick={close}>×</button></div>
    <p>Группа: <strong>{group.title}</strong></p>
    {repeat&&<p className="notice">Начнётся отдельное прохождение. Прежние решения и черновики сохранятся в истории.</p>}
    {pending&&<p role="status" className="notice">Выдача сохранена на этом компьютере. Проверьте её результат: повторное нажатие не создаст второе прохождение.</p>}
    {!choices.length&&!pending&&<p className="notice">Все опубликованные задания уже выданы этой группе. Для нового прохождения используйте «Назначить повторно» рядом с работой.</p>}
    <form onSubmit={e=>{e.preventDefault();void submit()}}>
      <fieldset disabled={busy||pending}>
        <label>Опубликованное задание<select aria-label="Опубликованное задание" value={taskId} required onChange={e=>setTaskId(e.target.value)}>
          {(pending||restored)&&!choices.some(t=>t.id===taskId)&&<option value={taskId}>{task?.title||'Ранее выбранное задание'}</option>}
          {choices.map(t=><option value={t.id} key={t.id}>{t.title}</option>)}
        </select></label>
        <label>Срок (необязательно)<input type="date" value={due} onChange={e=>setDue(e.target.value)}/></label>
      </fieldset>
      {task&&<p className="muted">{pending?'Параметры прежней выдачи зафиксированы.':`Версия ${task.published_revision} · ${task.order_snapshot?.lesson_title||state.lessons.find(l=>l.id===task.lesson_id)?.title}.`} Порядок в курсе сохраняется независимо от времени выдачи.</p>}
      {error&&<p className="error" role="alert">{error}</p>}
      <footer><button type="button" onClick={close}>Закрыть</button><button className="primary" disabled={busy||!taskId}>{busy?'Проверяем выдачу…':pending?'Проверить результат выдачи':repeat?'Назначить повторно':'Выдать группе'}</button></footer>
    </form>
  </section></div>;
}
