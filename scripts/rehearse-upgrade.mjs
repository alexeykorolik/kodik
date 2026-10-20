// Upgrade rehearsal on a COPY of a filled database: restore + migrate with this release, prove every
// existing record is unchanged, then exercise the working flows over HTTP, including the confirmation
// of the checking environment for already issued work. The source database is opened read-only.
//   node scripts/rehearse-upgrade.mjs FILLED.sqlite NEW_REHEARSAL.sqlite
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyBackup} from './verify-backup.mjs';
import {createApp} from '../server/b2b/app.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
export async function rehearseUpgrade(source,target,password='Fill-pilot-data-321!'){
  source=resolve(source);target=resolve(target);
  const old=new DatabaseSync(source,{readOnly:true});let before;
  try{
    const count=t=>{try{return old.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n}catch{return null}};
    const hasRuntime=old.prepare('PRAGMA table_info(attempts)').all().some(c=>c.name==='runtime');
    before={schema:old.prepare('PRAGMA user_version').get().user_version,runtimes:JSON.stringify(old.prepare(`SELECT id,${hasRuntime?'runtime':'NULL runtime'} FROM attempts ORDER BY id`).all().map(r=>({...r}))),jobs:old.prepare('SELECT id,status,result,attempt_id FROM submission_jobs ORDER BY id').all().map(r=>({...r})),
      counts:Object.fromEntries(['licenses','companies','assignments','assignment_drafts','assignment_block_drafts','attempts','review_history','recommendations','recommendation_events','mode_events','help_requests','task_versions','users','groups_'].map(t=>[t,count(t)])),
      recommendations:JSON.stringify(old.prepare(`SELECT id,assignment_id,user_id,target_mode,rule_version,basis,status,${old.prepare('PRAGMA table_info(recommendations)').all().some(c=>c.name==='reason')?'reason':'NULL reason'},created_at,teacher_id FROM recommendations ORDER BY id`).all().map(r=>({...r}))),
      offers:JSON.stringify(old.prepare('SELECT assignment_id,user_id,mode,offered_mode,override FROM assignment_mode_state ORDER BY assignment_id,user_id').all().map(r=>({...r}))),
      archived:JSON.stringify(old.prepare('SELECT id,archived FROM groups_ ORDER BY id').all().map(r=>({...r})))};
  }finally{old.close()}
  const restore=await verifyBackup(source,target);
  const report={source,target,from_schema:before.schema,restore,checks:[]};
  const check=(name,ok,detail='')=>{report.checks.push({name,ok:!!ok,detail});if(!ok)throw new Error(`${name}: ${detail}`)};
  const db=new DatabaseSync(target);
  try{
    check('submission jobs kept with status and result',JSON.stringify(db.prepare('SELECT id,status,result,attempt_id FROM submission_jobs ORDER BY id').all().map(r=>({...r})))===JSON.stringify(before.jobs));
    for(const [t,n] of Object.entries(before.counts))if(n!==null)check(`rows kept: ${t}`,db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n===n,String(n));
    // Recommendations, invitations and archived groups keep their values; links and closing times are derived.
    check('recommendations unchanged',JSON.stringify(db.prepare('SELECT id,assignment_id,user_id,target_mode,rule_version,basis,status,reason,created_at,teacher_id FROM recommendations ORDER BY id').all().map(r=>({...r})))===before.recommendations);
    check('invitations and permissions unchanged',JSON.stringify(db.prepare('SELECT assignment_id,user_id,mode,offered_mode,override FROM assignment_mode_state ORDER BY assignment_id,user_id').all().map(r=>({...r})))===before.offers);
    check('archived groups unchanged',JSON.stringify(db.prepare('SELECT id,archived FROM groups_ ORDER BY id').all().map(r=>({...r})))===before.archived);
    if(db.prepare('PRAGMA table_info(assignment_mode_state)').all().some(c=>c.name==='offer_recommendation_id')){
      check('a sent recommendation owns its invitation, a manual offer stays with the teacher',db.prepare("SELECT COUNT(*) n FROM assignment_mode_state s JOIN recommendations r ON r.id=s.offer_recommendation_id WHERE r.status='offered'").get().n===db.prepare("SELECT COUNT(*) n FROM recommendations WHERE status='offered'").get().n);
      check('closed recommendations have a closing time',db.prepare("SELECT COUNT(*) n FROM recommendations WHERE status NOT IN ('proposed','offered') AND closed_at IS NULL").get().n===0);
    }
    check('history keeps the environment it was produced in',JSON.stringify(db.prepare('SELECT id,runtime FROM attempts ORDER BY id').all().map(r=>({...r})))===before.runtimes);
  }finally{db.close()}
  const {server}=createApp({dbPath:target,secure:false});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const call=async(c,path,body,method='POST')=>{const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':method,headers:{Origin:origin,'X-Kodik-Client':'2','Content-Type':'application/json',...(c.cookie?{Cookie:c.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))c.cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()}};
  const login=async n=>{const c={};const r=await call(c,'/auth/login',{login:n,password});check(`login ${n}`,r.status===200,JSON.stringify(r.data));return c};
  try{
    const anya=await login('fill-anya'),borya=await login('fill-borya'),teacher=await login('fill-teacher'),owner=await login('fill-owner');
    const a=(await call(anya,'/state')).data;check('block draft restored',a.block_drafts?.length===1&&JSON.stringify(a.block_drafts[0].workspace).includes('kodik_input_int'));
    check('learner sees own attempts',a.attempts.length===1&&a.attempts[0].status==='passed'&&a.attempts[0].mode==='blocks');
    const b=(await call(borya,'/state')).data;check('Python draft restored',b.drafts?.some(d=>d.code.includes('думаю')));
    const journal=(await call(teacher,'/reports')).data;check('journal lists all attempts',journal.total===4,String(journal.total));
    const manual=journal.items.find(i=>i.title==='Опиши программу');check('manual grade kept',manual?.status==='passed');
    const reviews=(await call(teacher,`/attempts/${manual.id}/reviews`)).data.items;check('review history kept',reviews.length===1&&reviews[0].after_feedback==='Хорошее объяснение.');
    const recs=(await call(teacher,'/recommendations')).data,listed=[...recs.active.items,...recs.history.items];check('recommendations listed',listed.length===before.counts.recommendations&&recs.active.total+recs.history.total===before.counts.recommendations,JSON.stringify([recs.active.total,recs.history.total]));
    const sent=recs.active.items.find(r=>r.status==='offered'&&r.student_name==='Боря');check('sent recommendation still live with its context',!!sent&&sent.task_title==='Удвой число'&&sent.group_title==='7А');
    check('its invitation still reaches the learner',b.tasks.find(t=>t.title==='Удвой число').modes.offered==='mixed');
    check('teacher withdraws it; the invitation disappears',(await call(teacher,`/recommendations/${sent.id}/dismiss`,{})).data.status==='withdrawn'&&(await call(borya,'/state')).data.tasks.find(t=>t.title==='Удвой число').modes.offered===null);
    check('the teacher own offer is kept',(await call(anya,'/state')).data.tasks.find(t=>t.title==='Удвой число').modes.offered==='mixed');
    const archivedTask=a.tasks.find(t=>t.group_title==='Архив 6В');check('archived group: view stays, new checks refused',archivedTask?.group_archived===true&&(await call(anya,`/tasks/${archivedTask.id}/submissions`,{assignment_id:archivedTask.assignment_id,code:'print(1)',request_key:crypto.randomUUID()})).data.code==='group_archived');
    check('archived group draft kept',a.drafts.some(d=>d.code==='print("черновик в архиве")'));
    const help=(await call(teacher,'/help')).data.items;check('help request kept',help.length===1);
    const company=(await call(owner,'/owner/companies')).data.items.find(c=>c.name==='Школа «Пилот»');check('licence and client card kept',company?.license?.valid&&company.license.student_limit===40&&company.notes==='Пилот на два класса');
    const task=b.tasks.find(t=>t.title==='Удвой число');
    const submit=()=>call(borya,`/tasks/${task.id}/submissions`,{assignment_id:task.assignment_id,code:'n = int(input())\nprint(n * 2)',request_key:crypto.randomUUID()});
    const held=await submit();
    report.environment_before_confirmation=held.status===409?held.data.code:'accepted';
    if(held.status===409)check('unconfirmed environment refuses new grades, keeps drafts',held.data.code==='runtime_unconfirmed');
    // A dry run reports and changes nothing.
    const state=()=>{const d=new DatabaseSync(target,{readOnly:true});try{return JSON.stringify([d.prepare('SELECT id,status,updated_at FROM submission_jobs ORDER BY id').all(),d.prepare('SELECT COUNT(*) n FROM task_verifications').get(),d.prepare('SELECT COUNT(*) n FROM audit_log').get(),d.prepare('SELECT id,verification_id FROM task_versions ORDER BY id').all()])}finally{d.close()}};
    const beforeDry=state();report.dry_run=JSON.parse(execFileSync(process.execPath,[join(root,'scripts/reverify-published.mjs'),'--db',target,'--dry-run'],{encoding:'utf8'}));
    check('dry run leaves the database unchanged',state()===beforeDry&&report.dry_run.dry_run===true);
    report.reverify=JSON.parse(execFileSync(process.execPath,[join(root,'scripts/reverify-published.mjs'),'--db',target],{encoding:'utf8'}));
    let job=(await submit()).data;for(let i=0;i<300&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,30));job=(await call(borya,`/submissions/${job.id}`)).data}
    check('new check after confirmation',job.status==='completed'&&job.result?.status==='passed',JSON.stringify(job).slice(0,200));
    check('new result records its environment',!!job.runtime);
    // When the environment was already confirmed for these versions, the first check was accepted as well.
    if(held.status!==409){let first=held.data;for(let i=0;i<300&&first.status!=='completed';i++){await new Promise(r=>setTimeout(r,30));first=(await call(borya,`/submissions/${first.id}`)).data}}
    const doubled=(await call(teacher,'/reports')).data.items.filter(i=>i.title==='Удвой число').length;check('old attempts unchanged after reverify',doubled===(held.status===409?4:5),String(doubled));
  }finally{await new Promise(r=>server.close(r))}
  report.ok=report.checks.every(c=>c.ok);
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(!process.argv[2]||!process.argv[3])throw new Error('Usage: node scripts/rehearse-upgrade.mjs FILLED.sqlite NEW_REHEARSAL.sqlite');
  console.log(JSON.stringify(await rehearseUpgrade(process.argv[2],process.argv[3]),null,1));
}
