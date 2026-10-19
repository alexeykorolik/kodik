import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
// Audit item: a lost response or a parallel edit must never create a duplicate, re-reveal a secret,
// overwrite someone else's change silently or report success that did not happen. A retry of the
// same request is recognised; an intentional new request is a separate operation.
test('lost responses and parallel edits: owner, licence, client card, class import, group teachers',async t=>{
  const h=await harness();try{
    const owner=await h.school('conflict-owner');
    h.db.prepare('UPDATE users SET platform_owner=1 WHERE id=?').run(owner.user.id);
    const count=(sql,...a)=>h.db.prepare(sql).get(...a).n;

    await t.test('new client: retried create returns the same card; a new key is a new card',async()=>{
      const body={name:'Школа повтора',request_key:'company-create-retry-1'};
      const a=await h.request('/owner/companies',body,owner.admin),b=await h.request('/owner/companies',body,owner.admin);
      assert.equal(a.id,b.id);assert.equal(b.replayed,true);
      assert.equal(count("SELECT COUNT(*) n FROM companies WHERE name='Школа повтора'"),1);
      await h.request('/owner/companies',{...body,name:'Другая'},owner.admin,409);
      const c=await h.request('/owner/companies',{name:'Школа повтора',request_key:'company-create-retry-2'},owner.admin);
      assert.notEqual(c.id,a.id);
    });

    const company=await h.request('/owner/companies',{name:'Школа конфликтов',request_key:'company-conflicts-1'},owner.admin);
    const card=async()=> (await h.request('/owner/companies',undefined,owner.admin)).items.find(c=>c.id===company.id);

    await t.test('client card: retry after a lost response is success, a stale second tab is a conflict',async()=>{
      const base=await card(),edit={...base,stage:'demo',notes:'Первая вкладка',request_key:'card-edit-tab-1'};
      const saved=await h.request(`/owner/companies/${company.id}`,edit,owner.admin,200,'PUT');assert.equal(saved.revision,base.revision+1);
      const retry=await h.request(`/owner/companies/${company.id}`,edit,owner.admin,200,'PUT');assert.equal(retry.replayed,true);
      assert.equal((await card()).revision,base.revision+1,'retry did not apply twice');
      const stale=await h.request(`/owner/companies/${company.id}`,{...base,notes:'Вторая вкладка',request_key:'card-edit-tab-2'},owner.admin,409,'PUT');
      assert.equal(stale.code,'revision_conflict');assert.match(stale.error,/не сохранены/);
      assert.equal((await card()).notes,'Первая вкладка');
      await h.request(`/owner/companies/${company.id}`,{...edit,notes:'подмена'},owner.admin,409,'PUT');
    });

    let school;
    await t.test('connecting a school: lost response retried, no second school, recovery not re-revealed',async()=>{
      const body={request_key:'connect-conflicts-school',name:'Админ',login:'conflict-school-admin',password:h.password};
      school=await h.request(`/owner/companies/${company.id}/connect`,body,owner.admin);assert.ok(school.recovery);
      const again=await h.request(`/owner/companies/${company.id}/connect`,body,owner.admin);
      assert.equal(again.org_id,school.org_id);assert.equal(again.recovery,undefined);assert.equal(again.recovery_already_issued,true);
      const fresh=await h.request(`/owner/companies/${company.id}/connect`,{...body,request_key:'connect-conflicts-other'},owner.admin,409);
      assert.equal(fresh.code,'already_connected');
      assert.equal(count('SELECT COUNT(*) n FROM users WHERE login=?','conflict-school-admin'),1);
      assert.equal(count("SELECT COUNT(*) n FROM audit_log WHERE action='school.connected' AND org_id=?",school.org_id),1);
    });

    const licence=async()=> (await h.request(`/owner/schools/${school.org_id}/licenses`,undefined,owner.admin)).current;
    await t.test('licence in two tabs: retry is recognised, the other tab gets a conflict with current terms',async()=>{
      const base=await licence(),tab1={revision:base.revision,status:'active',student_limit:30,expires_at:'2099-01-01',request_key:'licence-tab-1'};
      await h.request(`/owner/schools/${school.org_id}/licenses`,tab1,owner.admin);
      const retry=await h.request(`/owner/schools/${school.org_id}/licenses`,tab1,owner.admin);assert.equal(retry.replayed,true);assert.equal(retry.current.student_limit,30);
      assert.equal((await licence()).revision,base.revision+1,'retry did not add a revision');
      const tab2=await h.request(`/owner/schools/${school.org_id}/licenses`,{revision:base.revision,status:'suspended',student_limit:5,expires_at:'2099-01-01',request_key:'licence-tab-2'},owner.admin,409);
      assert.equal(tab2.code,'revision_conflict');assert.equal((await licence()).student_limit,30);
      const next=await h.request(`/owner/schools/${school.org_id}/licenses`,{revision:base.revision+1,status:'active',student_limit:31,expires_at:'2099-01-01',request_key:'licence-tab-2-after-reload'},owner.admin);
      assert.equal(next.current.student_limit,31);
    });

    const admin={},admin2={};
    await h.request('/auth/login',{login:'conflict-school-admin',password:h.password},admin);
    const second=await h.request('/users',{name:'Завуч',login:'conflict-second-admin',password:h.password,role:'admin'},admin);void second;
    await h.request('/auth/login',{login:'conflict-second-admin',password:h.password},admin2);
    const g=await h.request('/groups',{title:'5В'},admin);

    await t.test('class import: lost response is replayed without passwords and names who was created',async()=>{
      const rows=[{name:'Аня',login:'conflict-anya'},{name:'Боря',login:'conflict-borya'}],preview=await h.request(`/groups/${g.id}/import/preview`,{rows},admin);
      const op={rows,preview_hash:preview.preview_hash,request_key:'conflict-import-class-5v'};
      const first=await h.request(`/groups/${g.id}/import`,op,admin);assert.equal(first.credentials.length,2);
      const again=await h.request(`/groups/${g.id}/import`,op,admin);
      assert.equal(again.replayed,true);assert.equal(again.credentials.length,0);assert.equal(again.credentials_already_issued,true);
      assert.deepEqual(again.students.map(s=>s.login).sort(),['conflict-anya','conflict-borya']);
      assert.ok(!JSON.stringify(again).includes(first.credentials[0].password));
      assert.ok(!h.db.prepare('SELECT response FROM pilot_operations WHERE request_key=?').get(op.request_key).response.includes(first.credentials[0].password),'no password stored');
      // A new attempt (new key) with the same list is not a silent duplicate: the logins are taken.
      const repeat=await h.request(`/groups/${g.id}/import/preview`,{rows},admin);assert.equal(repeat.can_import,false);
      await h.request(`/groups/${g.id}/import`,{...op,request_key:'conflict-import-class-5v-new',preview_hash:repeat.preview_hash},admin,409);
      assert.equal(count("SELECT COUNT(*) n FROM users WHERE login LIKE 'conflict-%' AND role='student'"),2);
      // Someone else replaying this key with another list is refused.
      await h.request(`/groups/${g.id}/import`,op,admin2,409);
    });

    await t.test('group teachers: two administrators; stale list is a conflict, a retry is success',async()=>{
      const t1=await h.request('/users',{name:'Учитель 1',login:'conflict-teacher-1',password:h.password,role:'teacher'},admin);
      const t2=await h.request('/users',{name:'Учитель 2',login:'conflict-teacher-2',password:h.password,role:'teacher'},admin);
      const base=[];
      const mine=[{user_id:t1.id,kind:'primary'}];
      await h.request(`/groups/${g.id}/teachers`,{items:mine,expected:base},admin,200,'PUT');
      const retry=await h.request(`/groups/${g.id}/teachers`,{items:mine,expected:base},admin,200,'PUT');assert.equal(retry.unchanged,true);
      const other=await h.request(`/groups/${g.id}/teachers`,{items:[{user_id:t2.id,kind:'primary'}],expected:base},admin2,409,'PUT');
      assert.equal(other.code,'revision_conflict');assert.deepEqual(other.items,[{user_id:t1.id,kind:'primary'}]);
      const rows=h.db.prepare('SELECT user_id,kind FROM group_teachers WHERE group_id=?').all(g.id).map(r=>({...r}));
      assert.deepEqual(rows,[{user_id:t1.id,kind:'primary'}],'the first administrator\'s choice is not overwritten');
      await h.request(`/groups/${g.id}/teachers`,{items:[{user_id:t1.id,kind:'primary'},{user_id:t2.id,kind:'co'}],expected:other.items},admin2,200,'PUT');
      const audit=h.db.prepare("SELECT details FROM audit_log WHERE action='group.teachers_changed' AND target_id=? ORDER BY created_at").all(g.id);
      assert.equal(audit.length,2);assert.ok(JSON.parse(audit[1].details).before.length===1);
    });
  }finally{await h.close()}
});
