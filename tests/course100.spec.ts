import { expect, test } from '@playwright/test'
import { solutionReferences } from '../src/course100Solutions'

const shortAnswers: Record<number, string> = { 23: '10', 30: '5', 39: 'True\nFalse\nFalse', 40: '<' }

test('все 100 заданий проходят в настоящем интерфейсе по порядку', async ({ page }) => {
  await page.goto('/?course=100')
  await expect(page.getByRole('heading', { name: '100 заданий для практики' })).toBeVisible()
  await page.getByRole('button', { name: /Продолжить с задания 1/ }).click()
  for (let id = 1; id <= 100; id++) {
    await expect(page.locator('.course100-lesson')).toHaveAttribute('data-course-task', String(id))
    await page.getByLabel(shortAnswers[id] ? 'Твой ответ' : 'Твоя программа на Python').fill(shortAnswers[id] || solutionReferences[id])
    await page.getByRole('button', { name: 'Проверить', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Получилось!' })).toBeVisible()
    if (id < 100) await page.getByRole('button', { name: /Следующее задание/ }).click()
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kodik-course-100-v1') || '{}'))
  expect(saved.completed).toHaveLength(100)
  expect(Object.values(saved.stars)).toHaveLength(100)
  await page.reload()
  await expect(page.getByText('Выполнено 100 из 100')).toBeVisible()
})

test('мобильный курс показывает ввод и рисунок без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('kodik-course-100-v1', JSON.stringify({ version: 1, completed: Array.from({ length: 99 }, (_, index) => index + 1), stars: {}, attempts: {}, hints: {}, drafts: {}, support: {}, errors: {}, mastery: {}, currentTask: 100 })))
  await page.goto('/?course=100')
  await page.getByRole('button', { name: /Продолжить с задания 100/ }).click()
  await page.getByLabel('Твоя программа на Python').fill(solutionReferences[100])
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Результат движения черепашки' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('задание на исправление открывается с ошибкой, подсказка и звёзды сохраняются', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('kodik-course-100-v1')) localStorage.setItem('kodik-course-100-v1', JSON.stringify({ version: 1, completed: [1, 2, 3, 4, 5, 6], stars: {}, attempts: {}, hints: {}, drafts: {}, support: {}, errors: {}, mastery: {}, currentTask: 7 })) })
  await page.goto('/?course=100')
  await page.getByRole('button', { name: /Продолжить с задания 7/ }).click()
  await expect(page.getByLabel('Твоя программа на Python')).toHaveValue('print("Привет"')
  await page.getByRole('button', { name: 'Показать подсказку 1 из 3' }).click()
  await expect(page.locator('.course100-hint')).toHaveCount(1)
  await page.reload()
  await page.getByRole('button', { name: /Продолжить с задания 7/ }).click()
  await expect(page.locator('.course100-hint')).toHaveCount(1)
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Проверь код' })).toBeVisible()
  await page.getByLabel('Твоя программа на Python').fill(solutionReferences[7])
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Получилось!' })).toBeVisible()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kodik-course-100-v1') || '{}'))
  expect(saved.stars['7']).toBe(2)
  await page.reload()
  await page.getByRole('button', { name: /Почини print/ }).click()
  await expect(page.locator('.course100-hint')).toHaveCount(0)
  await page.getByLabel('Твоя программа на Python').fill(solutionReferences[7])
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kodik-course-100-v1') || '{}').stars['7'])).toBe(3)
})
