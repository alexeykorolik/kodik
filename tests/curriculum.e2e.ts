import {test,expect,type Page} from '@playwright/test';
import {taskFixture} from './helpers/task-fixture.mjs';
const password='Curriculum-browser-test-321!';
async function call(page:Page,path:string,body?:unknown){if(path==='/tasks'&&body)body=taskFixture(body);if(/\/tasks\/[^/]+\/publish$/.test(path)&&(body as any)?.published){const id=path.split('/')[2],task=(await call(page,'/state')).tasks.find((t:any)=>t.id===id),proof=await call(page,`/tasks/${id}/verify`,{revision:task.revision});expect(proof.status,JSON.stringify(proof)).toBe('approved');body={revision:task.revision,...(body as object)}}const response=await page.request.fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'http://127.0.0.1:4186'},data:body});const value=await response.json();expect(response.status(),JSON.stringify(value)).toBe(200);return value}
test('teacher authors a full lesson; a lost program response recovers; child completes every step and the teacher sees results',async({page,browser})=>{
  await page.setViewportSize({width:1366,height:768});
  const tag=crypto.randomUUID().slice(0,8),login=`lesson-${tag}`;
  await call(page,'/auth/register',{school:`Lesson ${tag}`,name:'Teacher',login:`teacher-${tag}`,password});
  const course=await call(page,'/courses',{title:'First Python program'}),module=await call(page,'/modules',{title:'Start',course_id:course.id}),lesson=await call(page,'/lessons',{title:'Print lesson',module_id:module.id});
  const learner=await call(page,'/users',{name:'Learner',login,password,role:'student'}),group=await call(page,'/groups',{title:'Lesson class'});
  await call(page,`/groups/${group.id}/members`,{user_id:learner.id});
  async function material(title:string,expected:string){const t=await call(page,'/tasks',{lesson_id:lesson.id,title,description:'',goal:'Use print',theory:'',instruction:`Print ${expected}`,difficulty:'easy',starter:'',hints:['Use print with a value'],check_mode:'output',tests:[{inputs:[],expected,hidden:false}]});await call(page,`/tasks/${t.id}/publish`,{published:true});return t}
  const practice=await material('Guided print','42'),final=await material('Independent print','43');
  await page.goto(`/#lesson-editor/${lesson.id}`);
  await page.getByLabel('Учебная цель',{exact:true}).fill('Use print to show a value');
  await page.getByText('Заметки преподавателя · видны только сотрудникам школы',{exact:true}).click();
  await page.getByLabel('Как провести занятие',{exact:true}).fill('private UI lesson notes');
  await page.getByRole('button',{name:'Добавить сценарий урока',exact:true}).click();
  async function step(number:number,title:string,body:string){await page.locator('.lesson-outline').getByRole('button',{name:new RegExp(`^${number}\\.`)}).click();await page.getByLabel('Название шага',{exact:true}).fill(title);await page.getByLabel(number===4?'Вопрос ученику':'Содержание шага',{exact:true}).fill(body)}
  await step(1,'Learn print','The print command displays a value.');
  await step(2,'Read a program','Read this example.');await page.getByLabel('Пример Python',{exact:true}).fill('print(42)');
  await step(3,'Try a command','Print 42.');await page.getByLabel('Практическое задание',{exact:true}).selectOption(practice.id);
  await step(4,'Check understanding','What does print(42) show?');await page.getByLabel('Вариант 1',{exact:true}).fill('42');await page.getByLabel('Вариант 2',{exact:true}).fill('43');await page.getByLabel('Объяснение после верного ответа',{exact:true}).fill('The program displays 42.');
  await step(5,'Independent work','Print 43.');await page.getByLabel('Практическое задание',{exact:true}).selectOption(final.id);
  await step(6,'Remember print','You can now show a value with print.');
  await page.getByRole('button',{name:'Сохранить и опубликовать урок',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Опубликована новая версия урока');
  await page.getByRole('link',{name:'Учебные группы',exact:true}).click();
  await page.getByRole('button',{name:'Выдать учебную программу',exact:true}).click();
  await page.getByRole('button',{name:'Проверить состав программы',exact:true}).click();
  await expect(page.locator('.program-preview')).toContainText('Remember print');
  await page.route('**/api/programs',async route=>{await route.fetch();await route.abort('failed')},{times:1});
  await page.getByRole('button',{name:'Выдать программу группе',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  expect((await call(page,'/state')).programs).toHaveLength(1);
  await page.reload();await page.getByRole('button',{name:'Выдать учебную программу',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Выдача сохранена');
  await page.getByRole('button',{name:'Проверить результат программы',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  const issued=(await call(page,'/state')).programs;expect(issued).toHaveLength(1);
  await page.getByRole('button',{name:/First Python program · 1 занятий/}).click();await page.getByRole('button',{name:'Провести занятие',exact:true}).click();
  await expect(page.getByText('private UI lesson notes',{exact:true})).toBeVisible();
  const learnerContext=await browser.newContext({baseURL:'http://127.0.0.1:4186',viewport:{width:1366,height:768}}),child=await learnerContext.newPage();
  try{
    await child.goto('/');await child.getByLabel('Логин',{exact:true}).fill(login);await child.getByLabel('Пароль',{exact:true}).fill(password);await child.getByRole('button',{name:'Войти в Kodik',exact:true}).click();
    await child.getByRole('button',{name:'Продолжить занятие',exact:true}).click();await expect(child).toHaveURL(/#lesson-run\//);
    await expect(child.getByRole('heading',{name:'Learn print',exact:true})).toBeVisible();await expect(child.getByText('private UI lesson notes',{exact:true})).toHaveCount(0);
    await child.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(child.locator('.lesson-code')).toHaveText('print(42)');await child.getByRole('button',{name:'Продолжить',exact:true}).click();
    await expect(child.locator('#python-answer')).toBeVisible();expect(await child.locator('#python-answer').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(16);
    await child.locator('#python-answer').fill('print(41)');await child.getByRole('button',{name:'Проверить решение',exact:true}).click();await expect(child.getByText('Ожидается',{exact:true})).toBeVisible();
    await child.locator('#python-answer').fill('print(42)');await child.getByRole('button',{name:'Проверить решение',exact:true}).click();await expect(child.getByText('Отлично! Все тесты пройдены.',{exact:true})).toBeVisible();
    await child.getByRole('button',{name:'Следующее задание →',exact:true}).click();await expect(child.getByRole('heading',{name:'Check understanding',exact:true})).toBeVisible();
    await child.getByRole('radio',{name:'43',exact:true}).check();await child.getByRole('button',{name:'Ответить',exact:true}).click();await expect(child.locator('.lesson-run-screen [role="status"]')).toContainText('Пока не совпало');
    await child.getByRole('radio',{name:'42',exact:true}).check();await child.getByRole('button',{name:'Ответить',exact:true}).click();await expect(child.getByRole('heading',{name:'Independent print',exact:true})).toBeVisible();
    await child.locator('#python-answer').fill('print(43)');await child.getByRole('button',{name:'Проверить решение',exact:true}).click();await child.getByRole('button',{name:'Следующее задание →',exact:true}).click();
    await expect(child.getByRole('heading',{name:'Remember print',exact:true})).toBeVisible();await child.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(child.getByRole('heading',{name:'Урок завершён!',exact:true})).toBeVisible();
    await child.reload();await expect(child.getByText('Завершено 6 из 6 шагов',{exact:true})).toBeVisible();
    const childState=await call(child,'/state');expect(childState.programs[0].lessons[0].completed).toBe(6);expect(JSON.stringify(childState)).not.toContain('teacher_notes');expect(JSON.stringify(await call(child,`/lesson-runs/${issued[0].lessons[0].id}`))).not.toContain('correct_index');
    const row=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'Learner',exact:true})});
    await expect(row.getByRole('button',{name:'✓ Завершено',exact:true})).toHaveCount(6,{timeout:15000});
    await row.getByRole('button',{name:'✓ Завершено',exact:true}).nth(2).click();await expect(page.getByRole('dialog')).toContainText('print(42)');await page.getByRole('button',{name:'Закрыть',exact:true}).click();
    await child.screenshot({path:'work/composed-lesson-student-1366.png'});await page.screenshot({path:'work/composed-lesson-teacher-1366.png'});
  }finally{await learnerContext.close()}
});
