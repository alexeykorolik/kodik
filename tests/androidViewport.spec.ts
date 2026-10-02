import { test, expect } from '@playwright/test'

for (const [width,height] of [[360,800],[393,873],[412,915]]) test(`Android viewport ${width}×${height}: навигация, блоки и локальный профиль`, async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/')
  for(const name of ['Курс','Прогресс','Аккаунт'] as const) {
    await page.getByRole('button',{name,exact:true}).click()
    const button=page.getByRole('button',{name,exact:true})
    const rect=await button.boundingBox();expect(rect!.y+rect!.height).toBeLessThanOrEqual(height)
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height)
  }
  await page.getByLabel('Как тебя называть?').fill('Кодик')
  await page.getByRole('button',{name:'Сохранить имя'}).click()
  await page.reload();await page.getByRole('button',{name:'Аккаунт',exact:true}).click()
  await expect(page.getByLabel('Как тебя называть?')).toHaveValue('Кодик')
  await page.getByRole('button',{name:'Главная',exact:true}).click()
  await page.getByRole('button',{name:'Начать бесплатно',exact:true}).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await page.getByRole('button',{name:'Развернуть редактор'}).click()
  await expect(page.locator('.block-workspace-grid.is-expanded')).toBeVisible()
  await page.getByRole('button',{name:'Свернуть редактор'}).click()
  await page.getByRole('button',{name:'Добавить блок',exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button',{name:'Закрыть',exact:true}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
