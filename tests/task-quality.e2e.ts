import {test,expect,type Page} from '@playwright/test';
const password='Quality-browser-test-321!';
async function call(page:Page,path:string,body?:unknown){const r=await page.request.fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'http://127.0.0.1:4186'},data:body});const data=await r.json();expect(r.status(),JSON.stringify(data)).toBe(200);return data}
async function setup(page:Page){const tag=crypto.randomUUID().slice(0,8);await call(page,'/auth/register',{school:'Quality '+tag,name:'Author',login:'quality-'+tag,password});const course=await call(page,'/courses',{title:'Course'}),module=await call(page,'/modules',{title:'Module',course_id:course.id}),lesson=await call(page,'/lessons',{title:'Lesson',module_id:module.id});await page.goto(`/#builder/new?lesson=${lesson.id}`);return {lesson}}

async function checkFunctionTemplate(page:Page,lessonId:string){
  await page.setViewportSize({width:1366,height:768});await page.goto(`/#builder/new?lesson=${lessonId}`);
  await page.getByLabel('Начать с шаблона',{exact:true}).selectOption('function');await page.getByRole('button',{name:'Применить шаблон к черновику',exact:true}).click();
  await page.getByRole('button',{name:/^4.*Проверка/}).click();
  await expect(page.getByLabel('Описать и вызвать функцию',{exact:true})).toBeChecked();await expect(page.getByLabel('Вернуть результат через return',{exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Проверить эталон и неправильные примеры',exact:true}).click();await expect(page.getByText('Текущая ревизия подтверждена.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^5.*Предпросмотр/}).click();await expect(page.getByRole('heading',{name:'В решении нужно применить',exact:true})).toBeVisible();
  await page.locator('#python-answer').fill('x = int(input())\nprint(x * x)');await page.getByRole('button',{name:'Проверить пример решения',exact:true}).click();await expect(page.getByText('Опиши функцию через def и используй результат её вызова.',{exact:true})).toBeVisible();
  await page.screenshot({path:'work/learning-rules-preview-1366.png'});
  await page.getByRole('button',{name:'Вставить эталон в предпросмотр',exact:true}).click();await page.getByRole('button',{name:'Проверить пример решения',exact:true}).click();await expect(page.getByText('Отлично! Все тесты пройдены.',{exact:true})).toBeVisible();
  expect((await call(page,'/state')).attempts).toHaveLength(0);
}
test('template quality gate and preview use the real workspace; author example persists separately',async({page})=>{
  await page.setViewportSize({width:1366,height:768});const {lesson}=await setup(page);
  await page.getByLabel('Начать с шаблона',{exact:true}).selectOption('input-compute');await page.getByRole('button',{name:'Применить шаблон к черновику',exact:true}).click();
  await expect(page.getByLabel('Название задания',{exact:true})).toHaveValue('Удвой число');
  await page.getByRole('button',{name:/^4.*Проверка/}).click();
  await expect(page.getByLabel('Эталонное решение · только преподавателю',{exact:true})).toHaveValue('n = int(input())\nprint(n * 2)');
  await page.getByRole('button',{name:'Проверить эталон и неправильные примеры',exact:true}).click();await expect(page.getByText('Текущая ревизия подтверждена.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^5.*Предпросмотр/}).click();await expect(page).toHaveURL(/#preview\//);await expect(page.locator('.main-content')).toHaveClass(/workspace-page/);
  await expect(page.locator('#python-answer')).toHaveValue('n = int(input())\n# Выведи удвоенное число\n');
  for(const [width,height] of [[1280,720],[1366,768]]){await page.setViewportSize({width,height});expect(await page.locator('#python-answer').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(16);for(const label of ['▷ Запустить','Проверить пример решения']){const button=page.getByRole('button',{name:label,exact:true}),r=await button.boundingBox();expect(r!.y+r!.height).toBeLessThanOrEqual(height)}}
  await page.getByRole('button',{name:'Теория',exact:true}).click();await expect(page.getByText('input возвращает строку. int превращает её в целое число.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Подсказки',exact:true}).click();await page.getByText('Подсказка 1',{exact:true}).click();await expect(page.getByText('Используй результат n * 2 внутри print.',{exact:true})).toBeVisible();
  await page.locator('#python-answer').fill('n = int(input())\nprint(n * 2)');await page.locator('.stdin-details summary').click();await page.getByLabel('Ввод для пробного запуска',{exact:true}).fill('5');await page.getByRole('button',{name:'▷ Запустить',exact:true}).click();await expect(page.locator('.console')).toContainText('10');
  await page.getByRole('button',{name:'Проверить пример решения',exact:true}).click();await expect(page.getByText('Отлично! Все тесты пройдены.',{exact:true})).toBeVisible();
  await page.locator('#python-answer').fill(Array.from({length:150},(_,i)=>`print(${i})`).join('\n'));await page.getByRole('button',{name:'▷ Запустить',exact:true}).click();await expect(page.locator('.console')).toContainText('149');
  await page.locator('#python-answer').fill('print(1 / 0)');await page.getByRole('button',{name:'▷ Запустить',exact:true}).click();await expect(page.getByText(/Делить на ноль нельзя/)).toBeVisible();
  for(const label of ['▷ Запустить','Проверить пример решения']){const button=page.getByRole('button',{name:label,exact:true}),r=await button.boundingBox();expect(r!.y+r!.height).toBeLessThanOrEqual(768);expect(await button.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return Boolean(hit&&e.contains(hit))})).toBeTruthy()}
  await page.locator('#python-answer').fill('print(99)');await page.getByRole('button',{name:'Проверить пример решения',exact:true}).click();await expect(page.getByText('Результат отличается от ожидаемого. Попробуй ещё раз.',{exact:true})).toBeVisible();await page.screenshot({path:'work/verified-preview-1366.png'});
  await page.reload();await expect(page.locator('#python-answer')).toHaveValue('print(99)');
  const saved=(await call(page,'/state')).tasks[0];expect(saved.preview_solution).toBe('print(99)');expect(saved.starter).toContain('n = int(input())');expect(saved.reference_solution).toBe('n = int(input())\nprint(n * 2)');expect(saved.verification).toBeNull();expect((await call(page,'/state')).attempts).toHaveLength(0);
  await page.getByRole('button',{name:'К публикации',exact:true}).click();await expect(page.getByRole('button',{name:'Сохранить и опубликовать',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Подтвердите проверку текущей ревизии.',exact:true}).click();
  await page.getByRole('button',{name:'История проверок качества',exact:true}).click();await page.getByRole('button',{name:/^Повторить проверку ревизии/}).first().click();await expect(page.getByText(/Текущая ревизия этим результатом не подтверждена/)).toBeVisible();expect((await call(page,'/state')).tasks[0].verification).toBeNull();
  await page.getByRole('button',{name:'Проверить эталон и неправильные примеры',exact:true}).click();await expect(page.getByText('Текущая ревизия подтверждена.',{exact:true})).toBeVisible();await page.getByRole('button',{name:/^6.*Публикация/}).click();await page.getByRole('button',{name:'Сохранить и опубликовать',exact:true}).click();
  await expect(page.getByText('Изменения сохраняются в черновик.',{exact:false})).toBeVisible();
  await checkFunctionTemplate(page,lesson.id);
});
test('manual template criteria appear in the same preview and a trial creates no learner attempt',async({page})=>{
  await setup(page);await page.getByLabel('Начать с шаблона',{exact:true}).selectOption('creative');await page.getByRole('button',{name:'Применить шаблон к черновику',exact:true}).click();await expect(page.getByLabel('Название задания',{exact:true})).toHaveValue('Текстовая история');await page.getByRole('button',{name:/^4.*Проверка/}).click();await page.getByRole('button',{name:'Подтвердить критерии',exact:true}).click();await expect(page.getByText('Текущая ревизия подтверждена.',{exact:true})).toBeVisible();await page.getByRole('button',{name:/^5.*Предпросмотр/}).click();await expect(page.locator('.info-box').filter({hasText:'Это решение проверит преподаватель.'})).toContainText('Есть минимум три строки истории');await page.locator('#python-answer').fill('print("story")');await page.getByRole('button',{name:'Отправить преподавателю',exact:true}).click();await expect(page.getByText('pending_review',{exact:false})).toHaveCount(0);expect((await call(page,'/state')).attempts).toHaveLength(0);await expect(page.locator('.result-box')).toContainText('преподавател');
});
