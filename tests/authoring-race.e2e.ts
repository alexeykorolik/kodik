import {test,expect,type Page} from '@playwright/test';
// One teacher in one tab: the builder saves a revision, then the preview opens before the slow school
// refresh brings that revision back. The preview's save must follow the tab's own revisions, not
// report a conflict with itself; a save by another teacher in between must still be a conflict.
const password='Authoring-race-test-321!';
async function call(page:Page,path:string,body?:unknown,method=body===undefined?'GET':'POST'){const r=await page.request.fetch('/api'+path,{method,headers:{Origin:'http://127.0.0.1:4186','X-Kodik-Client':'2'},data:body});const data=await r.json();expect(r.status(),JSON.stringify(data)).toBe(200);return data}
async function setup(page:Page){const tag=crypto.randomUUID().slice(0,8);await call(page,'/auth/register',{school:'Race '+tag,name:'Author',login:'race-'+tag,password});const course=await call(page,'/courses',{title:'Course'}),module=await call(page,'/modules',{title:'Module',course_id:course.id}),lesson=await call(page,'/lessons',{title:'Lesson',module_id:module.id});await page.goto(`/#builder/new?lesson=${lesson.id}`);
  await page.getByLabel('Начать с шаблона',{exact:true}).selectOption('input-compute');await page.getByRole('button',{name:'Применить шаблон к черновику',exact:true}).click();
  await expect(page.getByLabel('Название задания',{exact:true})).toHaveValue('Удвой число');await expect(page.getByText('✓ Сохранено',{exact:true})).toBeVisible()}
// Every school refresh in the browser answers late, as on a large database.
async function slowState(page:Page){await page.route('**/api/state',async route=>{const response=await route.fetch();await new Promise(r=>setTimeout(r,2500));await route.fulfill({response})})}

test('own saves from the builder and the preview in one tab are not a conflict on a slow server',async({page})=>{
  await setup(page);await slowState(page);
  await page.getByLabel('Название задания',{exact:true}).fill('Удвой число быстро');
  await page.getByRole('button',{name:/^5.*Предпросмотр/}).click();await expect(page).toHaveURL(/#preview\//);
  await page.locator('#python-answer').fill('n = int(input())\nprint(n * 2)');
  await page.getByRole('button',{name:'Проверить пример решения',exact:true}).click();
  await expect(page.getByText('Отлично! Все проверки пройдены.',{exact:true})).toBeVisible();
  await expect(page.getByText(/Другой преподаватель сохранил/)).toHaveCount(0);
  const saved=(await call(page,'/state')).tasks[0];expect(saved.title).toBe('Удвой число быстро');expect(saved.preview_solution).toBe('n = int(input())\nprint(n * 2)');
});

test('a save by another teacher between two own saves is still a conflict',async({page})=>{
  await setup(page);await slowState(page);
  const task=(await call(page,'/state')).tasks[0];
  await call(page,`/tasks/${task.id}`,{...task,title:'Версия коллеги'},'PUT');
  await page.getByLabel('Название задания',{exact:true}).fill('Моя версия');
  await expect(page.getByText('Другой преподаватель сохранил изменения. Обе версии сохранены; выберите, как продолжить.',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Разрешение конфликта'})).toContainText('Версия коллеги');
});
