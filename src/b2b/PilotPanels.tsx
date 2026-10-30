import {Fragment,useCallback,useEffect,useRef,useState} from 'react';
import {api,statusNames,type Row,type State} from './api';
import {Header,Badge,plural} from './App';
import {useConfirm} from './confirm';
import {MODE_LABEL,type Mode} from '../adaptive/modePolicy';
import {Icon} from './Icon';
const label=(m:string)=>MODE_LABEL[m as Mode]||m;
const switching:Record<string,string>={free:'Свободное переключение',teacher:'Переход с разрешения',locked:'Закреплённый режим'};
const HELP_CHOICES=['Не понимаю задание','Не получается собрать блоки','Проверка не проходит'];
/**
 * "Нужна помощь": a floating panel that never squeezes the work area. While a request is open the button
 * says so; a teacher's answer is shown as its own card until the learner closes it.
 */
export function HelpButton({assignmentId,lessonRunId,stepId}:{assignmentId?:string;lessonRunId?:string;stepId?:string}){
  const [message,setMessage]=useState(''),[request,setRequest]=useState<Row|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[error,setError]=useState(''),[dismissed,setDismissed]=useState('');
  const scope=assignmentId?`assignment_id=${encodeURIComponent(assignmentId)}`:`lesson_run_id=${encodeURIComponent(lessonRunId||'')}&step_id=${encodeURIComponent(stepId||'')}`;
  const panel=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const load=useCallback(()=>api('/help?limit=1&'+scope).then(r=>{const h=r.open.items[0]||r.history.items[0]||null;setRequest(h);return h}),[scope]);
  // The learner's own request for this task or step: the waiting one first, otherwise the latest answer.
  useEffect(()=>{setMessage('');setNote('');setError('');setRequest(null);let live=true;const tick=()=>{if(live)void load().catch(()=>{})};tick();const t=setInterval(tick,5000);return()=>{live=false;clearInterval(t)}},[load]);
  useEffect(()=>{try{setDismissed(localStorage.getItem('kodik:help-seen:'+scope)||'')}catch{setDismissed('')}},[scope]);
  useEffect(()=>{if(!open)return;const first=panel.current?.querySelector<HTMLElement>('button,input');first?.focus();const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);trigger.current?.focus()}};const outside=(e:PointerEvent)=>{if(!panel.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('keydown',close,true);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',close,true);document.removeEventListener('pointerdown',outside)}},[open]);
  const waiting=request?.status==='open',answer=request?.answer||'',answerKey=request?`${request.id}:${answer}`:'';
  const showAnswer=!!answer&&dismissed!==answerKey;
  async function send(text:string){setBusy(true);setError('');try{const r=await api('/help',{assignment_id:assignmentId,lesson_run_id:lessonRunId,step_id:stepId,message:text});setNote(waiting?(r.appended?'Вопрос дополнен — учитель увидит новые слова.':'Учитель уже видит твой запрос.'):'Учитель увидит твой запрос. Продолжай, если можешь.');setMessage('');await load().catch(()=>{});setOpen(false);trigger.current?.focus()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const seen=()=>{setDismissed(answerKey);try{localStorage.setItem('kodik:help-seen:'+scope,answerKey)}catch{/* only hides the card in this browser */}};
  return <div className="help-area">
    <button ref={trigger} type="button" className={`help-trigger${waiting?' waiting':''}`} aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(v=>!v)}><Icon name={waiting?'clock':'hand'} size="sm" />{waiting?'Ждём учителя':'Нужна помощь'}{showAnswer&&<span className="help-dot" aria-label="Есть ответ учителя"/>}</button>
    {note&&!open&&<span className="help-note" role="status">{note}</span>}
    {open&&<div ref={panel} className="help-popover" role="dialog" aria-label="Позвать учителя">
      <h3>{waiting?'Дополнить вопрос':'Что не получается?'}</h3>
      <div className="help-choices">{HELP_CHOICES.map(c=><button key={c} type="button" disabled={busy} onClick={()=>void send(c)}>{c}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();void send(message.trim()||'Подойдите ко мне, пожалуйста')}}>
        <label>Или напиши своими словами<input maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Например: не понимаю, почему неправильно"/></label>
        <div className="actions"><button className="primary" disabled={busy}>{busy?'Отправляем…':message.trim()?'Отправить учителю':'Просто позвать учителя'}</button><button type="button" onClick={()=>{setOpen(false);trigger.current?.focus()}}>Закрыть</button></div>
      </form>
      {waiting&&<p className="muted">Твой вопрос: «{request?.message}»</p>}
      {error&&<p className="error" role="alert">{error}</p>}
    </div>}
    {showAnswer&&<section className="teacher-answer" role="status" aria-label="Ответ учителя"><b>Учитель ответил</b><p>{answer}</p><button type="button" className="small" onClick={seen}>Понятно</button></section>}
  </div>;
}
const clock=(iso:string)=>new Date(iso).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
/** Polled data shared by teacher screens: keeps the last good data on errors. An answer is applied only
 * if no newer request (or a change of what is shown) started meanwhile, so a late answer never replaces it. */
function useLive<T>(load:()=>Promise<T>,apply:(value:T)=>void,deps:unknown[],every=5000){
  const [shownAt,setShownAt]=useState(''),[failed,setFailed]=useState(false),[loading,setLoading]=useState(true),sequence=useRef(0);
  const reload=async()=>{const current=++sequence.current;try{const value=await load();if(current!==sequence.current)return;apply(value);setShownAt(new Date().toISOString());setFailed(false)}catch{if(current===sequence.current)setFailed(true)}finally{if(current===sequence.current)setLoading(false)}};
  useEffect(()=>{setLoading(true);void reload();const t=setInterval(()=>void reload(),every);return()=>{sequence.current++;clearInterval(t)}},deps);
  return {shownAt,failed,loading,reload};
}
function LiveNote({live,what='Данные'}:{live:{shownAt:string;failed:boolean;loading:boolean};what?:string}){
  return <p role="status" className={live.failed?'freshness stale':'freshness'} data-testid="live-freshness">{live.failed?(live.shownAt?`Нет связи с сервером. Показаны данные от ${clock(live.shownAt)}.`:'Нет связи с сервером. Данные пока не загружены.'):live.loading&&!live.shownAt?'Загружаем…':`${what} обновлены в ${clock(live.shownAt)}`}</p>;
}
/** One change at a time; success is shown only after the server confirmed it. */
function useAction(after:()=>Promise<void>){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const run=async(fn:()=>Promise<unknown>,success:string)=>{if(busy)return;setBusy(true);setNotice('');try{await fn();setError('');setNotice(success);await after().catch(()=>{})}catch(e){setError((e as Error).message);await after().catch(()=>{})}finally{setBusy(false)}};
  const view=<>{error&&<p className="error" role="alert">{error}</p>}{notice&&!error&&<p role="status" className="success-note">{notice}</p>}</>;
  return {busy,run,view,setError};
}
const where=(h:Row)=>h.task_title?`Задание «${h.task_title}»`:h.lesson_title?`Урок «${h.lesson_title}»${h.step_title?` · шаг «${h.step_title}»`:''}`:'Занятие';
const waited=(iso:string)=>{const m=Math.max(0,Math.round((Date.now()-Date.parse(iso))/60000));return m<1?'только что':`ждёт ${m} мин`};
export function ClassroomPanel(){
  const [lists,setLists]=useState<Row|null>(null),[offset,setOffset]=useState(0);const PAGE=20;
  // Waiting requests and processed history come separately, already filtered by the teacher's groups.
  const live=useLive(()=>api(`/help?limit=${PAGE}&offset=${offset}`),setLists,[offset]),action=useAction(live.reload);
  const open:Row[]=lists?.open.items||[],history:Row[]=lists?.history.items||[],openTotal=lists?.open.total||0,historyTotal=lists?.history.total||0;
  return <><Header title="Помощь на занятии" text="Сначала — кто ждёт помощи сейчас. Обработанные запросы ниже."/><LiveNote live={live} what="Запросы"/>{action.view}
  <section className="panel help-waiting" aria-labelledby="help-waiting-title"><h2 id="help-waiting-title">Ждут помощи{lists?`: ${openTotal}`:''}</h2>
  {lists&&!openTotal&&<p>Сейчас никто не ждёт помощи.</p>}
  {open.length<openTotal&&<p className="muted">Показаны первые {open.length} из {openTotal}. Ответьте на них — список дополнится.</p>}
  <ul className="help-list">{open.map(h=><li key={h.id} className="help-card waiting"><article aria-label={`Запрос: ${h.name}`}>
    <h3>{h.name} <span className="state-tag waiting">Ждёт помощи</span></h3>
    <p className="help-meta">{h.group_title?`Группа «${h.group_title}» · `:''}{where(h)} · {waited(h.created_at)}</p>
    <p className="help-message">«{h.message}»</p>
    {h.lesson_run_id&&<p><a href={`#lesson-run/${h.lesson_run_id}`}>Открыть занятие</a></p>}
    {h.answer&&<p className="help-answer">Ваш ответ: {h.answer}</p>}
    <form className="help-reply" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),answer=String(f.get('answer')||''),resolve=(e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')!=='reply';const same=open.filter(o=>o.message===h.message);const targets=f.get('all')&&same.length>1?same:[h];void action.run(async()=>{for(const t of targets)await api(`/help/${t.id}`,resolve?{answer}:{answer,resolve:false},'PUT')},resolve?`Помощь отмечена: ${targets.map(t=>t.name).join(', ')}.`:`Ответ отправлен: ${targets.map(t=>t.name).join(', ')}. Запрос остаётся открытым.`);e.currentTarget.reset()}}>
      <label>Ответ ученику<input name="answer" maxLength={2000} placeholder="Необязательно, если подошли лично"/></label>
      {open.filter(o=>o.message===h.message).length>1&&<label className="checkbox"><input type="checkbox" name="all" value="1"/>Всем с этим вопросом ({open.filter(o=>o.message===h.message).length})</label>}
      <button type="submit" value="resolve" className="primary" disabled={action.busy}>{action.busy?'Сохраняем…':'Помощь оказана'}</button>
      <button type="submit" value="reply" disabled={action.busy}>Ответить, не закрывая</button>
    </form>
  </article></li>)}</ul></section>
  <section className="panel help-history" aria-labelledby="help-history-title"><h2 id="help-history-title">Обработанные запросы{lists?`: ${historyTotal}`:''}</h2>
  {lists&&!historyTotal&&<p>Обработанных запросов пока нет.</p>}
  <ul className="help-list">{history.map(h=><li key={h.id} className="help-card done"><h3>{h.name} <span className="state-tag done">Помощь оказана</span></h3><p className="help-meta">{h.group_title?`Группа «${h.group_title}» · `:''}{where(h)} · {new Date(h.resolved_at||h.created_at).toLocaleString('ru')}</p><p className="help-message">«{h.message}»</p><p>{h.answer||'Преподаватель подошёл к ученику.'}</p></li>)}</ul>
  {historyTotal>PAGE&&<div className="actions"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-PAGE))}>Более новые</button><span>{offset+1}–{Math.min(offset+PAGE,historyTotal)} из {historyTotal}</span><button disabled={offset+PAGE>=historyTotal} onClick={()=>setOffset(offset+PAGE)}>Более старые</button></div>}
  </section></>;
}
const REC_PAGE=10,HISTORY_PAGE=10;
const recClosed:Record<string,string>={accepted:'Принято учеником',declined:'Ученик отказался',dismissed:'Отклонено преподавателем',withdrawn:'Снято: основания или настройки изменились',replaced:'Заменено решением преподавателя',expired:'Истёк срок'};
const where2=(r:Row)=>`«${r.task_title||'Задание'}» · версия ${r.version_revision??'—'}${r.lesson_title?` · урок «${r.lesson_title}»${r.step_title?`, шаг «${r.step_title}»`:''}`:''}`;
/** One recommendation with its full context: learner, group, the concrete assignment, the transition, its state. */
function RecommendationCard({r,current,onShow,children}:{r:Row;current:boolean;onShow:(id:string)=>void;children?:React.ReactNode}){
  const live=['proposed','offered'].includes(r.status),tag=r.status==='proposed'?'Ждёт решения преподавателя':r.status==='offered'?'Отправлено ученику · ждёт его решения':recClosed[r.status]||r.status;
  return <li className={`rec-card ${live?'live':'done'}${current?' current':''}`} data-testid="recommendation-card" data-status={r.status}><article aria-label={`Предложение: ${r.student_name}, задание ${r.task_title}`}>
    <h3>{r.student_name} <span className={`state-tag ${r.status==='proposed'?'waiting':'done'}`}>{tag}</span></h3>
    <p className="rec-transition">Переход: <b>{label(r.from_mode)} → {label(r.target_mode)}</b></p>
    <dl className="rec-context"><div><dt>Группа</dt><dd>{r.group_title}{r.group_archived?' · в архиве':''}</dd></div><div><dt>Назначение</dt><dd>{where2(r)}</dd></div><div><dt>{live?'Предложено':'Закрыто'}</dt><dd>{new Date((live?r.created_at:r.closed_at)||r.created_at).toLocaleString('ru')}{live?` · действует до ${new Date(r.expires_at).toLocaleDateString('ru')}`:''}</dd></div></dl>
    {live&&r.basis?.reason&&<p className="rec-basis">{r.basis.reason}</p>}
    {!live&&r.reason&&<p className="rec-reason">Причина: {r.reason}</p>}
    {!live&&['withdrawn','expired'].includes(r.status)&&<p className="muted">Если переход всё же нужен, разрешите его вручную в карточке ученика («Разрешить переход»).</p>}
    <div className="actions">{children}{current?<span className="muted rec-here">Это назначение выбрано выше</span>:<button className="link" onClick={()=>onShow(r.assignment_id)}>Показать назначение</button>}</div>
  </article></li>;
}
function Pager({total,offset,size,setOffset,what}:{total:number;offset:number;size:number;setOffset:(n:number)=>void;what:string}){
  if(total<=size)return null;
  return <nav className="actions pager" aria-label={`Страницы: ${what}`}><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-size))}>Предыдущие</button><span>{offset+1}–{Math.min(offset+size,total)} из {total}</span><button disabled={offset+size>=total} onClick={()=>setOffset(offset+size)}>Следующие</button></nav>;
}
export function ModeManagement({state}:{state:State}){
  const [id,setId]=useState(state.assignments[0]?.id||''),[data,setData]=useState<Row|null>(null),[error,setError]=useState(''),[recs,setRecs]=useState<Row|null>(null),[proof,setProof]=useState<Row|null>(null),[why,setWhy]=useState<Row|null>(null),[activeOffset,setActiveOffset]=useState(0),[historyOffset,setHistoryOffset]=useState(0),[picked,setPicked]=useState<string[]>([]),[open,setOpen]=useState(''),[wholeGroup,setWholeGroup]=useState(false);
  const picker=useRef<HTMLSelectElement>(null);
  // Live offers and closed history come separately, already filtered by the teacher's groups, each paged.
  const live=useLive(async()=>{const [modes,r]=await Promise.all([id?api(`/assignments/${id}/modes`):Promise.resolve(null),api(`/recommendations?active_limit=${REC_PAGE}&active_offset=${activeOffset}&limit=${HISTORY_PAGE}&offset=${historyOffset}`)]);return {modes:modes&&{...modes,assignment_id:id},recs:r}},v=>{setData(v.modes);setRecs(v.recs)},[id,activeOffset,historyOffset]),action=useAction(live.reload);
  // A page emptied by the teacher's own actions moves back to the last page that still has offers.
  useEffect(()=>{if(recs&&recs.active.offset>0&&!recs.active.items.length&&recs.active.total>0)setActiveOffset(Math.floor((recs.active.total-1)/REC_PAGE)*REC_PAGE)},[recs]);
  useEffect(()=>{setPicked([]);setOpen('')},[id]);
  const act=(path:string,body:Row,method='PUT',success='Изменения сохранены.')=>action.run(()=>api(path,body,method),success);
  const show=(assignmentId:string)=>{setId(assignmentId);setData(null);setProof(null);setWhy(null);picker.current?.focus();picker.current?.scrollIntoView({block:'center'})};
  const activeItems:Row[]=recs?.active.items||[],historyItems:Row[]=recs?.history.items||[],activeTotal=recs?.active.total||0,historyTotal=recs?.history.total||0;
  const current=state.assignments.find(a=>a.id===id),sameGroup=state.assignments.filter(a=>a.group_id===current?.group_id);
  const titleCount=(a:Row)=>state.assignments.filter(x=>x.group_id===a.group_id&&x.title===a.title).length;
  const body=(mode:string,kind:string,reason:string)=>kind==='offer'?{offer:mode,reason}:kind==='lock'?{override:{allowed:[mode],start:mode,switching:'locked'},reason}:{clear_override:true,reason};
  const applyMany=(ids:string[],mode:string,kind:string,reason:string)=>action.run(async()=>{for(const sid of ids)await api(`/assignments/${id}/students/${sid}/mode`,body(mode,kind,reason),'PUT')},`Изменения применены: ${plural(ids.length,['ученик','ученика','учеников'])}.`);
  const savePolicy=(p:Row)=>action.run(async()=>{const targets=wholeGroup?sameGroup.map(a=>a.id):[id];const failed:string[]=[];for(const aid of targets){try{await api(`/assignments/${aid}/mode-policy`,p,'PUT')}catch(e){failed.push(`${state.assignments.find(a=>a.id===aid)?.title}: ${(e as Error).message}`)}}if(failed.length)throw new Error(`Не для всех заданий: ${failed.join('; ')}`)},wholeGroup?`Правила сохранены для всех заданий группы (${sameGroup.length}).`:'Правила группы сохранены.');
  const learners:Row[]=data?.learners||[];
  return <><Header title="Способы решения" text="Кто решает блоками, а кто уже на Python. Открытая работа ученика при этом сохраняется."/>
  <label className="mode-picker">Назначение<select ref={picker} aria-label="Назначение" value={id} onChange={e=>{setId(e.target.value);setData(null);setProof(null);setWhy(null)}}>{state.groups.map(g=>{const items=state.assignments.filter(a=>a.group_id===g.id);return items.length?<optgroup key={g.id} label={g.title}>{items.map(a=><option key={a.id} value={a.id}>{a.title}{titleCount(a)>1?` · версия ${a.version_revision}`:''}</option>)}</optgroup>:null})}</select></label>
  <LiveNote live={live}/>{action.view}{error&&<p className="error" role="alert">{error}</p>}
  {!state.assignments.length&&<p className="panel inset">Пока нет выданных заданий. Выдайте программу группе — тогда здесь появятся ученики.</p>}
  {data&&data.assignment_id===id&&<>
  <section className="panel inset"><h2>Правила группы</h2><label className="checkbox whole-group"><input type="checkbox" checked={wholeGroup} onChange={e=>setWholeGroup(e.target.checked)}/>Применить ко всем заданиям группы «{state.groups.find(g=>g.id===current?.group_id)?.title}» ({sameGroup.length})</label><PolicyForm key={JSON.stringify(data.policy)} policy={data.policy} supported={data.supported} submit={savePolicy}/></section>
  <section className="panel learner-modes" aria-labelledby="learner-modes-title"><div className="panel-heading"><h2 id="learner-modes-title">Ученики · {learners.length}</h2></div>
    {picked.length>0&&<BulkModeBar count={picked.length} modes={data.supported} busy={action.busy} apply={(mode,kind,reason)=>{void applyMany(picked,mode,kind,reason).then(()=>setPicked([]))}} clear={()=>setPicked([])}/>}
    <div className="table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Выбрать всех учеников" checked={!!learners.length&&picked.length===learners.length} onChange={e=>setPicked(e.target.checked?learners.map(l=>l.id):[])}/></th><th>Ученик</th><th>Сейчас</th><th>Разрешено</th><th>Последний результат</th><th>Изменить</th></tr></thead><tbody>
    {learners.map((s:Row)=><Fragment key={s.id}><tr><td><input type="checkbox" aria-label={`Выбрать: ${s.name}`} checked={picked.includes(s.id)} onChange={e=>setPicked(e.target.checked?[...picked,s.id]:picked.filter(x=>x!==s.id))}/></td><th scope="row">{s.name}</th><td>{label(s.modes.current)}</td><td>{s.modes.allowed.map(label).join(', ')}<small>{switching[s.modes.switching]}</small></td><td>{s.last.length?s.last.map((a:Row)=>`${label(a.mode)}: ${statusNames[a.status]||'не оценено'}`).join('; '):'В этом задании попыток нет'}</td>
      <td><form className="row-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void applyMany([s.id],String(f.get('mode')),String(f.get('action')),String(f.get('reason')||''))}}><select name="mode" aria-label={`Режим для ${s.name}`}>{data.supported.map((m:string)=><option key={m} value={m}>{label(m)}</option>)}</select><select name="action" aria-label={`Действие для ${s.name}`}><option value="offer">Разрешить переход</option><option value="lock">Закрепить режим</option><option value="free">Вернуть правила группы</option></select><input name="reason" type="hidden" value=""/><button disabled={action.busy}>Применить</button><button type="button" className="link" aria-expanded={open===s.id} onClick={()=>setOpen(open===s.id?'':s.id)}>{open===s.id?'Скрыть':'Подробнее'}</button></form></td></tr>
      {open===s.id&&<tr className="learner-more"><td colSpan={6}>
        <details open><summary>Личные разрешения</summary><PolicyForm key={JSON.stringify(s.modes)} policy={s.modes} supported={data.supported} submit={p=>act(`/assignments/${id}/students/${s.id}/mode`,{override:{allowed:p.allowed,start:p.start,switching:p.switching},reason:p.reason},'PUT',`Личные разрешения ученика ${s.name} сохранены.`)}/></details>
        <div className="actions"><button onClick={async()=>{try{setProof({...await api(`/students/${s.id}/evidence`),name:s.name})}catch(e){setError((e as Error).message)}}}>Какие решения учтены</button><button onClick={async()=>{try{setWhy({...await api(`/assignments/${id}/students/${s.id}/recommendation-check`),name:s.name})}catch(e){setError((e as Error).message)}}}>Почему есть или нет предложения</button></div>
        {why&&why.name===s.name&&<section className="recommendation-check" aria-label={`Проверка оснований: ${s.name}`}><h3>{why.ok?`Есть основание предложить «${label(why.target)}»`:'Предложения сейчас нет'}</h3><ul>{why.checks.map((c:Row)=><li key={c.rule} className={c.ok?'ok':'bad'}><Icon name={c.ok?'check':'x'} size="sm" /> {c.detail}</li>)}</ul><small>Правило {why.rule_version}: свежесть {why.rules.freshDays} дней, нужно {why.rules.minFamilies} разных задания, серия из {why.rules.recentFailures} неудач делает предложение несвоевременным.</small></section>}
        {proof&&proof.name===s.name&&<section><p>{proof.labels.join(' · ')||'Успешных решений пока нет'}</p>{proof.items.map((p:Row)=><p key={p.attempt_id}>{p.title} · {label(p.mode)} · {new Date(p.created_at).toLocaleString('ru')}{p.eligible===false&&<><br/><small className="muted">Проверка пройдена, но не учитывается: {p.reason}</small></>}</p>)}<p className="muted">{proof.limitations}</p></section>}
      </td></tr>}</Fragment>)}
    </tbody></table></div>
    {!learners.length&&<p className="inset muted">В группе этого задания пока нет учеников.</p>}
  </section>
  <details className="panel inset"><summary>История изменений</summary>{data.events.map((e:Row,i:number)=><p key={i}>{new Date(e.created_at).toLocaleString('ru')} · {state.users.find(u=>u.id===e.actor_id)?.name||'Пользователь'} · {({policy_changed:'Изменены правила группы',override_changed:'Изменены личные разрешения',offered:'Разрешён переход',offer_withdrawn:'Приглашение снято',offer_accepted:'Ученик принял переход',offer_declined:'Ученик отказался',switched:'Ученик сменил режим',teacher_set:'Выбран режим преподавателем'} as Row)[e.kind]}{e.reason?` · ${e.reason}`:''}</p>)}{!data.events.length&&<p>Изменений пока не было.</p>}</details>
  </>}
  <section className="panel recommendations inset" aria-labelledby="rec-live-title"><h2 id="rec-live-title">Действующие предложения системы{recs?`: ${activeTotal}`:''}</h2><details className="how-it-works"><summary>Как это работает</summary><p>Основание — свежие успешные решения двух разных заданий с теми же целевыми навыками, если текущее задание ещё не выполнено и в нём нет серии неудач. Преподаватель подтверждает, ученик принимает или отказывается. Если настройки или основания изменились, предложение снимается автоматически — с причиной, а приглашение ученику исчезает.</p></details>
  {recs&&!activeTotal&&<p>Сейчас действующих предложений нет.</p>}
  {activeItems.length>0&&activeItems.length<activeTotal&&<p className="muted">Показаны {activeOffset+1}–{activeOffset+activeItems.length} из {activeTotal}.</p>}
  <ul className="rec-list">{activeItems.map(r=><RecommendationCard key={r.id} r={r} current={r.assignment_id===id} onShow={show}>
    {r.status==='proposed'&&<><button className="primary" disabled={action.busy} aria-label={`Предложить ученику ${r.student_name} режим «${label(r.target_mode)}» в задании «${r.task_title}»`} onClick={()=>void act(`/recommendations/${r.id}/approve`,{},'POST',`Предложение отправлено ученику ${r.student_name} (задание ${where2(r)}). Ученик сам решит, переходить ли.`)}>Предложить ученику</button><button disabled={action.busy} aria-label={`Отклонить предложение для ${r.student_name} в задании «${r.task_title}»`} onClick={()=>void act(`/recommendations/${r.id}/dismiss`,{},'POST',`Предложение для ${r.student_name} отклонено.`)}>Отклонить</button></>}
    {r.status==='offered'&&<button disabled={action.busy} aria-label={`Отозвать предложение для ${r.student_name} в задании «${r.task_title}»`} onClick={()=>void act(`/recommendations/${r.id}/dismiss`,{},'POST',`Предложение для ${r.student_name} отозвано, приглашение у ученика снято.`)}>Отозвать предложение</button>}
  </RecommendationCard>)}</ul>
  <Pager total={activeTotal} offset={activeOffset} size={REC_PAGE} setOffset={setActiveOffset} what="действующие предложения"/>
  </section>
  <section className="panel recommendations-history inset" aria-labelledby="rec-history-title"><details><summary><h2 id="rec-history-title">История предложений{recs?`: ${historyTotal}`:''}</h2></summary>
  {recs&&!historyTotal&&<p>Закрытых предложений пока нет.</p>}
  <ul className="rec-list">{historyItems.map(r=><RecommendationCard key={r.id} r={r} current={r.assignment_id===id} onShow={show}/>)}</ul>
  <Pager total={historyTotal} offset={historyOffset} size={HISTORY_PAGE} setOffset={setHistoryOffset} what="история предложений"/>
  </details></section></>;
}
function BulkModeBar({count,modes,busy,apply,clear}:{count:number;modes:string[];busy:boolean;apply:(mode:string,kind:string,reason:string)=>void;clear:()=>void}){
  const [mode,setMode]=useState(modes.at(-1)||'python'),[kind,setKind]=useState('offer');
  return <div className="bulk-bar" role="group" aria-label="Действие для выбранных"><b>Выбрано: {count}</b><select aria-label="Режим для выбранных" value={mode} onChange={e=>setMode(e.target.value)}>{modes.map(m=><option key={m} value={m}>{label(m)}</option>)}</select><select aria-label="Действие для выбранных" value={kind} onChange={e=>setKind(e.target.value)}><option value="offer">Разрешить переход</option><option value="lock">Закрепить режим</option><option value="free">Вернуть правила группы</option></select><button className="primary" disabled={busy} onClick={()=>apply(mode,kind,'')}>Применить к выбранным</button><button className="link" onClick={clear}>Снять выбор</button></div>;
}
function PolicyForm({policy,supported,submit}:{policy:Row;supported:string[];submit:(p:Row)=>Promise<void>}){
  const [allowed,setAllowed]=useState<string[]>(policy.allowed),[start,setStart]=useState(policy.start),[kind,setKind]=useState(policy.switching),[reason,setReason]=useState('');
  return <form onSubmit={e=>{e.preventDefault();void submit({allowed,start,switching:kind,reason})}}><div className="actions">{supported.map(m=><label className="checkbox" key={m}><input type="checkbox" checked={allowed.includes(m)} onChange={e=>{const next=e.target.checked?[...allowed,m]:allowed.filter(a=>a!==m);setAllowed(next);if(!next.includes(start))setStart(next[0]||'')}}/>{label(m)}</label>)}</div><label>Начинать с<select value={start} onChange={e=>setStart(e.target.value)}>{allowed.map(m=><option key={m} value={m}>{label(m)}</option>)}</select></label><label>Кто разрешает переход<select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(switching).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><label>Причина<input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label><button disabled={!allowed.length}>Сохранить разрешения</button></form>;
}
/** «Имя; логин» rows as a teacher pastes them: from Excel (Tab), with «;» or «,», the login may be left out. */
export function parseClassList(text:string){
  return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(line=>{const parts=line.split(/\t|;|,(?=[^,]*$)/);return {name:(parts[0]||'').trim(),login:(parts.slice(1).join('').trim())}});
}
function printCards(credentials:Row[],group:string){
  const w=window.open('','_blank');if(!w)return;
  const esc=(v:string)=>v.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Карточки входа · ${esc(group)}</title><style>body{font:16px Arial,sans-serif;margin:16px}main{display:grid;grid-template-columns:repeat(2,1fr);gap:0}article{border:1px dashed #777;padding:18px;break-inside:avoid}b{font-size:20px}code{font-size:18px}</style><main>${credentials.map(c=>`<article><b>${esc(c.name)}</b><p>Сайт: ${esc(location.origin)}</p><p>Логин: <code>${esc(c.login)}</code></p><p>Пароль: <code>${esc(c.password)}</code></p></article>`).join('')}</main><script>print()<\/script>`);w.document.close();
}
export function ClassImport({state,group,refresh}:{state:State;group:string;refresh:()=>Promise<void>}){
  const [list,setList]=useState(''),[preview,setPreview]=useState<Row|null>(null),[result,setResult]=useState<Row|null>(null),[error,setError]=useState(''),[key,setKey]=useState(crypto.randomUUID()),[excluded,setExcluded]=useState<number[]>([]),[copied,setCopied]=useState(false),confirm=useConfirm();
  const rows=()=>parseClassList(list).filter((_,i)=>!excluded.includes(i+1));
  const groupTitle=state.groups.find(g=>g.id===group)?.title||'';
  const inspect=async()=>{try{setPreview(await api(`/groups/${group}/import/preview`,{rows:rows()}));setError('')}catch(e){setError((e as Error).message)}};
  useEffect(()=>{setList('');setPreview(null);setResult(null);setExcluded([])},[group]);
  const bad=(preview?.items||[]).filter((r:Row)=>r.error),good=(preview?.items||[]).length-bad.length;
  const csv=()=>{const cell=(v:string)=>'"'+String(v).replaceAll('"','""')+'"';const text=[['Имя','Логин','Пароль'],...result!.credentials.map((c:Row)=>[c.name,c.login,c.password])].map(r=>r.map(cell).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`пароли-${groupTitle||'группа'}.csv`;link.click();URL.revokeObjectURL(url)};
  return <section className="panel class-import"><h2>Подключить учеников списком</h2>
    <p>По одному ученику на строку: <b>имя; логин</b>. Можно вставить два столбца из Excel или писать через запятую. Если логин не указан, мы предложим его по имени. Личная почта не нужна.</p>
    <label>Список учеников<textarea rows={6} value={list} onChange={e=>{setList(e.target.value);setPreview(null);setExcluded([]);setKey(crypto.randomUUID())}} placeholder={'Миша Петров; misha.petrov\nАня Смирнова'}/></label>
    <button disabled={!group||!list.trim()} onClick={()=>void inspect()}>Проверить список</button>
    {error&&<p className="error" role="alert">{error}</p>}
    {preview&&<><p className={bad.length?'import-summary has-errors':'import-summary'} role="status">{bad.length?`Готовы: ${good}. С ошибкой: ${bad.length} — исправьте строки в списке или исключите их.`:`Все ${good} готовы к подключению.`}</p>
      <div className="table-scroll"><table className="import-table"><thead><tr><th>Строка</th><th>Имя</th><th>Логин</th><th>Проверка</th><th/></tr></thead><tbody>{preview.items.map((r:Row)=><tr key={r.row} className={r.error?'row-error':''}><td>{r.row}</td><td>{r.name}</td><td>{r.login}{r.suggested&&<small>предложен по имени</small>}</td><td>{r.error?<b>✗ {r.error}</b>:'✓ Готов'}</td><td>{r.error&&<button className="link" onClick={()=>{const visible=parseClassList(list).map((_,i)=>i+1).filter(n=>!excluded.includes(n));setExcluded([...excluded,visible[r.row-1]]);setPreview(null)}}>Исключить</button>}</td></tr>)}</tbody></table></div>
      <button className="primary" disabled={!preview.can_import} title={preview.can_import?undefined:'Сначала исправьте или исключите строки с ошибкой'} onClick={async()=>{try{setResult(await api(`/groups/${group}/import`,{rows:rows(),preview_hash:preview.preview_hash,request_key:key}));await refresh();setPreview(null);setList('')}catch(e){setError((e as Error).message)}}}>Подключить учеников: {good}</button>
      {!preview.can_import&&<p className="muted">Кнопка станет доступна, когда в списке не останется строк с ошибкой.</p>}</>}
    {result&&<section role="status" className="credentials"><h3>Подключено: {result.count}</h3>{result.credentials_already_issued?<><p>Эти ученики уже были подключены этим действием — повторно их не создали. Пароли показываются только один раз. Если список паролей не сохранён, сбросьте пароль нужным ученикам в разделе «Участники».</p>{result.students?.length>0&&<ul>{result.students.map((c:Row)=><li key={c.id}>{c.name}: {c.login}</li>)}</ul>}</>:<>
      <p><b>Пароли показываются один раз.</b> Распечатайте карточки или скачайте список, прежде чем закрыть его.</p>
      <div className="actions credential-actions"><button className="primary" onClick={()=>printCards(result.credentials,groupTitle)}>Печать карточек</button><button onClick={csv}>Скачать CSV</button><button onClick={async()=>{try{await navigator.clipboard.writeText(result.credentials.map((c:Row)=>`${c.name}\t${c.login}\t${c.password}`).join('\n'));setCopied(true)}catch{setCopied(false)}}}>{copied?'Скопировано ✓':'Скопировать'}</button></div>
      <div className="table-scroll"><table><thead><tr><th>Имя</th><th>Логин</th><th>Пароль</th></tr></thead><tbody>{result.credentials.map((c:Row)=><tr key={c.login}><td>{c.name}</td><td><code>{c.login}</code></td><td><code>{c.password}</code></td></tr>)}</tbody></table></div>
      <button onClick={async()=>{if(await confirm.ask({title:'Скрыть пароли навсегда?',text:<p>После этого пароли нельзя будет увидеть снова — только сбросить каждому ученику по отдельности. Вы сохранили или распечатали список?</p>,confirm:'Да, скрыть пароли',danger:true}))setResult(null)}}>Данные переданы — скрыть</button></>}</section>}
    {confirm.element}
  </section>;
}
export function GroupTeachers({state,group,refresh}:{state:State;group:string;refresh:()=>Promise<void>}){
  const teachers=state.users.filter(u=>u.role==='teacher'),current=((state as Row).group_teachers||[]).filter((g:Row)=>g.group_id===group);
  const [primary,setPrimary]=useState<string>(current.find((g:Row)=>g.kind==='primary')?.user_id||''),[co,setCo]=useState<string[]>(current.filter((g:Row)=>g.kind==='co').map((g:Row)=>g.user_id)),[note,setNote]=useState(''),[error,setError]=useState('');
  useEffect(()=>{setPrimary(current.find((g:Row)=>g.kind==='primary')?.user_id||'');setCo(current.filter((g:Row)=>g.kind==='co').map((g:Row)=>g.user_id));setNote('')},[group,JSON.stringify(current)]);
  if(!teachers.length)return <section className="panel"><h2>Преподаватели группы</h2><p>В школе пока нет преподавателей. Добавьте их в разделе «Участники» с ролью «Преподаватель».</p><a href="#users">Перейти к участникам →</a></section>;
  return <section className="panel"><h2>Преподаватели группы</h2><form onSubmit={async e=>{e.preventDefault();const items=[...(primary?[{user_id:primary,kind:'primary'}]:[]),...co.filter(id=>id!==primary).map(id=>({user_id:id,kind:'co'}))];const expected=current.map((g:Row)=>({user_id:g.user_id,kind:g.kind}));try{const saved=await api(`/groups/${group}/teachers`,{items,expected},'PUT');setError('');setNote(saved.unchanged?'Такой состав уже сохранён.':'Состав преподавателей сохранён.');await refresh()}catch(e){setNote('');setError((e as Error).message);await refresh()}}}>
    <label>Основной преподаватель<select value={primary} onChange={e=>setPrimary(e.target.value)}><option value="">Не выбран</option>{teachers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
    <fieldset className="co-teachers"><legend>Совместное преподавание</legend>{teachers.filter(u=>u.id!==primary).map(u=><label className="checkbox" key={u.id}><input type="checkbox" checked={co.includes(u.id)} onChange={e=>setCo(e.target.checked?[...co,u.id]:co.filter(id=>id!==u.id))}/>{u.name}</label>)}{teachers.length<2&&<p className="muted">Других преподавателей нет.</p>}</fieldset>
    <div className="actions"><button className="primary">Сохранить преподавателей</button></div>{note&&<p role="status" className="success-note">{note}</p>}{error&&<p className="error" role="alert">{error}</p>}</form></section>;
}
export function SchoolPanel({state,refresh}:{state:State;refresh:()=>Promise<void>}){
  const license=(state as Row).license;
  return <><Header title="Управление школой" text="Лицензия и доступ. Учеников и преподавателей подключают на странице группы."/><section className="panel license-panel"><h2>Лицензия</h2><p>Активных учеников: <b>{license?.used} из {license?.student_limit}</b>. Срок: <b>{license?.expires_at?new Date(license.expires_at).toLocaleDateString('ru'):'по прежним условиям'}</b>.</p><Badge status={license?.valid?'passed':'failed'}>{license?.valid?'Доступ открыт':'Нужно продление'}</Badge><p>Место занимает активный аккаунт ученика. Отключённые аккаунты освобождают места и сохраняют историю.</p></section>
  <section className="panel"><h2>Группы</h2>{state.groups.length?<ul className="plain-list">{state.groups.map(g=><li key={g.id}><a href={`#group/${g.id}`}>{g.title}{g.archived?' · архив':''}</a></li>)}</ul>:<p>Групп пока нет. <a href="#groups">Создайте первую группу →</a></p>}</section></>;
}
/**
 * The journal re-reads its rows on every application refresh (periodic, focus, "Обновить"), keeps the
 * teacher's filters, page and open work, ignores late answers of an older query and keeps the last good
 * rows when the connection fails. Its freshness label describes exactly the rows on screen.
 */
export function Journal({state,onAttempt,refreshedAt}:{state:State;onAttempt:(id:string,queue?:string[])=>void;refreshedAt?:string}){
  const initial=new URLSearchParams(location.hash.split('?')[1]||'');
  const [group,setGroup]=useState(''),[status,setStatus]=useState(initial.get('status')||''),[mode,setMode]=useState(''),[learner,setLearner]=useState(''),[lesson,setLesson]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[offset,setOffset]=useState(0),[data,setData]=useState<Row|null>(null),[error,setError]=useState(''),[shownAt,setShownAt]=useState(''),[stale,setStale]=useState(false);
  const query=(limit=30,off=offset)=>new URLSearchParams({group_id:group,status,mode,user_id:learner,lesson,from,to,limit:String(limit),offset:String(off)});
  const sequence=useRef(0),filters=`${group}|${status}|${mode}|${learner}|${lesson}|${from}|${to}|${offset}`,shownFilters=useRef('');
  useEffect(()=>{
    const current=++sequence.current,requested=filters;
    api('/reports?'+query()).then(d=>{if(current!==sequence.current)return;setData(d);shownFilters.current=requested;setShownAt(new Date().toISOString());setStale(false);setError('')})
      .catch(e=>{if(current!==sequence.current)return;setStale(true);setError((e as Error).message)});
  },[filters,refreshedAt]);
  const filtersPending=!!data&&shownFilters.current!==filters,any=!!(group||status||mode||learner||lesson||from||to);
  const reset=()=>{setGroup('');setStatus('');setMode('');setLearner('');setLesson('');setFrom('');setTo('');setOffset(0)};
  const when=(iso:string)=>new Date(iso).toLocaleString('ru',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  async function download(){try{const rows:Row[]=[];for(let off=0;;off+=100){const d=await api('/reports?'+query(100,off));rows.push(...d.items);if(rows.length>=d.total)break}const cell=(v:unknown)=>{let s=String(v??'');if(/^[\s=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};const csv=[['Дата','Ученик','Группа','Урок','Задание','Версия','Способ','Результат','Комментарий'],...rows.map(r=>[when(r.created_at).replace(',',''),r.name,r.group_title,r.lesson_title,r.title,r.version_revision,label(r.mode),statusNames[r.status]||r.status,r.feedback])].map(r=>r.map(cell).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');const g=state.groups.find(x=>x.id===group)?.title;link.href=url;link.download=`журнал${g?'-'+g:''}-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)}catch(e){setError((e as Error).message)}}
  const lessons=[...new Set(state.lessons.map(l=>l.title))],learners=state.users.filter(u=>u.role==='student');
  const pages=data?Math.ceil(data.total/30):0;
  // Columns that would be all dashes on this page are left out (one group, no lessons, no comments).
  const items:Row[]=data?.items||[],cols={group:new Set(items.map(r=>r.group_title)).size>1||state.groups.length>1,lesson:items.some(r=>r.lesson_title),feedback:items.some(r=>r.feedback)};
  return <><Header title="Журнал и ручная проверка" text="Все работы учеников. Название и версия задания — на момент выполнения."><button onClick={()=>void download()}>Экспорт в CSV</button></Header>
  <div className="actions filters journal-filters">
    <label>Группа<select value={group} onChange={e=>{setGroup(e.target.value);setOffset(0)}}><option value="">Все доступные</option>{state.groups.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
    <label>Ученик<select value={learner} onChange={e=>{setLearner(e.target.value);setOffset(0)}}><option value="">Все</option>{learners.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
    <label>Состояние<select value={status} onChange={e=>{setStatus(e.target.value);setOffset(0)}}><option value="">Все</option><option value="pending_review">Ожидают ручной проверки</option><option value="passed">{statusNames.passed}</option><option value="failed">{statusNames.failed}</option><option value="runtime_error">{statusNames.runtime_error}</option><option value="checker_error">{statusNames.checker_error}</option></select></label>
    {/* Rarely used filters stay folded until one of them is set. */}
    <details className="more-filters" open={!!(lesson||mode||from||to)||undefined}><summary>Ещё фильтры</summary><div className="actions filters">
      <label>Урок<select value={lesson} onChange={e=>{setLesson(e.target.value);setOffset(0)}}><option value="">Все</option>{lessons.map(l=><option key={l} value={l}>{l}</option>)}</select></label>
      <label>Способ<select value={mode} onChange={e=>{setMode(e.target.value);setOffset(0)}}><option value="">Все</option>{Object.entries(MODE_LABEL).map(([m,n])=><option key={m} value={m}>{n}</option>)}</select></label>
      <label>С<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setOffset(0)}}/></label>
      <label>По<input type="date" value={to} onChange={e=>{setTo(e.target.value);setOffset(0)}}/></label>
    </div></details>
    {any&&<button className="link" onClick={reset}>Сбросить фильтры</button>}
  </div>
  <p role="status" className={stale?'sync-warning':'muted'} data-testid="journal-freshness">{!shownAt?'Загружаем журнал…':stale?`Нет связи с сервером. Показаны данные от ${new Date(shownAt).toLocaleTimeString('ru')}.`:filtersPending?'Применяем фильтр…':`Журнал обновлён в ${new Date(shownAt).toLocaleTimeString('ru')}`}</p>{error&&!stale&&<p role="alert" className="error">{error}</p>}
  {data&&<section className="panel journal-panel" aria-busy={filtersPending}><div className="panel-heading"><h2>Работ: {data.total}</h2>{pages>1&&<span className="muted">Страница {Math.floor(offset/30)+1} из {pages}</span>}</div>
    {data.items.length?<div className="table-scroll"><table><thead><tr><th>Дата</th><th>Ученик</th>{cols.group&&<th>Группа</th>}{cols.lesson&&<th>Урок</th>}<th>Задание</th><th>Способ</th><th>Результат</th>{cols.feedback&&<th>Комментарий</th>}</tr></thead><tbody>{data.items.map((r:Row)=><tr key={r.id}><td className="nowrap">{when(r.created_at)}</td><td>{r.name}</td>{cols.group&&<td>{r.group_title||'—'}</td>}{cols.lesson&&<td>{r.lesson_title||'—'}</td>}<td><button className="link" title={`Версия задания ${r.version_revision}`} onClick={()=>onAttempt(r.id,status==='pending_review'?data.items.map((x:Row)=>x.id):undefined)}>{r.title}</button></td><td>{label(r.mode)}</td><td><Badge status={r.status}/></td>{cols.feedback&&<td>{r.feedback}</td>}</tr>)}</tbody></table></div>
    :<div className="empty"><h3>{status==='pending_review'&&!any?'Все работы проверены':any?'Нет работ по этому фильтру':'Работ пока нет'}</h3><p>{any?'Измените или сбросьте фильтры.':'Когда ученики отправят решения, они появятся здесь.'}</p>{any&&<button onClick={reset}>Сбросить фильтры</button>}</div>}
    {pages>1&&<nav className="actions pager" aria-label="Страницы журнала"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-30))}>Предыдущая страница</button><button disabled={offset+30>=data.total} onClick={()=>setOffset(offset+30)}>Следующая страница</button></nav>}
  </section>}</>;
}
