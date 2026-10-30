import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4188/');
  await page.getByRole('heading',{name:'Привет, Ангелина!',exact:true}).waitFor();
  assert.equal(await page.locator('.teacher-demo-label').count(),1);
  const state=await page.evaluate(async()=> (await fetch('/api/state')).json());assert.equal(state.user.role,'teacher');assert.equal(state.users.filter(u=>u.role==='student').length,14);
  assert.equal(state.user.name,'Ангелина Костян');assert.deepEqual(state.groups.map(g=>g.title),['6"Б"','7"А"']);
  assert.equal(await page.getByRole('button',{name:'Войти в Kodik',exact:true}).count(),0);
  const checks=await page.evaluate(async()=>{const s=await(await fetch('/api/state')).json(),t=s.tasks[0];const call=async(b)=> (await fetch('/api/preview',{method:'POST',body:JSON.stringify(b)})).json();return {python:await call({task:t,code:t.reference_solution}),blocks:await call({task:t,mode:'blocks',workspace:t.block_solution})}});assert.equal(checks.python.status,'passed');assert.equal(checks.blocks.status,'passed');
  await page.screenshot({path:'work/teacher-demo-overview-1366.png',fullPage:true});
  for(const route of ['courses','tasks','groups','users','results','journal','classroom','modes']){
    await page.locator(`.sidebar nav a[href="#${route}"]`).click();await page.waitForTimeout(250);
    assert.equal(await page.getByRole('button',{name:'Войти в Kodik',exact:true}).count(),0,route);
    if(route==='classroom'){await page.getByRole('button',{name:'Помощь оказана',exact:true}).first().click();await page.getByText('Обработанные запросы: 1',{exact:true}).waitFor()}
    if(route==='journal'){await page.getByRole('button',{name:/версия/}).first().click();await page.getByRole('dialog',{name:'Решение ученика',exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть',exact:true}).click()}
  }
  await page.goto('http://127.0.0.1:4188/#users');await page.waitForTimeout(200);await page.screenshot({path:'work/teacher-demo-students-1366.png',fullPage:true});
  await page.reload();await page.getByRole('heading',{name:'Участники школы',exact:true}).waitFor({timeout:4000}).catch(()=>{});
  const restored=await page.evaluate(async()=> (await fetch('/api/state')).json());assert.equal(restored.users.filter(u=>u.role==='student').length,14);
  await page.evaluate(()=>{const key='kodik-teacher-demo-v1',m=JSON.parse(localStorage.getItem(key));m.state.user.name='Анна Соколова';m.state.groups[0].title='Python · Первые шаги';m.state.groups[1].title='Python · Исследователи';m.preservedDemoEdit='keep';localStorage.setItem(key,JSON.stringify(m))});
  await page.reload();await page.waitForTimeout(150);
  const migrated=await page.evaluate(async()=>({s:await(await fetch('/api/state')).json(),kept:JSON.parse(localStorage.getItem('kodik-teacher-demo-v1')).preservedDemoEdit}));assert.equal(migrated.s.user.name,'Ангелина Костян');assert.deepEqual(migrated.s.groups.map(g=>g.title),['6"Б"','7"А"']);assert.equal(migrated.kept,'keep');
  assert.deepEqual(errors,[]);
  await page.goto(`http://127.0.0.1:4188/#lesson-run/${state.programs[0].lessons[0].id}`);await page.getByRole('heading',{name:'Работа группы по шагам',exact:true}).waitFor();
  await page.screenshot({path:'work/teacher-demo-lesson-1366.png',fullPage:true});
  console.log(JSON.stringify({ok:true,students:14,routes:8,automaticTeacher:true,localPersistence:true,errors}));
}finally{await browser.close()}
