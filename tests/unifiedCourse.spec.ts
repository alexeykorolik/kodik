import { expect, test, type Page } from '@playwright/test'
import { lessons } from '../src/course'

async function seed(page: Page, id: number) {
  const prior = lessons.slice(0, lessons.findIndex(lesson => lesson.id === id))
  await page.addInitScript(data => {
    if (!localStorage.getItem('kodik-progress-v1')) localStorage.setItem('kodik-progress-v1', JSON.stringify(data))
  }, { version: 4, completed: prior.map(lesson => lesson.id), currentLesson: id, started: true, bestStars: {}, introducedConcepts: prior.flatMap(lesson => lesson.tutorial || []), sessions: id >= 23 ? { [id]: { attempts: 0, hintsUsed: 0, solutionUsed: false, startedAt: Date.now(), supportLevel: 'free_code' } } : {} })
  await page.goto('/')
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
}

for (const height of [568, 667]) test(`главная и карта помещаются в короткий мобильный экран ${height}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height })
  await page.goto('/')
  const reachable = async (selector: string) => {
    expect(await page.locator(selector).evaluate(element => {
      const rect = element.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return rect.top >= 0 && rect.bottom <= innerHeight && !!hit && element.contains(hit)
    })).toBe(true)
  }
  await reachable('.home-main-action')
  await page.mouse.wheel(0, 600)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.getByRole('button', { name: 'Курс', exact: true }).click()
  await reachable('.path-page-controls button:last-child')
  await reachable('.path-fixed-continue')
  await page.mouse.wheel(0, 600)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('единый курс сохраняет ошибку, подсказку и исправленное решение', async ({ page }) => {
  await seed(page, 23)
  await page.getByLabel('Твой Python', { exact: true }).fill('print("Неверно")')
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Почти получилось', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Нужна подсказка?', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await expect(page.getByLabel('Твой Python', { exact: true })).toHaveValue('print("Неверно")')
  await expect(page.locator('.hint-text')).toBeVisible()
  await page.getByLabel('Твой Python', { exact: true }).fill(lessons.find(lesson => lesson.id === 23)!.answer!)
  await page.getByRole('button', { name: 'Проверить снова', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kodik-progress-v1')!))
  expect(saved.completed).toContain(23)
  expect(saved.sessions['23'].attempts).toBe(2)
})

test('мобильный финальный проект рисует звезду и завершает основной курс', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, 100)
  await page.getByLabel('Твой Python', { exact: true }).fill(lessons.find(lesson => lesson.id === 100)!.answer!)
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Посмотреть результат', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Рисунок программы' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Рисунок программы' }).locator('line')).toHaveCount(5)
  expect(await page.getByRole('img', { name: 'Рисунок программы' }).locator('line').first().evaluate(line => getComputedStyle(line).stroke)).not.toBe('none')
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'От блоков — к своим строкам.', exact: true })).toBeVisible()
})

test('мобильная страница закреплена, число вводится клавиатурой Kodik', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const dialogs: string[] = []
  page.on('dialog', dialog => { dialogs.push(dialog.type()); void dialog.dismiss() })
  await seed(page, 6)
  await page.getByRole('button', { name: 'Добавить блок', exact: true }).click()
  await page.getByRole('dialog').locator('.block-options button').filter({ has: page.getByText('Число', { exact: true }) }).click()
  await page.locator('.math_number .blocklyInputField').click()
  const keyboard = page.getByRole('dialog', { name: 'Клавиатура Кодик' })
  await expect(keyboard).toBeVisible()
  await keyboard.getByRole('button', { name: 'Очистить', exact: true }).click()
  await keyboard.getByRole('button', { name: '7', exact: true }).click()
  await keyboard.getByRole('button', { name: 'Готово', exact: true }).click()
  await expect(page.locator('.blocklyHtmlInput')).toHaveCount(0)
  await expect(page.locator('.math_number .blocklyInputField')).toContainText('7')
  await page.mouse.wheel(0, 800)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible()
  expect(dialogs).toEqual([])
  await context.close()
})
