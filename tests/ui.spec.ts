import { test, expect, type Page } from '@playwright/test'
import { lessons } from '../src/course'
async function seed(page: Page,id: number,options: Record<string,unknown> = {}) {
  const prior = lessons.slice(0,lessons.findIndex(l=>l.id===id))
  await page.addInitScript(data=>localStorage.setItem('kodik-progress-v1',JSON.stringify(data)), { version:2,completed:prior.map(l=>l.id),bestStars:Object.fromEntries(prior.filter(l=>!l.tutorial).map(l=>[l.id,3])),introducedConcepts:prior.flatMap(l=>l.tutorial||[]),currentLesson:id,started:true,...options })
  await page.goto('/'); await page.getByRole('button',{name:/Продолжить обучение/}).click()
}
async function add(page:Page,name:string) { await page.getByRole('button',{name:/Добавить блок/}).click(); await page.locator('.block-options button').filter({has:page.getByText(name,{exact:true})}).click() }
async function text(page:Page,value:string,index=0) { await page.locator('.text .blocklyInputField').nth(index).click(); await page.locator('.blocklyHtmlInput').fill(value); await page.locator('.blocklyHtmlInput').press('Enter') }
async function number(page:Page,value:string,index=0) { await page.locator('.math_number .blocklyInputField').nth(index).click(); await page.locator('.blocklyHtmlInput').fill(value); await page.locator('.blocklyHtmlInput').press('Enter') }
async function greater(page:Page) { await page.locator('.logic_compare > .blocklyDropdownField').click(); await page.getByRole('option',{name:/≥/}).click() }
async function passed(page:Page) { await page.getByRole('button',{name:'Проверить',exact:true}).click(); await expect(page.getByRole('heading',{name:'Получилось!',exact:true})).toBeVisible() }

test.describe('новые механики пальцем',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  for(const id of [6,2,3,9,5,10,4,11]) test(`знакомство ${id}: ${lessons.find(l=>l.id===id)!.title}`,async({page})=>{
    await seed(page,id)
    await expect(page.locator('.coach')).toBeVisible()
    if(id===6){ await add(page,'Число'); await number(page,'7') }
    if(id===2){ await page.getByRole('button',{name:'Создать переменную',exact:true}).click(); await page.getByLabel('Название переменной').fill('имя'); await page.getByRole('button',{name:'Создать',exact:true}).click(); await add(page,'Присвоить'); await add(page,'Текст'); await text(page,'Мира'); await add(page,'Напечатать'); await add(page,'Получить переменную') }
    if(id===3) await number(page,'3',1)
    if(id===9) await greater(page)
    if(id===5){ await add(page,'Если'); await add(page,'Сравнить'); await add(page,'Получить переменную'); await add(page,'Число'); await number(page,'10',1); await greater(page); await add(page,'Напечатать'); await add(page,'Текст'); await text(page,'Уровень пройден!') }
    if(id===10){ await add(page,'Напечатать'); await add(page,'Текст'); await text(page,'Пока рано',1) }
    if(id===4){ await add(page,'Напечатать'); await add(page,'Текст'); await text(page,'Учусь!') }
    if(id===11) await add(page,'Вызвать функцию')
    await expect(page.locator('.coach')).toContainText('Нажми «Проверить»')
    await passed(page); await expect(page.getByText('Знакомство завершено · без оценки')).toBeVisible()
    await expect(page.getByRole('dialog').locator('.python-code')).toBeVisible()
  })
})

test('звёздный порог и повторное прохождение',async({page})=>{
  await seed(page,13)
  // Fill other chapter results with one star without changing the active task.
  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('kodik-progress-v1')!);p.completed=[1,14,7,22];p.bestStars={14:1,22:1};p.introducedConcepts=['print','text_value','sequence'];localStorage.setItem('kodik-progress-v1',JSON.stringify(p))})
  await add(page,'Напечатать'); await add(page,'Текст'); await text(page,'Мне нравится Python')
  await page.getByRole('button',{name:'Подсказка по решению'}).click();await page.getByRole('button',{name:'Ещё подсказка'}).click()
  await passed(page);await expect(page.getByRole('dialog').getByLabel('1 из 3 звёзд')).toBeVisible()
  await page.getByRole('dialog').getByRole('button',{name:'Закрыть'}).click();await page.getByRole('button',{name:'К карте курса'}).click()
  await expect(page.getByRole('button').filter({hasText:'Число или текст?'})).toBeDisabled()
  await expect(page.locator('.gate-message').first()).toContainText('добери 3')
  await page.getByRole('button').filter({hasText:'Теперь — твоё сообщение'}).click()
  await expect(page.locator('.blocklyBlockCanvas .blocklyBlock')).toHaveCount(0)
  await add(page,'Напечатать');await add(page,'Текст');await text(page,'Мне нравится Python');await passed(page)
  await expect(page.getByRole('dialog').getByLabel('3 из 3 звёзд')).toBeVisible()
  await page.getByRole('dialog').getByRole('button',{name:'Закрыть'}).click();await page.getByRole('button',{name:'К карте курса'}).click()
  await page.getByRole('button').filter({hasText:'Узнай свою строку'}).click();await page.getByRole('radio',{name:'print("Привет!")',exact:true}).check();await passed(page)
  await page.getByRole('dialog').getByRole('button',{name:'Закрыть'}).click();await page.getByRole('button',{name:'К карте курса'}).click()
  await expect(page.getByRole('button').filter({hasText:'Число или текст?'})).toBeEnabled()
})

for(const id of [15,16,19,20,21]) test(`переход к коду ${id}`,async({page})=>{
  await seed(page,id)
  if(id===15) await page.getByRole('radio',{name:'print(имя)',exact:true}).check()
  if(id===16) await page.getByRole('radio',{name:'>=',exact:true}).check()
  if(id===19) for(const token of ['print','(','"Учусь!"',')']) await page.locator('.token-options').getByRole('button',{name:token,exact:true}).click()
  if(id===20) await page.getByLabel('Твой Python',{exact:true}).fill("print ( 'Привет!' )")
  if(id===21) await page.getByLabel('Твой Python',{exact:true}).fill('print("Старт")\nprint("Финиш")')
  await passed(page);await expect(page.getByRole('dialog').getByLabel('3 из 3 звёзд')).toBeVisible()
})

test('повторное открытие примера не расходует подсказку после перезагрузки',async({page})=>{
  await seed(page,20)
  await page.getByRole('button',{name:/Вспомнить по блокам/}).click()
  await page.getByRole('dialog').getByRole('button',{name:'Закрыть'}).click()
  await page.reload();await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await page.getByRole('button',{name:/Вспомнить по блокам/}).click()
  await page.getByRole('dialog').getByRole('button',{name:'Закрыть'}).click()
  await page.getByLabel('Твой Python',{exact:true}).fill('print("Привет!")')
  await passed(page);await expect(page.getByRole('dialog').getByLabel('2 из 3 звёзд')).toBeVisible()
})

test('работа без сети, очистка, отмена и системные ошибки хранения',async({page,context})=>{
  await seed(page,13)
  await add(page,'Напечатать');await add(page,'Текст');await text(page,'Мне нравится Python')
  await page.getByRole('button',{name:'Очистить',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Очистить',exact:true}).click()
  await expect(page.locator('.blocklyBlockCanvas .blocklyBlock')).toHaveCount(0)
  await page.getByRole('button',{name:'Отменить изменение'}).click()
  await context.setOffline(true);await expect(page.locator('.network-note')).toBeVisible()
  await passed(page)
})

test('локальное занятие не загружает внешние ресурсы',async({page,baseURL})=>{
  const external:string[]=[];page.on('request',r=>{if(new URL(r.url()).origin!==new URL(baseURL!).origin)external.push(r.url())})
  await page.goto('/');await page.getByRole('button',{name:/Начать бесплатно/}).click();await expect(page.locator('.blocklySvg')).toBeVisible();expect(external).toEqual([])
})

test('все 22 задания подряд, звёзды открывают главы, финал',async({page})=>{
  test.setTimeout(120000)
  await page.setViewportSize({width:390,height:844})
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/');await page.getByRole('button',{name:/Начать бесплатно/}).click()
  const message=async(value:string,index=0)=>{await add(page,'Напечатать');await add(page,'Текст');await text(page,value,index)}
  const create=async(name:string)=>{await page.getByRole('button',{name:'Создать переменную',exact:true}).click();await page.getByLabel('Название переменной').fill(name);await page.getByRole('button',{name:'Создать',exact:true}).click()}
  const condition=async()=>{await add(page,'Если');await add(page,'Сравнить');await add(page,'Получить переменную');await add(page,'Число');await number(page,'10',1);await greater(page);await message('Уровень пройден!')}
  for(let i=0;i<lessons.length;i++){
    const l=lessons[i]
    await expect(page.getByRole('heading',{name:l.title,exact:true})).toBeVisible()
    switch(l.id){
      case 1: await message('Привет!');break
      case 13: await message('Мне нравится Python');break
      case 14: await page.getByRole('radio',{name:'print("Привет!")',exact:true}).check();break
      case 7: await message('Финиш',1);break
      case 22: await message('Старт');await message('Финиш',1);break
      case 6: await add(page,'Число');await number(page,'7');break
      case 2: await create('имя');await add(page,'Присвоить');await add(page,'Текст');await text(page,'Мира');await add(page,'Напечатать');await add(page,'Получить переменную');break
      case 3: await number(page,'3',1);break
      case 8: await page.getByRole('button',{name:'Показать все блоки'}).click();await page.locator('.text_print > .math_arithmetic > .blocklyDropdownField').click();await page.getByRole('option',{name:/×/}).click();break
      case 15: await page.getByRole('radio',{name:'print(имя)',exact:true}).check();break
      case 9: await greater(page);break
      case 5: await condition();break
      case 10: await message('Пока рано',1);break
      case 16: await page.getByRole('radio',{name:'>=',exact:true}).check();break
      case 17: await create('баллы');await add(page,'Присвоить');await add(page,'Число');await number(page,'12');await condition();break
      case 4: await message('Учусь!');break
      case 18: await add(page,'Повторить');await add(page,'Число');await number(page,'3');await message('Учусь!');break
      case 19: for(const token of ['print','(','"Учусь!"',')']) await page.locator('.token-options').getByRole('button',{name:token,exact:true}).click();break
      case 11: await add(page,'Вызвать функцию');break
      case 12: await add(page,'Создать функцию');await message('Привет!');await page.locator('.kodik_define > .blocklyLabelField').first().click();await add(page,'Повторить');await add(page,'Число');await number(page,'3');await add(page,'Вызвать функцию');break
      case 20: case 21: await page.getByLabel('Твой Python',{exact:true}).fill(l.answer!);break
    }
    await passed(page)
    if(!l.tutorial) await expect(page.getByRole('dialog').getByLabel('3 из 3 звёзд')).toBeVisible()
    await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
    if(lessons[i+1] && lessons[i+1].chapter!==l.chapter) await page.getByRole('button').filter({hasText:lessons[i+1].title}).click()
  }
  await expect(page.getByRole('heading',{name:'От блоков — к своим строкам.',exact:true})).toBeVisible()
  await page.reload();await expect(page.getByRole('heading',{name:'Начало положено.',exact:true})).toBeVisible()
  expect(errors).toEqual([])
})

test('повреждённое хранилище и отказ записи не обрушивают новый tutorial',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('kodik-progress-v1','{bad');Storage.prototype.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError')}})
  await page.goto('/');await page.getByRole('button',{name:/Начать бесплатно/}).click()
  await add(page,'Напечатать');await add(page,'Текст');await text(page,'Привет!');await passed(page)
  await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
  await expect(page.locator('.lesson-storage')).toContainText('Не удалось сохранить')
  await page.getByRole('button',{name:'К карте курса'}).click();await expect(page.locator('.course-path .complete')).toHaveCount(1)
})
