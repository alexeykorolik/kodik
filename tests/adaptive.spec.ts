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
  await page.getByRole('button',{name:/^Проверить(?: снова)?$/}).click()
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
  for(let i=0;i<2;i++) {
    await page.getByRole('button',{name:/^Проверить(?: снова)?$/}).click()
    await expect(page.getByRole('heading',{name:'Почти получилось',exact:true})).toBeVisible()
    await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions['13'].attempts,progressKey)).toBe(i+1)
  }
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).skillStates,progressKey)).toEqual(initial)
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions['13'].meaningfulErrors,progressKey)).toBe(0)
  await add(page,'Напечатать');await add(page,'Текст')
  for(let i=0;i<3;i++) {
    await page.getByRole('button',{name:'Проверить снова',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Почти получилось',exact:true})).toBeVisible()
    await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions['13'].attempts,progressKey)).toBe(i+3)
  }
  const saved = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(saved.sessions['13'].attempts).toBe(5)
  expect(saved.sessions['13'].meaningfulErrors).toBe(1)
  expect(saved.sessions['13'].checkedFingerprints).toHaveLength(1)
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
  for (const [index,answer] of ['print("ошибка")','print ( "ошибка" )'].entries()) {
    await page.getByLabel('Твой Python',{exact:true}).fill(answer)
    await page.getByRole('button',{name:/^Проверить(?: снова)?$/}).click()
    await expect(page.getByRole('heading',{name:'Почти получилось',exact:true})).toBeVisible()
    await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions['13'].attempts,progressKey)).toBe(index+1)
  }
  const saved = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(saved.sessions['13'].attempts).toBe(2);expect(saved.sessions['13'].checkedFingerprints).toHaveLength(1)
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

for (const [width,height] of [[360,800],[375,812],[390,844],[430,932]]) test(`mobile feedback, повторная проверка и успех без перекрытия ${width}`,async({page})=>{
  await page.setViewportSize({width,height})
  await page.addInitScript(()=>localStorage.setItem('kodik-progress-v1',JSON.stringify({version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value']})))
  await page.goto('/');await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await add(page,'Напечатать');await add(page,'Текст')
  const field=page.locator('.text .blocklyInputField')
  const edit=async(value:string)=>{await field.click();await page.locator('.blocklyHtmlInput').fill(value);await page.locator('.blocklyHtmlInput').press('Enter')}
  await edit('Другое сообщение')
  await page.getByRole('button',{name:'Проверить',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Почти получилось',exact:true})).toBeVisible()
  await expect(page.locator('.primary-action button')).toHaveCount(1)
  await expect(page.getByRole('button',{name:'Проверить снова',exact:true})).toBeVisible()
  const feedback=page.locator('.feedback-panel')
  const assertFeedbackGeometry=async()=>{
    await feedback.evaluate(element=>element.scrollIntoView({block:'end',behavior:'instant'}))
    await expect.poll(async()=>page.evaluate(()=>{
      const panel=document.querySelector('.feedback-panel')!.getBoundingClientRect()
      const workspace=document.querySelector('.blockly-host')!.getBoundingClientRect()
      const action=document.querySelector('.primary-action')!.getBoundingClientRect()
      return panel.top>=workspace.bottom-1 && panel.bottom<=action.top+1 && panel.top>=0 && action.bottom<=innerHeight+1
    })).toBe(true)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
  await assertFeedbackGeometry()
  await feedback.getByText('Подробности проверки',{exact:true}).click()
  const errorDialog=page.getByRole('dialog',{name:'Подробности проверки',exact:true})
  await expect(errorDialog.locator('.python-code')).toContainText('Другое сообщение')
  expect(await errorDialog.evaluate(element=>element.matches(':modal'))).toBe(true)
  const errorSheet=await errorDialog.boundingBox()
  expect(errorSheet).not.toBeNull();expect(errorSheet!.y).toBeGreaterThanOrEqual(0);expect(errorSheet!.y+errorSheet!.height).toBeLessThanOrEqual(height+1)
  await errorDialog.getByRole('button',{name:'Закрыть',exact:true}).click()
  await expect(feedback.getByRole('button',{name:'Подробности проверки',exact:true})).toBeFocused()
  await assertFeedbackGeometry()
  const first=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(first.sessions['13'].attempts).toBe(1);expect(first.sessions['13'].meaningfulErrors).toBe(1)
  await page.getByRole('button',{name:'Проверить снова',exact:true}).click()
  await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions['13'].attempts,progressKey)).toBe(2)
  const retry=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(retry.sessions['13'].meaningfulErrors).toBe(1)
  expect(retry.sessions['13'].checkedFingerprints).toEqual(first.sessions['13'].checkedFingerprints)
  expect(retry.skillStates).toEqual(first.skillStates)
  expect(retry.recommendedPractice).toBeUndefined()
  await edit('Мне нравится Python')
  await expect(page.getByRole('heading',{name:'Почти получилось',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Проверить снова',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Проверить снова',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Получилось!',exact:true})).toBeVisible()
  await expect(feedback.getByLabel('2 из 3 звёзд')).toBeVisible()
  await expect(page.locator('.primary-action button')).toHaveCount(1)
  await expect(page.getByRole('button',{name:'Продолжить',exact:true})).toBeVisible()
  await feedback.getByText('Посмотреть результат',{exact:true}).click()
  const resultDialog=page.getByRole('dialog',{name:'Результат программы',exact:true})
  await expect(resultDialog.locator('.python-code')).toContainText('print("Мне нравится Python")')
  await expect(resultDialog.locator('.output-preview')).toContainText('Мне нравится Python')
  expect(await resultDialog.evaluate(element=>element.matches(':modal'))).toBe(true)
  await resultDialog.locator('.sheet-body').evaluate(element=>{element.scrollTop=element.scrollHeight})
  const close=await resultDialog.getByRole('button',{name:'Закрыть',exact:true}).boundingBox()
  expect(close).not.toBeNull();expect(close!.y).toBeGreaterThanOrEqual(0);expect(close!.y+close!.height).toBeLessThanOrEqual(height+1)
  await resultDialog.getByRole('button',{name:'Закрыть',exact:true}).click()
  await expect(feedback.getByRole('button',{name:'Посмотреть результат',exact:true})).toBeFocused()
  await assertFeedbackGeometry()
  const success=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),progressKey)
  expect(success.sessions['13'].attempts).toBe(3);expect(success.bestStars['13']).toBe(2)
  await page.getByRole('button',{name:'Продолжить',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Узнай свою строку',exact:true})).toBeVisible()
})

for(const width of [375,390]) test(`free code сохраняет строку и CTA при уменьшении viewport ${width}`,async({page})=>{
  await page.setViewportSize({width,height:844})
  await page.addInitScript(()=>{if(!localStorage.getItem('kodik-progress-v1'))localStorage.setItem('kodik-progress-v1',JSON.stringify({version:4,completed:[1],currentLesson:13,started:true,introducedConcepts:['print','text_value'],supportOverrides:{13:'free_code'}}))})
  await page.goto('/');await page.getByRole('button',{name:/Продолжить обучение/}).click()
  const editor=page.getByLabel('Твой Python',{exact:true})
  await editor.fill('print("Мне нравится Python")');await editor.focus()
  // A reduced viewport exercises layout/scroll recovery; it is not a physical keyboard test.
  await page.setViewportSize({width,height:444})
  await editor.focus()
  await expect(editor).toBeFocused()
  await expect.poll(async()=>page.evaluate(()=>{
    const editor=document.querySelector('textarea')!.getBoundingClientRect()
    const action=document.querySelector('.primary-action')!.getBoundingClientRect()
    return editor.top>=0 && editor.bottom<=action.top+1 && action.top>=0 && action.bottom<=innerHeight+1
  })).toBe(true)
  await expect(editor).toHaveValue('print("Мне нравится Python")')
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions['13'].answer,progressKey)).toBe('print("Мне нравится Python")')
  await page.setViewportSize({width,height:844});await editor.blur()
  await page.reload();await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await expect(page.getByLabel('Твой Python',{exact:true})).toHaveValue('print("Мне нравится Python")')
  await page.getByRole('button',{name:'Проверить',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Получилось!',exact:true})).toBeVisible()
})

for (const width of [360,375,390,430,768,1440]) test(`все форматы без горизонтального переполнения ${width}`,async({page})=>{
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
