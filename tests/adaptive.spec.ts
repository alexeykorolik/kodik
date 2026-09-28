import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const progressKey = 'kodik-progress-v1'
async function add(page:Page,name:string) {
  await page.getByRole('button',{name:/Добавить блок/}).click()
  await page.locator('.block-options button').filter({has:page.getByText(name,{exact:true})}).click()
}
async function solve(page:Page,level:string) {
  if (level.startsWith('blocks')) {
    await add(page,'Напечатать');await add(page,'Текст')
    await page.locator('.text .blocklyInputField').click();await page.locator('.blocklyHtmlInput').fill('Мне нравится Python');await page.locator('.blocklyHtmlInput').press('Enter')
  } else if (level === 'guided_code') await page.getByRole('radio',{name:'"Мне нравится Python"',exact:true}).check()
  else if (level === 'code_tokens') {
    const tokens = await page.locator('.token-options button').allTextContents()
    const code = 'print("Мне нравится Python")';let assembled = '';const used:number[] = []
    while (assembled !== code) {
      const index = tokens.findIndex((token,i)=>!used.includes(i) && code.startsWith(assembled+token))
      expect(index).toBeGreaterThanOrEqual(0);used.push(index);assembled += tokens[index]
      await page.locator('.token-options button').nth(index).click()
    }
  } else await page.getByLabel('Твой Python',{exact:true}).fill('print("Мне нравится Python")')
  await page.getByRole('button',{name:'Проверить',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Получилось!',exact:true})).toBeVisible()
}
async function reopen(page:Page) {
  await page.getByRole('button',{name:'К карте курса'}).click()
  await page.getByRole('button').filter({hasText:'Теперь — твоё сообщение'}).click()
}
test('реальные решения проходят всю лестницу, новые успехи обязательны на каждом шаге',async({page})=>{
  test.setTimeout(120000)
  const strong = (skillId:string)=>({skillId,mastery:.8,attempts:2,successes:2,independentSuccesses:2,hintsUsed:0,consecutiveErrors:0})
  // Only historical preparation is seeded. Every new success below is checked through the UI.
  await page.addInitScript(data=>localStorage.setItem('kodik-progress-v1',JSON.stringify(data)),{version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value'],skillStates:{print:strong('print'),string:strong('string')},supportOverrides:{13:'blocks'},supportCheckpoint:{successes:{print:2,string:2},errors:{}}})
  await page.goto('/');await page.getByRole('button',{name:/Продолжить обучение/}).click()
  for (const level of ['blocks','blocks_with_code','guided_code','code_tokens']) {
    for(let success=0;success<2;success++) {
      expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions['13'].supportLevel,progressKey)).toBe(level)
      await solve(page,level);await reopen(page)
    }
    await expect(page.locator('.support-message')).toContainText('следующий шаг')
  }
  await expect(page.getByLabel('Твой Python',{exact:true})).toBeVisible()
  await solve(page,'free_code')
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).skillStates.print.independentSuccesses,progressKey)).toBe(11)
})
test('пустые и повторные неизменённые проверки не создают доказательства затруднения',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('kodik-progress-v1',JSON.stringify({version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value']})))
  await page.goto('/');await page.getByRole('button',{name:/Продолжить обучение/}).click()
  const initial = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).skillStates,progressKey)
  for(let i=0;i<2;i++) {await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByRole('button',{name:'Попробовать снова',exact:true}).click()}
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).skillStates,progressKey)).toEqual(initial)
  await add(page,'Напечатать');await add(page,'Текст')
  for(let i=0;i<3;i++) {await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByRole('button',{name:'Попробовать снова',exact:true}).click()}
  const saved = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(saved.sessions['13'].meaningfulErrors).toBe(1)
  expect(saved.recommendedPractice).toBeUndefined()
})
test('адаптивные tokens восстанавливаются после обновления страницы',async({page})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem('kodik-progress-v1'))localStorage.setItem('kodik-progress-v1',JSON.stringify({version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value'],supportOverrides:{13:'code_tokens'}}))})
  await page.goto('/');await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await page.locator('.token-options button').last().click()
  const saved = await page.locator('.token-result').textContent()
  await page.reload();await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await expect(page.locator('.token-result')).toHaveText(saved!)
  await expect(page.locator('.token-options button:disabled')).toHaveCount(1)
})
test('изменение только пробелов в том же неправильном коде не считается новой ошибкой',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('kodik-progress-v1',JSON.stringify({version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value'],supportOverrides:{13:'free_code'}})))
  await page.goto('/');await page.getByRole('button',{name:/Продолжить обучение/}).click()
  for (const answer of ['print("ошибка")','print ( "ошибка" )']) {
    await page.getByLabel('Твой Python',{exact:true}).fill(answer)
    await page.getByRole('button',{name:'Проверить',exact:true}).click()
    await page.getByRole('button',{name:'Попробовать снова',exact:true}).click()
  }
  const saved = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(saved.sessions['13'].meaningfulErrors).toBe(1);expect(saved.recommendedPractice).toBeUndefined()
})
test('выход из короткой практики через карту не отключает оценку основного урока',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('kodik-progress-v1',JSON.stringify({version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value'],activePractice:{id:'string-corrective-1',lessonId:-101,returnLessonId:13,message:'Закрепим',reason:'corrective'}})))
  await page.goto('/');await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await expect(page.locator('.practice-intro')).toBeVisible()
  await page.getByRole('button',{name:'К карте курса'}).click()
  await page.getByRole('button').filter({hasText:'Теперь — твоё сообщение'}).click()
  await solve(page,'blocks_with_code')
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(saved.activePractice).toBeUndefined();expect(saved.completed).toContain(13);expect(saved.bestStars['13']).toBe(3)
})

for (const width of [360,390,430,768,1440]) test(`все форматы без горизонтального переполнения ${width}`,async({page})=>{
  mkdirSync('artifacts',{recursive:true});await page.setViewportSize({width,height:width<768?844:1024})
  await page.goto('/')
  for (const level of ['blocks','blocks_with_code','guided_code','code_tokens','free_code']) {
    await page.evaluate(({key,level})=>localStorage.setItem(key,JSON.stringify({version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value'],supportOverrides:{13:level}})),{key:progressKey,level})
    await page.reload();await page.getByRole('button',{name:/Продолжить обучение/}).click()
    await expect(page.locator('.learning-work')).toBeVisible()
    await expect(page.getByRole('button',{name:'Проверить',exact:true})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    if (level.startsWith('blocks')) {
      await expect(page.locator('.blocklySvg')).toBeVisible()
      if (width>=768 && level==='blocks_with_code') await expect(page.locator('.live-mirror .code-reveal')).toBeVisible()
    }
    await page.screenshot({path:`artifacts/support-${level}-${width}.png`,fullPage:true})
  }
})
