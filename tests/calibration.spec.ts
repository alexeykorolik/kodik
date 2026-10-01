import { test, expect, type Page } from '@playwright/test'
import { lessons } from '../src/course'
import { curriculumVersion } from '../src/release'
async function seed(page: Page, id: number, free = false) {
 const prior = lessons.slice(0,lessons.findIndex(item=>item.id===id))
 await page.addInitScript(data=>{if(!localStorage.getItem('kodik-progress-v1')) localStorage.setItem('kodik-progress-v1',JSON.stringify(data))},{version:4,completed:prior.map(item=>item.id),started:true,currentLesson:id,introducedConcepts:prior.flatMap(item=>item.tutorial || []),skillStates:{},sessions:free ? {[id]:{attempts:0,hintsUsed:0,solutionUsed:false,startedAt:Date.now(),supportLevel:'free_code'}} : {}})
 await page.goto('/'); await page.getByRole('button',{name:/Продолжить обучение/}).click()
}
for(const [id,answer] of [[68,'2'],[80,'int(input())'],[91,'40']] as const) test(`новый навык в ${id} открывается с помощью и сохраняет ответ`,async({page})=>{
 await page.setViewportSize({width:390,height:667});await seed(page,id)
 await expect(page.locator('.lesson-flow.support-guided_code')).toBeVisible()
 await page.getByRole('radio',{name:answer,exact:true}).check()
 await page.reload();await page.getByRole('button',{name:/Продолжить обучение/}).click()
 await expect(page.getByRole('radio',{name:answer,exact:true})).toBeChecked()
 await page.getByRole('button',{name:'Проверить',exact:true}).click();await expect(page.getByRole('heading',{name:'Получилось!',exact:true})).toBeVisible()
 const events=await page.evaluate(()=>JSON.parse(localStorage.getItem('kodik-events-v1')!))
 const event=events.findLast((event: {name:string})=>event.name==='lesson_completed')
 expect(event.curriculumVersion).toBe(curriculumVersion)
 expect(event.appVersion).toMatch(/^[a-f0-9]{40}$/)
 expect(event.data.supportLevel).toBe('guided_code')
 expect(event.data.runStartedAt).toBeGreaterThan(0)
 expect(event.data.independent).toBe(true)
})
test('пробелы в незавершённом Python не создают вторую ошибку для восстановления',async({page})=>{
 await page.setViewportSize({width:390,height:667});await seed(page,80,true)
 const input=page.getByLabel('Твой Python',{exact:true})
 await input.fill('print( "x"');await page.getByRole('button',{name:'Проверить',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Почти получилось',exact:true})).toBeVisible()
 await input.fill('print("x"');await page.getByRole('button',{name:'Проверить снова',exact:true}).click()
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kodik-progress-v1')!).sessions['80'].attempts)).toBe(2)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kodik-progress-v1')!))
 expect(saved.sessions['80'].meaningfulErrors).toBe(1)
 expect(saved.sessions['80'].checkedFingerprints).toHaveLength(1)
 await expect(page.getByRole('button',{name:'Закрепить на примере',exact:true})).toHaveCount(0)
})
