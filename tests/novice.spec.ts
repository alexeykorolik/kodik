import { test, expect, type Page } from '@playwright/test'
import { lessons } from '../src/course'
import { mkdirSync } from 'node:fs'
const add = async (page: Page, name: string) => { await page.getByRole('button',{name:/Добавить блок/}).click(); await page.locator('.block-options button').filter({has:page.getByText(name,{exact:true})}).click() }
const edit = async (page: Page, value: string, index = 0) => { await page.locator('.blocklyInputField').nth(index).click(); await page.locator('.blocklyHtmlInput').fill(value); await page.locator('.blocklyHtmlInput').press('Enter') }
const check = async (page: Page) => { await page.getByRole('button',{name:'Проверить',exact:true}).click(); await expect(page.getByRole('heading',{name:'Получилось!',exact:true})).toBeVisible() }
async function greeting(page: Page, message: string) { await add(page,'Напечатать'); await add(page,'Текст'); await edit(page,message) }

for (const width of [360,390,430,1366]) test(`новичок: первые пять упражнений ${width}`,async ({page}) => {
  await page.setViewportSize({width,height:width === 360 ? 800 : width === 430 ? 932 : width === 1366 ? 768 : 844})
  const errors: string[] = []; page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/'); await page.getByRole('button',{name:/Начать бесплатно/}).click()
  await expect(page.locator('.coach')).toContainText('Шаг 1')
  await expect(page.locator('.blocklyBlockCanvas .blocklyBlock')).toHaveCount(0)
  await page.getByRole('button',{name:/Добавить блок/}).click()
  await expect(page.locator('.block-options button')).toHaveCount(1)
  await page.locator('.block-options button').click()
  await expect(page.locator('.coach')).toContainText('ЧТО показать')
  await expect(page.locator('.live-mirror')).toContainText('print(...)')
  await add(page,'Текст'); await expect(page.locator('.coach')).toContainText('белое поле')
  await edit(page,'Привет!')
  await expect(page.locator('.live-mirror')).toContainText('print("Привет!")')
  await check(page); await expect(page.getByText('Знакомство завершено · без оценки')).toBeVisible()
  await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
  await expect(page.locator('.coach')).toHaveCount(0)
  await greeting(page,'Мне нравится Python'); await check(page)
  await expect(page.getByRole('dialog').getByLabel('3 из 3 звёзд')).toBeVisible()
  await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
  await page.getByRole('radio',{name:'print("Привет!")',exact:true}).check(); await check(page)
  await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
  await expect(page.locator('.coach')).toContainText('соединится')
  await add(page,'Напечатать'); await add(page,'Текст'); await edit(page,'Финиш',1); await check(page)
  await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
  await greeting(page,'Старт'); await add(page,'Напечатать'); await add(page,'Текст'); await edit(page,'Финиш',1); await check(page)
  await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Python с нуля',exact:true})).toBeVisible()
  await expect(page.getByRole('button').filter({hasText:'Число или текст?'})).toBeEnabled()
  await page.getByRole('button').filter({hasText:'Научим программу говорить'}).click()
  await expect(page.locator('.coach')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('черновик, шаг обучения и попытки восстанавливаются после перезагрузки',async ({page})=>{
  await page.goto('/'); await page.getByRole('button',{name:/Начать бесплатно/}).click()
  await add(page,'Напечатать'); await page.reload(); await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await expect(page.locator('.coach')).toContainText('ЧТО показать')
  await add(page,'Текст'); await edit(page,'Привет!'); await check(page); await page.getByRole('dialog').getByRole('button',{name:'Продолжить',exact:true}).click()
  await page.getByRole('button',{name:'Проверить',exact:true}).click(); await page.getByRole('button',{name:'Исправить',exact:true}).click()
  await page.reload(); await page.getByRole('button',{name:/Продолжить обучение/}).click()
  await greeting(page,'Мне нравится Python'); await check(page)
  await expect(page.getByRole('dialog').getByLabel('2 из 3 звёзд')).toBeVisible()
})

for(const [width,height] of [[360,800],[390,844],[430,932],[768,1024],[1366,768],[1920,1080]]) test(`новый интерфейс ${width}`,async({page})=>{
  mkdirSync('artifacts',{recursive:true}); await page.setViewportSize({width,height}); await page.goto('/'); await page.getByRole('button',{name:/Начать бесплатно/}).click(); await expect(page.locator('.blocklySvg')).toBeVisible()
  await page.screenshot({path:`artifacts/novice-${width}.png`,fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button',{name:/Добавить блок/}).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('button',{name:/Добавить блок/})).toBeFocused()
  await page.getByRole('button',{name:'К карте курса'}).click(); await page.screenshot({path:`artifacts/chapters-${width}.png`,fullPage:true})
})
