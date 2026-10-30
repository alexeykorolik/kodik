import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/b2b-harness.mjs';
import {recFixture} from './helpers/rec-fixture.mjs';
// Audit of ae54497: locking the mode, forbidding the target mode or finishing the task closed a
// proposal only before it was sent. A sent ("offered") recommendation stayed active, kept its
// invitation (which came back when permissions returned) and blocked every next proposal.
test('sent recommendations lose force with a reason, free the next proposal and never come back',async(t)=>{
  const h=await harness();try{
    const f=await recFixture(h,'rec-sent'),{admin,user,child}=f;
    await f.evidence();
    const send=async()=>{const p=await f.nextProposal();assert.equal((await h.request(`/recommendations/${p.rec.id}/approve`,{},admin)).status,'offered');assert.equal((await f.learnerModes(p.a)).offered,'mixed');return p};
    const studentMode=(a,body)=>h.request(`/assignments/${a.id}/students/${user.id}/mode`,body,admin,200,'PUT');
    const modeEvents=(a,kind)=>h.db.prepare('SELECT * FROM mode_events WHERE assignment_id=? AND user_id=? AND kind=? ORDER BY created_at').all(a.id,user.id,kind);

    await t.test('required scenario: lock after sending → withdrawn with reason, invitation gone, next task proposed, unlock does not restore',async()=>{
      const A=await send();
      await studentMode(A.a,{override:{allowed:['blocks'],start:'blocks',switching:'locked'},reason:'Пусть закрепит блоки'});
      // The change itself closes the recommendation — no list refresh needed.
      assert.equal(f.row(A.rec.id).status,'withdrawn');assert.match(f.row(A.rec.id).reason,/закрепил/);
      assert.equal(f.offerState(A.a),null,'the linked invitation is cleared');
      assert.equal(f.events(A.rec.id,'withdrawn'),1);assert.equal(modeEvents(A.a,'offer_withdrawn').length,1,'the mode history records the removal');
      const B=await f.nextProposal();assert.notEqual(B.rec.id,A.rec.id,'the next suitable task gets a proposal');
      await studentMode(A.a,{clear_override:true,reason:'Снова как в группе'});
      assert.equal((await f.learnerModes(A.a)).offered??null,null,'returning permissions does not restore the old invitation');
      assert.equal(f.row(A.rec.id).status,'withdrawn');
      await h.request(`/recommendations/${B.rec.id}/dismiss`,{},admin);
    });
    await t.test('forbidding the target mode after sending withdraws it; restoring the policy does not bring the invitation back',async()=>{
      const C=await send();
      await h.request(`/assignments/${C.a.id}/mode-policy`,{allowed:['blocks','python'],start:'blocks',switching:'teacher',reason:'Без смешанного'},admin,200,'PUT');
      assert.equal(f.row(C.rec.id).status,'withdrawn');assert.match(f.row(C.rec.id).reason,/не разрешён/);assert.equal(f.offerState(C.a),null);
      await h.request(`/assignments/${C.a.id}/mode-policy`,{allowed:['blocks','mixed','python'],start:'blocks',switching:'teacher'},admin,200,'PUT');
      assert.equal((await f.learnerModes(C.a)).offered??null,null);
      await h.request(`/assignments/${C.a.id}/mode`,{mode:'mixed'},child,409);
    });
    await t.test('finishing the task after sending withdraws the recommendation',async()=>{
      const D=await send();assert.equal(await f.solve(D.tk,D.a),'passed');
      await f.lists(child);assert.equal(f.row(D.rec.id).status,'withdrawn');assert.match(f.row(D.rec.id).reason,/выполнено/);assert.equal(f.offerState(D.a),null);
    });
    await t.test('closing the assignment and leaving the group withdraw a sent recommendation',async()=>{
      const E=await send();await h.request(`/assignments/${E.a.id}`,{},admin,200,'DELETE');
      assert.equal(f.row(E.rec.id).status,'withdrawn');assert.match(f.row(E.rec.id).reason,/закрыто/);
      const F=await send();await h.request(`/groups/${f.group.id}/members`,{user_id:user.id},admin,200,'DELETE');
      assert.equal(f.row(F.rec.id).status,'withdrawn');assert.match(f.row(F.rec.id).reason,/не в группе/);assert.equal(f.offerState(F.a),null);
      await h.request(`/groups/${f.group.id}/members`,{user_id:user.id},admin);
      assert.equal(f.offerState(F.a),null,'re-joining does not restore the invitation');
    });
    await t.test('the teacher setting the mode closes the sent recommendation as replaced',async()=>{
      const G=await send();await studentMode(G.a,{set:'python',reason:'Сразу в Python'});
      assert.equal(f.row(G.rec.id).status,'replaced');assert.match(f.row(G.rec.id).reason,/Python/);
      assert.equal((await f.learnerModes(G.a)).current,'python');
      await f.nextProposal().then(p=>h.request(`/recommendations/${p.rec.id}/dismiss`,{},admin));
    });
    await t.test('a manual offer replaces the sent recommendation; acceptance belongs to the manual offer; withdrawal keeps it',async()=>{
      const H=await send();await studentMode(H.a,{offer:'mixed',reason:'Решение преподавателя'});
      assert.equal(f.row(H.rec.id).status,'replaced');assert.match(f.row(H.rec.id).reason,/вручную|сам/);
      const again=await h.request(`/recommendations/${H.rec.id}/dismiss`,{},admin);assert.equal(again.status,'replaced');
      assert.equal(f.offerState(H.a),'mixed','the manual offer stays');
      await h.request(`/assignments/${H.a.id}/mode`,{mode:'mixed'},child);
      const accepted=modeEvents(H.a,'offer_accepted');assert.equal(accepted.length,1);assert.deepEqual(JSON.parse(accepted[0].details),{},'acceptance is not attributed to the replaced recommendation');
      assert.equal(f.row(H.rec.id).status,'replaced');
      // A different manual mode: the recommendation is replaced as well.
      const I=await send();await studentMode(I.a,{offer:'python'});assert.equal(f.row(I.rec.id).status,'replaced');assert.equal(f.offerState(I.a),'python');
    });
    await t.test('withdrawing repeated after a lost response keeps one result and one event; the learner still decides',async()=>{
      const J=await send();
      const [a,b]=await Promise.all([h.request(`/recommendations/${J.rec.id}/dismiss`,{},admin),h.request(`/recommendations/${J.rec.id}/dismiss`,{},admin)]);
      assert.equal(a.status,'withdrawn');assert.equal(b.status,'withdrawn');assert.equal(f.events(J.rec.id,'withdrawn'),1);assert.equal(modeEvents(J.a,'offer_withdrawn').length,1);
      assert.equal((await f.learnerModes(J.a)).current,'blocks','no automatic switch');
    });
    await t.test('the learner accepting a sent recommendation records it once',async()=>{
      const K=await send();await h.request(`/assignments/${K.a.id}/mode`,{mode:'mixed'},child);await h.request(`/assignments/${K.a.id}/mode`,{mode:'mixed'},child);
      assert.equal(f.row(K.rec.id).status,'accepted');assert.equal(f.events(K.rec.id,'accepted'),1);
    });
  }finally{await h.close()}
});
