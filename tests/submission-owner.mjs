import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
// Audit of 32fc6fd: on a shared computer Аня's stored operation was repeated from her old tab after Боря
// had signed in from a neighbouring tab. The server looked the key up among Боря's work only, found
// nothing, and accepted Аня's program as a new check of Боря's (the assignment is shared, so the usual
// access check passed). A tab now names whose work it acts for; the server compares it with the session
// before any lookup or write, and a tab of the earlier release (no protocol header) cannot act at all.
test('an operation of one learner is never performed under another learner of the same browser',async()=>{
  const h=await harness();try{
    const {admin,user:head}=await h.school('owner'),base=await h.content(admin),group=await h.request('/groups',{title:'Общий компьютер'},admin);
    const learner=async(login)=>{const u=await h.request('/users',{name:login==='owner-anya'?'Аня':'Боря',login,password:h.password,role:'student'},admin);await h.request(`/groups/${group.id}/members`,{user_id:u.id},admin);return {...u,org_id:head.org_id}};
    const anya=await learner('owner-anya'),borya=await learner('owner-borya');
    const task=await h.task(admin,base.lesson,{title:'Удвоение'});await h.request(`/tasks/${task.id}/publish`,{published:true},admin);
    const assignment=await h.request('/assignments',{group_id:group.id,task_id:task.id},admin);
    // One browser: one cookie jar shared by every tab.
    const browser={};
    const call=async(path,{body,method=body===undefined?'GET':'POST',owner,protocol=true}={})=>{
      const r=await fetch(h.origin+'/api'+path,{method,headers:{Origin:h.origin,'Content-Type':'application/json',Cookie:browser.cookie,...(protocol?{'X-Kodik-Client':'2'}:{}),...(owner?{'X-Kodik-User':owner.id,'X-Kodik-Org':owner.org_id}:{})},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:r.status,data:await r.json()};
    };
    const signIn=async(login)=>{const r=await fetch(h.origin+'/api/auth/login',{method:'POST',headers:{Origin:h.origin,'Content-Type':'application/json'},body:JSON.stringify({login,password:h.password})});assert.equal(r.status,200);browser.cookie=r.headers.get('set-cookie').split(';')[0]};
    // Everything a learner owns, by table: nothing may appear for Боря from Аня's tab.
    const tables=h.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t=>t.name).filter(n=>h.db.prepare(`PRAGMA table_info(${n})`).all().some(c=>c.name==='user_id'));
    const footprint=(u)=>Object.fromEntries(tables.map(n=>[n,h.db.prepare(`SELECT COUNT(*) n FROM ${n} WHERE user_id=?`).get(u.id).n]));
    const program={mode:'python',code:'print(int(input())*2)',assignment_id:assignment.id,request_key:'anya-shared-key'};

    await signIn('owner-anya');
    const accepted=await call(`/tasks/${task.id}/submissions`,{body:program,owner:anya});
    assert.equal(accepted.status,200,JSON.stringify(accepted.data));
    let job=accepted.data;for(let i=0;i<200&&job.status!=='completed';i++){await new Promise(r=>setTimeout(r,25));job=(await call(`/submissions/${job.id}`,{owner:anya})).data}
    assert.equal(job.result.status,'passed');
    // Аня's response was lost; Боря signs in from the neighbouring tab of the same browser.
    await signIn('owner-borya');
    const before={anya:footprint(anya),borya:footprint(borya)};

    // The new tab names Аня: every kind of request is refused before anything happens.
    const refusals=[
      [`/tasks/${task.id}/submissions`,{body:program}],
      [`/tasks/${task.id}/submissions`,{body:{...program,request_key:'anya-unknown-key'}}],
      [`/tasks/${task.id}/draft`,{body:{code:'print(1)',revision:0,assignment_id:assignment.id},method:'PUT'}],
      [`/tasks/${task.id}/draft`,{body:{mode:'blocks',workspace:{blocks:{languageVersion:0,blocks:[]}},revision:0,assignment_id:assignment.id},method:'PUT'}],
      [`/tasks/${task.id}/run`,{body:{mode:'python',code:'print(1)',inputs:[],assignment_id:assignment.id}}],
      [`/submissions/${job.id}`,{}],
      [`/submissions/${job.id}`,{body:{},method:'DELETE'}],
      ['/state',{}],
      ['/auth/logout',{body:{}}],
    ];
    for(const [path,options] of refusals){
      const r=await call(path,{...options,owner:anya});
      assert.equal(r.status,409,`${path}: ${JSON.stringify(r.data)}`);
      assert.equal(r.data.code,'owner_mismatch');
      assert.equal(r.data.session_user.id,borya.id);
    }
    // Another school named by the tab is refused the same way.
    assert.equal((await call('/state',{owner:{id:borya.id,org_id:'another-school'}})).data.code,'owner_mismatch');
    // A tab of the earlier release names nobody: it cannot repeat Аня's operation or read her check,
    // and it gets no learner data at all until it is reloaded. Боря's session is not ended.
    const old=(path,options)=>call(path,{...options,protocol:false});
    for(const [path,options] of [[`/tasks/${task.id}/submissions`,{body:program}],[`/submissions/${job.id}`,{}]]){
      const r=await old(path,options);assert.equal(r.status,401,JSON.stringify(r.data));assert.equal(r.data.code,'owner_mismatch');
    }
    for(const [path,options] of [[`/tasks/${task.id}/submissions`,{body:{...program,request_key:'anya-unknown-key'}}],[`/tasks/${task.id}/draft`,{body:{code:'print(1)',revision:0,assignment_id:assignment.id},method:'PUT'}],[`/tasks/${task.id}/run`,{body:{mode:'python',code:'print(1)',inputs:[],assignment_id:assignment.id}}],['/state',{}]]){
      const r=await old(path,options);assert.equal(r.status,409,`${path}: ${JSON.stringify(r.data)}`);assert.equal(r.data.code,'client_outdated');
    }
    assert.deepEqual(footprint(borya),before.borya,'Боря got nothing from Аня\'s tabs');
    assert.deepEqual(footprint(anya),before.anya,'Аня\'s work is unchanged');
    // Боря's own tab still works: the session was not ended, and his own work is his.
    const own=await call('/state',{owner:borya});assert.equal(own.status,200);assert.equal(own.data.user.id,borya.id);
    const mine=await call(`/tasks/${task.id}/draft`,{body:{code:'print(2)',revision:0,assignment_id:assignment.id},method:'PUT',owner:borya});assert.equal(mine.status,200,JSON.stringify(mine.data));
    // A header can only confirm the session, never pick an author: Боря's own key is Боря's work.
    const his=await call(`/tasks/${task.id}/submissions`,{body:{...program,request_key:'borya-own-key-1'},owner:borya});assert.equal(his.status,200,JSON.stringify(his.data));
    assert.equal(h.db.prepare('SELECT user_id FROM submission_jobs WHERE id=?').get(his.data.id).user_id,borya.id);

    // Аня comes back: her operation is recovered by the same key, without a second check or attempt.
    await signIn('owner-anya');
    const back=await call(`/tasks/${task.id}/submissions`,{body:program,owner:anya});
    assert.equal(back.status,200);assert.equal(back.data.id,job.id);
    assert.equal(h.db.prepare("SELECT COUNT(*) n FROM submission_jobs WHERE user_id=? AND request_key='anya-shared-key'").get(anya.id).n,1);
    assert.equal(h.db.prepare('SELECT COUNT(*) n FROM attempts WHERE user_id=?').get(anya.id).n,1);
    assert.equal(h.db.prepare("SELECT COUNT(*) n FROM submission_jobs WHERE request_key='anya-shared-key'").get().n,1,'nobody else has a check with Аня\'s key');
    // Her own tab of the earlier release may still recover her own accepted check, and nothing more.
    const legacy=await old(`/tasks/${task.id}/submissions`,{body:program});assert.equal(legacy.status,200);assert.equal(legacy.data.id,job.id);
    assert.equal((await old(`/submissions/${job.id}`,{})).status,200);
    // Teachers are not affected by the learner protocol check.
    browser.cookie=admin.cookie;assert.equal((await old('/state',{})).status,200);
  }finally{await h.close()}
});
