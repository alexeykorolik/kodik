import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
// Shared setup for recommendation tests: a school, a group with one learner, tasks solved in blocks.
export const printWs=(n)=>({blocks:{languageVersion:0,blocks:[{type:'text_print',id:'p',x:10,y:10,inputs:{TEXT:{block:{type:'math_number',id:'pn',fields:{NUM:n}}}}}]}});
export async function recFixture(h,tag,{admin:existingAdmin,groupTitle='Режимы'}={}){
  const admin=existingAdmin||(await h.school(tag)).admin,content=await h.content(admin),group=await h.request('/groups',{title:groupTitle},admin);
  const user=await h.request('/users',{name:`Ученик ${tag}`,login:`${tag}-kid`,password:h.password,role:'student'},admin),child={};
  await h.request(`/groups/${group.id}/members`,{user_id:user.id},admin);await h.request('/auth/login',{login:`${tag}-kid`,password:h.password},child);
  let n=40;
  async function task(){n++;const t=await h.task(admin,content.lesson,{title:`Вывод ${n}`,instruction:`Выведи число ${n}`,tests:[{inputs:[],expected:String(n),hidden:false}],reference_solution:`print(${n})`,learning_config:{modes:['blocks','mixed'],palette:['text_print','math_number'],skills:['output']},block_solution:printWs(n)});await h.request(`/tasks/${t.id}/publish`,{published:true},admin);return {...t,n}}
  const assign=(tk,g=group)=>h.request('/assignments',{group_id:g.id,task_id:tk.id,mode_policy:{allowed:['blocks','mixed','python'],start:'blocks',switching:'teacher'}},admin);
  async function solve(tk,a,num=tk.n){let job=await h.request(`/tasks/${tk.id}/submissions`,{mode:'blocks',workspace:printWs(num),assignment_id:a.id,request_key:randomUUID()},child);for(let i=0;i<200&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=await h.request(`/submissions/${job.id}`,undefined,child)}return job.result.status}
  const lists=async(client=admin,query='')=>h.request('/recommendations'+query,undefined,client);
  // Tolerates the former flat answer so lifecycle checks fail on behaviour, not on the answer shape.
  const active=async(client=admin)=>{const r=await lists(client);return r.active?r.active.items:r.items.filter(x=>['proposed','offered'].includes(x.status))};
  const row=id=>h.db.prepare('SELECT status,reason FROM recommendations WHERE id=?').get(id);
  const events=(id,kind)=>h.db.prepare('SELECT COUNT(*) n FROM recommendation_events WHERE recommendation_id=?'+(kind?' AND kind=?':'')).get(...[id,...(kind?[kind]:[])]).n;
  const learnerModes=async a=>(await h.request('/state',undefined,child)).tasks.find(x=>x.assignment_id===a.id).modes;
  const offerState=a=>h.db.prepare('SELECT offered_mode FROM assignment_mode_state WHERE assignment_id=? AND user_id=?').get(a.id,user.id)?.offered_mode??null;
  async function evidence(){for(let i=0;i<2;i++){const tk=await task(),a=await assign(tk);assert.equal(await solve(tk,a),'passed')}}
  /** A new task assignment that must receive exactly one active proposal. */
  async function nextProposal(){const tk=await task(),a=await assign(tk),list=(await active()).filter(r=>r.user_id===user.id);assert.equal(list.length,1,'exactly one active proposal');assert.equal(list[0].assignment_id,a.id);return {tk,a,rec:list[0]}}
  return {admin,content,group,user,child,task,assign,solve,lists,active,row,events,learnerModes,offerState,evidence,nextProposal};
}
