import {useEffect,useRef,useState} from 'react';
import {api,type Row,type State} from './api';
import {Workspace} from './Workspace';
import {HelpButton} from './PilotPanels';
import {useConfirm} from './confirm';
import {runCourseProgram} from '../pythonExecution';
import {PlaybackBar,SceneView,usePlayback} from './SceneView';
import type {Scene} from '../python/scene';
const labels:Record<string,string>={text:'Объяснение',code:'Пример кода',practice:'Практика',question:'Вопрос',final:'Самостоятельная задача',summary:'Итог'};
/** Runs the lesson's example in the browser: the child sees what it prints right on the step. */
export function ExampleRunner({code}:{code:string}){
  const needsInput=/input\s*\(/.test(code),[input,setInput]=useState('4'),[out,setOut]=useState<{output:string[];error?:string;scene?:Scene;times?:number[]}|null>(null);
  // Each press is a new run: fresh modules, a clean scene and the animation from the start.
  const playback=usePlayback(out?.scene?.duration??0,out);
  const lines=out&&out.times&&playback.state!=='done'?out.output.filter((_,i)=>out.times![i]<=playback.t):out?.output;
  return <div className="example-runner">
    {needsInput&&<label className="example-input">Что ввести<input value={input} onChange={e=>setInput(e.target.value)} maxLength={40}/></label>}
    <button type="button" className="primary small" onClick={()=>{try{const r=runCourseProgram(code,needsInput?input.split('\n'):[]);setOut({output:r.output,error:r.error,scene:r.scene,times:r.outputTimes})}catch(e){setOut({output:[],error:(e as Error).message})}}}>{out?'↻ Запустить ещё раз':'▷ Запустить пример'}</button>
    {out?.scene&&<><PlaybackBar playback={playback}/><SceneView scene={out.scene} t={playback.t}/></>}
    {out&&(!out.scene||out.error||(lines?.length??0)>0)&&<pre className="example-output" role="status" aria-label="Что напечатал пример">{out.error&&(playback.state==='done'||!out.scene)?`${lines?.length?lines.join('\n')+'\n':''}Ошибка: ${out.error}`:lines?.join('\n')||'(ничего)'}</pre>}
  </div>;
}
/**
 * One lesson of a programme. It re-reads the lesson on every application refresh (periodic, focus) so an
 * archive or closing done elsewhere shows up; a late answer of an older request never replaces newer data.
 */
export function LessonRun({id,state,refresh,onBack,onAttempt,refreshedAt}:{id:string;state:State;refresh:()=>Promise<void>;onBack:()=>void;onAttempt:(id:string)=>void;refreshedAt?:string}){
  const [data,setData]=useState<Row|null>(null),[selected,setSelected]=useState(''),[answer,setAnswer]=useState<number|null>(null),[feedback,setFeedback]=useState<Row|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[help,setHelp]=useState<Row[]>([]);
  const sequence=useRef(0),mounted=useRef(true),student=state.user.role==='student',confirm=useConfirm();
  async function load(){const generation=++sequence.current;const next=await api(`/lesson-runs/${id}`);if(mounted.current&&generation===sequence.current){setData(next);setSelected(current=>current||next.lesson.steps.find((s:Row)=>next.progress.find((p:Row)=>p.step_id===s.id)?.status!=='completed')?.id||next.lesson.steps.at(-1)?.id||'')}return next}
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++}},[id]);
  useEffect(()=>{void load().catch(e=>{if(mounted.current)setError(e.message)})},[id,state.attempts,refreshedAt]);
  // The teacher sees who is waiting for help right in the step matrix.
  useEffect(()=>{if(student)return;api(`/help?limit=1&lesson_run_id=${encodeURIComponent(id)}`).then(r=>{if(mounted.current)setHelp(r.open.items)}).catch(()=>{})},[id,refreshedAt,student]);
  const steps:Row[]=data?.lesson.steps||[],step=steps.find(s=>s.id===selected),index=steps.findIndex(s=>s.id===selected),completed=(data?.progress||[]).filter((p:Row)=>p.status==='completed').length,firstPending=steps.findIndex(s=>data?.progress.find((p:Row)=>p.step_id===s.id)?.status!=='completed');
  const goNext=(next:Row)=>{const unfinished=next.lesson.steps.find((s:Row)=>next.progress.find((p:Row)=>p.step_id===s.id)?.status!=='completed');setSelected(unfinished?.id||next.lesson.steps.at(-1)?.id);setAnswer(null);setFeedback(null)};
  async function complete(){setBusy(true);setError('');try{const result=await api(`/lesson-runs/${id}/steps/${selected}`,step?.type==='question'?{answer}:{acknowledged:true});const next=await load();
    // A question shows its verdict and the author's explanation; the child moves on when ready.
    if(step?.type==='question')setFeedback(result);else if(result.status==='completed')goNext(next);await refresh()}catch(e){setFeedback(null);setError((e as Error).message);await load().catch(()=>{})}finally{setBusy(false)}}
  async function setLessonState(next:'open'|'closed'){
    if(next==='closed'&&!await confirm.ask({title:'Завершить занятие?',text:<p>Ученики больше не смогут отвечать и отправлять решения в этом занятии. Всё, что уже сделано, сохранится, а работы останутся в журнале.</p>,confirm:'Завершить занятие',danger:true}))return;
    try{await api(`/lesson-runs/${id}/state`,{state:next,revision:data!.state_revision});await load();await refresh()}catch(e){setError((e as Error).message);await load().catch(()=>{})}
  }
  if(!data)return <section className="panel"><button onClick={onBack}>← К программе</button><p role="status">{error||'Открываем занятие…'}</p></section>;
  const assignment=data.assignments.find((a:Row)=>a.step_id===selected),passed=data.progress.find((p:Row)=>p.step_id===selected)?.status==='completed';
  // The server refuses new learning actions when the lesson is not open or its group is archived.
  const archived=!!data.group_archived,writable=data.state==='open'&&!archived;
  if(student&&assignment&&step)return <Workspace key={assignment.id} task={assignment.task} state={state} refresh={async()=>{await refresh();await load()}} onBack={()=>{setSelected('');onBack()}} backLabel={`← ${data.lesson.title} · программа`} nextTask={index<steps.length-1?{title:steps[index+1].title}:undefined} onNext={async()=>{const next=await load();goNext(next)}} readOnly={!writable} lessonContext={`Урок · шаг ${index+1} из ${steps.length}`} onLessonOverview={()=>setSelected(steps[0].id)}/>;
  const example=steps.find(s=>s.type==='code')?.code,finished=student&&completed===steps.length;
  const stateLabel=archived?'Группа в архиве':data.state==='open'?'Открыто для учеников':data.state==='closed'?'Занятие завершено':'Ещё не открыто';
  const waiting=(uid:string)=>help.filter(h=>h.user_id===uid);
  const learners:Row[]=[...(data.students||[])].sort((a,b)=>waiting(b.id).length-waiting(a.id).length);
  const done=learners.filter(s=>steps.every(st=>s.progress.find((p:Row)=>p.step_id===st.id)?.status==='completed')).length;
  const matrix=!student&&<section className="panel lesson-journal" aria-labelledby="lesson-matrix-title"><div className="lesson-journal-heading"><h2 id="lesson-matrix-title">Работа группы по шагам</h2><p className="lesson-summary"><b>Прошли урок: {done} из {learners.length}</b>{help.length>0&&<span className="help-count">✋ Ждут помощи: {help.length} · <a href="#classroom">ответить</a></span>}</p></div><p className="muted">Отмечены сохранённые ответы и результаты. Это не отметка присутствия.</p><div className="table-scroll"><table className="step-matrix"><thead><tr><th scope="col">Ученик</th>{steps.map((s,i)=><th scope="col" key={s.id} title={s.title}>{i+1}. {s.title}</th>)}</tr></thead><tbody>{learners.map((s:Row)=><tr key={s.id} className={waiting(s.id).length?'needs-help':''}><th scope="row"><span className="learner-name" title={s.name}>{s.name}</span>{waiting(s.id).length>0&&<span className="matrix-help" title={waiting(s.id).map(h=>h.message).join('\n')}>✋ ждёт помощи</span>}</th>{steps.map(step=>{const p=s.progress.find((p:Row)=>p.step_id===step.id),failed=['failed','runtime_error'].includes(p?.attempt_status);return <td key={step.id}><button disabled={!p?.attempt_id} className={`cell ${p?.status==='completed'?'ok':failed||p?.status==='incorrect'?'bad':''}`} onClick={()=>p?.attempt_id&&onAttempt(p.attempt_id)} title={p?.updated_at?new Date(p.updated_at).toLocaleString('ru'):''}>{p?.status==='completed'?'✓ Завершено':p?.attempt_status==='pending_review'?'На проверке':failed?'✗ Не получилось':p?.status==='incorrect'?'✗ Неверный ответ':p?.status==='started'?'Начато':'—'}</button></td>})}</tr>)}</tbody></table></div>{!learners.length&&<p>Пока нет подключённых учеников. Добавьте участников в программу явно.</p>}</section>;
  return <section className={`lesson-run-screen ${student?'':'teacher-run'}`}>
    <button className="link" onClick={onBack}>← К программе</button>
    <div className="page-heading"><div><div className="eyebrow">{student?'УРОК':'ПРОВЕДЕНИЕ ЗАНЯТИЯ'} · {data.group_title}</div><h1>{data.lesson.title}</h1><p>{data.lesson.goal}{!student&&` · около ${data.lesson.duration} минут`}</p></div><div className="actions">{!student&&<><span className={`state-chip ${data.state}`} role="status">{stateLabel}</span>{data.state!=='open'&&!archived&&!data.program_archived&&<button className="primary" onClick={()=>void setLessonState('open')}>Открыть занятие для класса</button>}{data.state==='open'&&!data.program_archived&&<button onClick={()=>void setLessonState('closed')}>Завершить занятие</button>}</>}</div></div>
    {student&&<div className="lesson-progress"><b>Завершено {completed} из {steps.length} шагов</b><progress value={completed} max={steps.length}/></div>}
    {student&&step&&!archived&&!finished&&<HelpButton lessonRunId={id} stepId={step.id}/>}
    {archived?<p className="notice view-only-note" role="status" data-testid="view-only-note">{student?'Группа в архиве: занятие доступно для просмотра. Материалы, ответы и результаты сохранены; новые шаги и ответы не записываются.':'Группа в архиве: журнал и результаты группы доступны для просмотра. Открыть занятие нельзя — сначала администратор возвращает группу из архива.'}</p>
    :data.state!=='open'&&<p className="notice">{data.state==='closed'?'Занятие завершено. Материалы и результаты доступны для просмотра.':'Занятие ещё не открыто ученикам.'}</p>}
    {matrix}
    {!student&&<details className="panel teacher-notes"><summary>Заметки преподавателя · ученики их не видят</summary><p>{data.lesson.teacher_notes||'Заметки не добавлены.'}</p></details>}
    {error&&<p className="error" role="alert">{error}</p>}
    {finished?<div className="lesson-finished" role="status"><span className="finish-mark" aria-hidden="true">★</span><h2>Урок завершён!</h2><p>Все шаги пройдены — отличная работа. Результаты сохранены, учитель их видит.</p>{steps.find(s=>s.type==='summary')?.body&&<p className="lesson-prose">{steps.find(s=>s.type==='summary')!.body}</p>}<button className="primary" onClick={onBack}>К следующим занятиям →</button><button className="link" onClick={()=>setSelected(steps[0].id)}>Посмотреть шаги ещё раз</button></div>:
    <div className="lesson-editor-layout"><nav className="panel lesson-outline" aria-label="Шаги урока"><ol>{steps.map((s,i)=>{const isDone=data.progress.find((p:Row)=>p.step_id===s.id)?.status==='completed';return <li key={s.id}><button disabled={student&&firstPending>=0&&i>firstPending} className={`${selected===s.id?'selected-step':''}${isDone?' done-step':''}`} aria-current={selected===s.id?'step':undefined} onClick={()=>{setSelected(s.id);setAnswer(null);setFeedback(null)}}>{i+1}. {s.title}<small>{isDone?'✓ Завершено':student?(i===firstPending?'Сейчас':''):labels[s.type]}</small></button></li>})}</ol></nav><article className={`panel lesson-material tone-${step?.type}`}>
      {step&&<><span className="overline">Шаг {index+1} из {steps.length}{student?'':` · ${labels[step.type]}`}</span><h2>{step.title}</h2>
        {step.type==='question'&&example&&<pre className="lesson-code question-example" aria-label="Пример из урока">{example}</pre>}
        <p className="lesson-prose">{step.body}</p>
        {step.type==='code'&&<><pre className="lesson-code">{step.code}</pre><ExampleRunner key={step.id} code={step.code}/></>}
        {!student&&assignment&&<><h3>{assignment.task.title}</h3><p>{assignment.task.instruction}</p><p className="muted">Результат появится в таблице выше.</p></>}
        {step.type==='question'&&<fieldset className="question-choices" disabled={busy||!writable||feedback?.correct||passed&&student}>{step.choices.map((choice:string,i:number)=><label className={`question-choice${answer===i?' chosen':''}${!student&&i===step.correct_index?' correct':''}`} key={i}><input type="radio" name={`answer-${step.id}`} checked={answer===i} onChange={()=>{setAnswer(i);if(!feedback?.correct)setFeedback(null)}}/><span>{choice}{!student&&i===step.correct_index?' · правильный ответ':''}</span></label>)}</fieldset>}
        {feedback&&<div className={`answer-feedback ${feedback.correct?'right':'wrong'}`} role="status"><b>{feedback.correct?'✓ ':''}{feedback.message}</b>{feedback.explanation&&<p>{feedback.explanation}</p>}</div>}
        {student&&(feedback?.correct||step.type==='question'&&passed&&!feedback?<button className="primary" onClick={()=>void load().then(goNext)}>Дальше →</button>:<button className="primary" disabled={busy||!writable||step.type==='question'&&answer===null&&!passed} onClick={()=>void complete()}>{busy?'Сохраняем шаг…':step.type==='question'&&!passed?'Ответить':'Продолжить'}</button>)}</>}
    </article></div>}
    {confirm.element}
  </section>;
}
