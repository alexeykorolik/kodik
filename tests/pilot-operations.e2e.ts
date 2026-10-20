import {test,expect,type Page} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
// @ts-expect-error untyped server module with the reviewed course data
import {starterLessons} from '../server/b2b/starter-course.mjs';
const password='Pilot-browser-pass-321!';
async function call(page:Page,path:string,body?:unknown,method='POST'){const r=await page.request.fetch('/api'+path,{method:body===undefined?'GET':method,headers:{Origin:'http://127.0.0.1:4186','X-Kodik-Client':'2'},data:body});const value=await r.json();expect(r.status(),JSON.stringify(value)).toBe(200);return value}
test('owner connects school and license; admin imports class; child completes all six starter lessons in the UI',async({page,browser})=>{
  test.setTimeout(180000);await page.setViewportSize({width:1366,height:768});const tag=crypto.randomUUID().slice(0,8);
  const owner=await call(page,'/auth/register',{school:`Owner ${tag}`,name:'Owner',login:`pilot-owner-${tag}`,password});
  const db=new DatabaseSync('work/browser-test.sqlite');try{db.prepare('UPDATE users SET platform_owner=1 WHERE id=?').run(owner.user.id)}finally{db.close()}
  await page.goto('/');await expect(page.getByRole('heading',{name:'Клиенты и лицензии',exact:true})).toBeVisible();
  await page.getByLabel('Новая компания',{exact:true}).fill(`Клиент ${tag}`);await page.getByRole('button',{name:'Добавить компанию',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Подключить школу',exact:true})).toBeVisible();
  await page.getByLabel('Контактное лицо',{exact:true}).fill('Директор школы');await page.getByLabel('Деловой контакт',{exact:true}).fill('office@example.test');await page.getByLabel('Следующее действие',{exact:true}).fill('Обсудить первый урок');await page.getByLabel('Дата следующего действия',{exact:true}).fill('2098-10-21');await page.getByRole('button',{name:'Сохранить карточку',exact:true}).click();
  await page.getByLabel('Имя администратора',{exact:true}).fill('Администратор пилота');await page.getByLabel('Логин администратора',{exact:true}).fill(`pilot-admin-${tag}`);await page.getByLabel('Пароль администратора',{exact:true}).fill(password);await page.getByRole('button',{name:'Создать школу',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Лицензия школы',exact:true})).toBeVisible();await page.getByLabel('Лимит активных учеников',{exact:true}).fill('30');await page.getByLabel('Действует до',{exact:true}).fill('2099-01-01');await page.getByLabel('Состояние',{exact:true}).selectOption('active');await page.getByRole('button',{name:'Выдать или продлить лицензию',exact:true}).click();await expect(page.getByText('Использовано 0 из 30 мест.',{exact:false})).toBeVisible();await page.screenshot({path:'work/owner-license-1366.png'});
  await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.getByLabel('Логин',{exact:true}).fill(`pilot-admin-${tag}`);await page.getByLabel('Пароль',{exact:true}).fill(password);await page.getByRole('button',{name:'Войти в Kodik',exact:true}).click();await expect(page.getByRole('heading',{name:'Привет, Администратор!',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Учебные группы',exact:true}).click();await page.getByRole('button',{name:'+ Создать группу',exact:true}).click();await page.getByRole('dialog').getByLabel('Название',{exact:true}).fill('Класс пилота');await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click();
  await page.getByRole('link',{name:'Управление школой',exact:true}).click();await page.getByLabel('Список учеников',{exact:true}).fill(`Миша; child-misha-${tag}\nАня; child-anya-${tag}`);await page.getByRole('button',{name:'Проверить список',exact:true}).click();await expect(page.getByRole('cell',{name:'Готов',exact:true})).toHaveCount(2);await page.getByRole('button',{name:'Подключить учеников',exact:true}).click();await expect(page.getByRole('heading',{name:'Подключено: 2',exact:true})).toBeVisible();await expect(page.getByRole('status').filter({hasText:'Подключено: 2'})).toContainText(`child-misha-${tag}`);await page.getByRole('button',{name:'Данные переданы — скрыть',exact:true}).click();
  await page.getByRole('link',{name:'Курсы',exact:true}).click();const installing=page.waitForResponse(r=>r.url().endsWith('/api/starter-course/install')&&r.request().method()==='POST',{timeout:90000});await page.getByRole('button',{name:'Добавить стартовый курс · 6 уроков',exact:true}).click();expect((await (await installing).json()).ready).toBe(true);await expect(page).toHaveURL(new RegExp("#courses/"));await expect(page.getByRole('heading',{name:'Первые шаги: от блоков к Python',exact:true})).toBeVisible({timeout:90000});
  const state=await call(page,'/state');expect(state.tasks).toHaveLength(12);expect(state.lessons.filter((l:any)=>l.published_version_id)).toHaveLength(6);expect(state.license.used).toBe(2);
  const learner=state.users.find((u:any)=>u.login===`child-misha-${tag}`);await call(page,`/users/${learner.id}/password`,{password});
  await page.getByRole('link',{name:'Учебные группы',exact:true}).click();await page.getByRole('button',{name:'Выдать учебную программу',exact:true}).click();await page.getByRole('button',{name:'Проверить состав программы',exact:true}).click();await page.getByRole('button',{name:'Выдать программу группе',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  const program=(await call(page,'/state')).programs[0],context=await browser.newContext({baseURL:'http://127.0.0.1:4186',viewport:{width:1366,height:768}}),child=await context.newPage();
  try{
    await child.goto('/');await child.getByLabel('Логин',{exact:true}).fill(learner.login);await child.getByLabel('Пароль',{exact:true}).fill(password);await child.getByRole('button',{name:'Войти в Kodik',exact:true}).click();await expect(child.getByRole('heading',{name:'Привет, Миша!',exact:true})).toBeVisible();
    for(const [index,lesson] of program.lessons.entries()){
      if(index)await call(page,`/lesson-runs/${lesson.id}/state`,{state:'open',revision:lesson.revision});
      await child.goto(`/#lesson-run/${lesson.id}`);await expect(child.getByRole('heading',{name:'Разберём идею',exact:true})).toBeVisible();await child.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(child.locator('.lesson-code')).toBeVisible();await child.getByRole('button',{name:'Продолжить',exact:true}).click();
      const materials=state.tasks.filter((t:any)=>t.lesson_id===lesson.lesson_id).sort((a:any,b:any)=>a.position-b.position);
      for(let taskIndex=0;taskIndex<2;taskIndex++){
        await child.getByRole('radiogroup',{name:'Способ решения'}).getByRole('radio',{name:'Python',exact:true}).click();await child.locator('#python-answer').fill(materials[taskIndex].reference_solution);await child.getByRole('button',{name:'Проверить решение',exact:true}).click();await expect(child.getByText('Отлично! Все тесты пройдены.',{exact:true})).toBeVisible();await child.getByRole('button',{name:'Следующее задание →',exact:true}).click();
        if(taskIndex===0){await expect(child.getByRole('heading',{name:'Проверь понимание',exact:true})).toBeVisible();await child.locator('.question-choice input').nth(starterLessons[index].correct).check();await child.getByRole('button',{name:'Ответить',exact:true}).click()}
      }
      await expect(child.getByRole('heading',{name:'Что получилось',exact:true})).toBeVisible();await child.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(child.getByRole('heading',{name:'Урок завершён!',exact:true})).toBeVisible();await child.reload();await expect(child.getByText('Завершено 6 из 6 шагов',{exact:true})).toBeVisible();
    }
    expect((await call(child,'/state')).attempts).toHaveLength(12);await child.screenshot({path:'work/starter-course-finished-1366.png'});
  }finally{await context.close()}
});

test('teacher configures block modes, edits a private solution with keyboard controls and checks the common preview',async({page})=>{
  await page.setViewportSize({width:1366,height:768});const tag=crypto.randomUUID().slice(0,8);
  await call(page,'/auth/register',{school:`Author ${tag}`,name:'Teacher',login:`block-author-${tag}`,password});
  const c=await call(page,'/courses',{title:'Уроки'}),m=await call(page,'/modules',{title:'Модуль',course_id:c.id}),l=await call(page,'/lessons',{title:'Урок',module_id:m.id});
  const t=await call(page,'/tasks',{lesson_id:l.id,title:'Выведи число',description:'',goal:'Вывод',theory:'print показывает число.',instruction:'Выведи 42.',difficulty:'easy',starter:'',hints:[],check_mode:'output',tests:[{inputs:[],expected:'42',hidden:false}],reference_solution:'print(42)',wrong_solutions:['print(41)']});
  await page.goto(`/#builder/${t.id}?step=2`);await page.getByRole('checkbox',{name:'Блоки',exact:true}).check();await page.getByRole('checkbox',{name:'Блоки + Python',exact:true}).check();
  await page.getByText('Целевые навыки и набор блоков',{exact:true}).click();await page.getByRole('button',{name:'Подтвердить обнаруженное как цели задания',exact:true}).click();await page.getByRole('button',{name:'Предложить палитру по эталону',exact:true}).click();
  await page.getByText('Закрытый блоковый образец',{exact:true}).click();const privateEditor=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Закрытый блоковый образец'})}).last();
  await privateEditor.getByText('Добавить блок с клавиатуры',{exact:true}).click();await privateEditor.getByRole('button',{name:'напечатать',exact:true}).click();await privateEditor.getByRole('button',{name:'число',exact:true}).click();await privateEditor.getByLabel('Число',{exact:true}).fill('42');
  await page.getByRole('button',{name:'Сохранить черновик',exact:true}).click();
  await page.getByRole('button',{name:/^4.*Проверка/}).click();await page.getByRole('button',{name:'Проверить эталон и неправильные примеры',exact:true}).click();await expect(page.getByText('Текущая ревизия подтверждена.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^5.*Предпросмотр/}).click();const modes=page.getByRole('radiogroup',{name:'Способ решения'});await expect(modes.getByRole('radio',{name:'Блоки',exact:true})).toHaveAttribute('aria-checked','true');
  await page.getByText('Добавить блок с клавиатуры',{exact:true}).click();await page.getByRole('button',{name:'напечатать',exact:true}).click();await page.getByRole('button',{name:'число',exact:true}).click();await page.getByLabel('Число',{exact:true}).fill('42');
  await modes.getByRole('radio',{name:'Блоки + Python',exact:true}).click();await expect(page.getByRole('region',{name:'Python из твоих блоков'})).toContainText('print(42)');await page.getByRole('button',{name:'Проверить пример решения',exact:true}).click();await expect(page.getByText('Отлично! Все тесты пройдены.',{exact:true})).toBeVisible();
  expect((await call(page,'/state')).attempts).toHaveLength(0);await page.screenshot({path:'work/block-author-preview-1366.png'});
});
