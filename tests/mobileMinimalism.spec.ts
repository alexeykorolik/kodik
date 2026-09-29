import { test, expect, type Locator, type Page } from '@playwright/test'
import { lessons } from '../src/course'
import type { SupportLevel } from '../src/skills'

const progressKey = 'kodik-progress-v1'
const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 }
]

async function seed(page: Page, id = 13, support?: SupportLevel) {
  const prior = lessons.slice(0, lessons.findIndex(lesson => lesson.id === id))
  // Seed only saved learner state. Exercise verification and Blockly remain real.
  const data = {
    version: 4,
    completed: prior.map(lesson => lesson.id),
    introducedConcepts: prior.flatMap(lesson => lesson.tutorial || []),
    bestStars: Object.fromEntries(prior.filter(lesson => !lesson.tutorial).map(lesson => [lesson.id, 3])),
    currentLesson: id,
    started: true,
    supportOverrides: support ? { [id]: support } : {}
  }
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data))
  }, { key: progressKey, data })
  await page.goto('/')
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
}

async function add(page: Page, label: string) {
  await page.getByRole('button', { name: /Добавить блок/ }).click()
  await page.getByRole('dialog').locator('.block-options button').filter({ has: page.getByText(label, { exact: true }) }).click()
}

async function editText(page: Page, value: string, index = 0) {
  await page.locator('.text .blocklyInputField').nth(index).click()
  await page.locator('.blocklyHtmlInput').fill(value)
  await page.locator('.blocklyHtmlInput').press('Enter')
}

async function bounds(locator: Locator) {
  await expect(locator).toBeVisible()
  const rect = await locator.boundingBox()
  expect(rect).not.toBeNull()
  return rect!
}

async function assertReachable(locator: Locator, height = 44) {
  const rect = await bounds(locator)
  expect(rect.height).toBeGreaterThanOrEqual(height)
  expect(await locator.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && !!hit && (hit === element || element.contains(hit))
  })).toBe(true)
}

function intersection(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
}

async function assertDialogContained(page: Page) {
  const dialog = page.getByRole('dialog')
  const rect = await bounds(dialog)
  const viewport = page.viewportSize()!
  expect(rect.x).toBeGreaterThanOrEqual(-1)
  expect(rect.y).toBeGreaterThanOrEqual(-1)
  expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1)
  expect(await dialog.evaluate(element => element instanceof HTMLDialogElement && element.open && element.matches(':modal'))).toBe(true)
  await assertReachable(dialog.getByRole('button', { name: 'Закрыть', exact: true }))
}

async function mockVisualViewport(page: Page) {
  // Platform API emulation only. It cannot reproduce an actual OS keyboard.
  await page.addInitScript(() => {
    let height = 0
    let top = 0
    const viewport = new EventTarget()
    Object.defineProperties(viewport, {
      height: { get: () => height || innerHeight },
      width: { get: () => innerWidth },
      offsetTop: { get: () => top },
      offsetLeft: { get: () => 0 },
      pageTop: { get: () => scrollY + top },
      pageLeft: { get: () => scrollX },
      scale: { get: () => 1 }
    })
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => viewport })
    window.addEventListener('kodik:test-visual-viewport', event => {
      const data = (event as CustomEvent<{ height: number; top: number }>).detail
      height = data.height
      top = data.top
      viewport.dispatchEvent(new Event('resize'))
      viewport.dispatchEvent(new Event('scroll'))
    })
  })
}

async function resizeVisualViewport(page: Page, height: number, top = 0) {
  await page.evaluate(detail => window.dispatchEvent(new CustomEvent('kodik:test-visual-viewport', { detail })), { height, top })
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lesson-viewport-height').trim())).toBe(`${height}px`)
}

for (const viewport of viewports) test(`minimalism: редактор и лист выбора не перекрываются ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await seed(page)
  await expect(page.locator('.blocklySvg')).toBeVisible()
  const header = await bounds(page.locator('.lesson-header'))
  const task = await bounds(page.locator('.task-copy'))
  const workspace = await bounds(page.locator('.blockly-host'))
  const addButton = await bounds(page.locator('.add-block-button'))
  const primary = await bounds(page.locator('.primary-action'))
  expect(task.y).toBeGreaterThanOrEqual(header.y + header.height - 1)
  expect(workspace.height).toBeGreaterThanOrEqual(viewport.width < 768 ? viewport.height * .34 : 300)
  if (viewport.width < 768) expect(workspace.width).toBeGreaterThanOrEqual(viewport.width - 40)
  expect(intersection(workspace, primary)).toBe(0)
  expect(intersection(addButton, primary)).toBe(0)
  expect(addButton.y + addButton.height).toBeLessThanOrEqual(primary.y + 1)
  await assertReachable(page.locator('.add-block-button'))
  await assertReachable(page.locator('.primary-action button'))
  await expect(page.locator('.primary-action button')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (viewport.width < 768) {
    await expect(page.locator('.task-intro .stars')).toBeHidden()
    await expect(page.locator('.format-explanation')).toBeHidden()
    await expect(page.locator('.task-details')).toBeHidden()
    await expect(page.locator('.live-mirror .python-code')).toBeHidden()
  } else await expect(page.locator('.live-mirror .python-code')).toBeVisible()

  await page.locator('.add-block-button').click()
  await assertDialogContained(page)
  await assertReachable(page.getByRole('dialog').locator('.block-options button').first())
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.add-block-button')).toBeFocused()
  expect(errors).toEqual([])
})

test('minimalism: первый шаг новичка оставляет место для блоков и одной кнопки', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: /Начать бесплатно/ }).click()
  await expect(page.locator('.coach')).toContainText('Шаг 1')
  const coach = await bounds(page.locator('.coach'))
  expect(coach.height).toBeLessThanOrEqual(110)
  const workspace = await bounds(page.locator('.blockly-host'))
  expect(workspace.height).toBeGreaterThanOrEqual(800 * .34)
  expect(workspace.width).toBeGreaterThanOrEqual(320)
  await assertReachable(page.locator('.add-block-button'))
  await assertReachable(page.locator('.primary-action button'))
  await expect(page.locator('.primary-action button')).toHaveCount(1)
  await page.locator('.add-block-button').click()
  await expect(page.getByRole('dialog').locator('.block-options button')).toHaveCount(1)
  await page.getByRole('dialog').locator('.block-options button').click()
  await expect(page.locator('.coach')).toContainText('Добавь «Текст»')
  await assertReachable(page.locator('.add-block-button'))
})

test('minimalism: мобильный Python в листе, возвращение фокуса и сохранение блоков', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  await add(page, 'Напечатать')
  await add(page, 'Текст')
  await editText(page, 'Мне нравится Python')
  const openCode = page.getByRole('button', { name: 'Показать код', exact: true })
  await assertReachable(openCode)
  await openCode.click()
  await assertDialogContained(page)
  await expect(page.getByRole('dialog').locator('.python-code')).toContainText('print("Мне нравится Python")')
  await page.keyboard.press('Escape')
  await expect(openCode).toBeFocused()
  await expect(page.locator('.live-mirror .python-code')).toBeHidden()
  await expect(page.locator('.text .blocklyInputField')).toContainText('Мне нравится Python')
  await page.reload()
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await expect(page.locator('.text .blocklyInputField')).toContainText('Мне нравится Python')
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible()
  await assertReachable(page.getByRole('button', { name: 'Продолжить', exact: true }))
})

test('minimalism: ошибка оставляет доступный редактор, «Проверить снова» проверяет напрямую', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await seed(page)
  await add(page, 'Напечатать')
  await add(page, 'Текст')
  await editText(page, 'Неверное сообщение')
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Почти получилось', exact: true })).toBeVisible()
  const feedback = await bounds(page.locator('.feedback-panel'))
  for (const selector of ['.blockly-host', '.add-block-button', '.primary-action']) {
    expect(intersection(feedback, await bounds(page.locator(selector)))).toBe(0)
  }
  await assertReachable(page.locator('.add-block-button'))
  await assertReachable(page.getByRole('button', { name: 'Проверить снова', exact: true }))
  await editText(page, 'Мне нравится Python')
  await page.getByRole('button', { name: 'Проверить снова', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).sessions['13'].attempts, progressKey)).toBe(2)
  await expect(page.locator('.primary-action button')).toHaveText('Продолжить')
})

test('minimalism: помощь не расходует подсказку, ступени подсказок остаются короткими и сохраняются', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  const help = page.getByRole('button', { name: 'Помощь с заданием', exact: true })
  await help.click()
  await assertDialogContained(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть', exact: true }).click()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).sessions['13'].hintsUsed, progressKey)).toBe(0)
  const hints: string[] = []
  for (let level = 0; level < 3; level++) {
    const name = level ? 'Ещё подсказка' : 'Нужна подсказка?'
    const inlineAction = page.getByRole('button', { name, exact: true })
    if (await inlineAction.isVisible()) await inlineAction.click()
    else {
      await help.click()
      await page.getByRole('dialog').getByRole('button', { name, exact: true }).click()
      if (await page.getByRole('dialog').isVisible()) await page.getByRole('dialog').getByRole('button', { name: 'Закрыть', exact: true }).click()
    }
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const hint = page.locator('.hint-text')
    await expect(hint).toBeVisible()
    hints.push((await hint.textContent())!)
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).sessions['13'].hintsUsed, progressKey)).toBe(level + 1)
    await assertReachable(page.locator('.add-block-button'))
    await assertReachable(page.locator('.primary-action button'))
  }
  expect(new Set(hints).size).toBe(3)
  await page.reload()
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await expect(page.locator('.hint-text')).toHaveText(hints[2])
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).sessions['13'].hintsUsed, progressKey)).toBe(3)
})

for (const viewport of viewports) test(`minimalism: пять форматов и основное действие ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport)
  await page.goto('/')
  for (const support of ['blocks', 'blocks_with_code', 'guided_code', 'code_tokens', 'free_code'] as SupportLevel[]) {
    await page.evaluate(({ key, support }) => localStorage.setItem(key, JSON.stringify({
      version: 4, completed: [1], currentLesson: 13, started: true, introducedConcepts: ['print', 'text_value'], supportOverrides: { 13: support }
    })), { key: progressKey, support })
    await page.reload()
    await page.getByRole('button', { name: /Продолжить обучение/ }).click()
    await expect(page.locator('.learning-work')).toBeVisible()
    await assertReachable(page.locator('.primary-action button'))
    await expect(page.locator('.primary-action button')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (support.startsWith('blocks')) {
      await expect(page.locator('.blocklySvg')).toBeVisible()
      await assertReachable(page.locator('.add-block-button'))
    } else if (support === 'guided_code') await expect(page.locator('.code-choices')).toBeVisible()
    else if (support === 'code_tokens') {
      await page.locator('.token-options button').last().click()
      await expect(page.locator('.token-result button')).toHaveCount(1)
    } else {
      const answer = page.getByLabel('Твой Python', { exact: true })
      await answer.fill('print("Мне нравится Python")')
      await page.reload()
      await page.getByRole('button', { name: /Продолжить обучение/ }).click()
      await expect(answer).toHaveValue('print("Мне нравится Python")')
    }
  }
})

test('minimalism: симуляция сжатого viewport при вводе текста и переменной', async ({ page }) => {
  // This emulates available viewport geometry, not an Android/iOS keyboard.
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, 20)
  const answer = page.getByLabel('Твой Python', { exact: true })
  await answer.fill('имя = "Мира"\nprint(имя)')
  await answer.focus()
  await page.setViewportSize({ width: 390, height: 420 })
  await answer.scrollIntoViewIfNeeded()
  await assertReachable(answer)
  await assertReachable(page.locator('.primary-action button'))
  await expect(answer).toHaveValue('имя = "Мира"\nprint(имя)')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'К карте курса', exact: true }).click()
  await page.getByRole('button').filter({ hasText: lessons.find(lesson => lesson.id === 2)!.title }).click()
  await page.getByRole('button', { name: /Добавить блок/ }).click()
  await page.getByRole('dialog').locator('.variable-option').click()
  const variable = page.getByLabel('Название переменной')
  await variable.fill('тест')
  await page.setViewportSize({ width: 390, height: 420 })
  await assertDialogContained(page)
  await assertReachable(variable)
  await assertReachable(page.getByRole('dialog').getByRole('button', { name: 'Создать', exact: true }))
  await expect(variable).toHaveValue('тест')
  await page.getByRole('dialog').getByRole('button', { name: 'Создать', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('minimalism: симуляция сжатого viewport с открытым полем Blockly', async ({ page }) => {
  // Blockly uses an HTML overlay; visibility alone cannot detect footer occlusion.
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  await add(page, 'Напечатать')
  await add(page, 'Текст')
  await page.locator('.text .blocklyInputField').click()
  await page.locator('.blocklyHtmlInput').fill('Черновик с клавиатурой')
  await page.setViewportSize({ width: 390, height: 420 })
  const input = page.locator('.blocklyHtmlInput')
  await assertReachable(input, 0)
  await input.press('Enter')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.text .blocklyInputField')).toContainText('Черновик с клавиатурой')
  await assertReachable(page.locator('.add-block-button'))
  await assertReachable(page.locator('.primary-action button'))
})

test('minimalism: эмуляция visualViewport без изменения layout viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockVisualViewport(page)
  await seed(page, 13, 'free_code')
  const answer = page.getByLabel('Твой Python', { exact: true })
  await answer.fill('print("Черновик остаётся")')
  await answer.focus()
  await resizeVisualViewport(page, 420, 70)
  expect(await page.evaluate(() => innerHeight)).toBe(844)
  await expect.poll(() => answer.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const action = document.querySelector('.primary-action')!.getBoundingClientRect()
    return rect.top >= 70 && rect.bottom <= action.top - 1
  })).toBe(true)
  const action = await bounds(page.locator('.primary-action'))
  expect(action.y).toBeGreaterThanOrEqual(70)
  expect(action.y + action.height).toBeLessThanOrEqual(491)
  await assertReachable(answer)
  await assertReachable(page.locator('.primary-action button'))
  await page.getByRole('button', { name: 'Помощь с заданием', exact: true }).click()
  const dialog = await bounds(page.getByRole('dialog'))
  expect(dialog.y).toBeGreaterThanOrEqual(69)
  expect(dialog.y + dialog.height).toBeLessThanOrEqual(491)
  await assertReachable(page.getByRole('dialog').getByRole('button', { name: 'Закрыть', exact: true }))
  await page.keyboard.press('Escape')
  await expect(answer).toHaveValue('print("Черновик остаётся")')
  await resizeVisualViewport(page, 844)
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lesson-keyboard-bottom').trim())).toBe('0px')
})

test('minimalism: строка в мобильном Python выбирает точный исходный блок', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, 22)
  await add(page, 'Напечатать')
  await add(page, 'Текст')
  await editText(page, 'Старт')
  await add(page, 'Напечатать')
  await add(page, 'Текст')
  await editText(page, 'Финиш', 1)
  await page.locator('.text_print').first().click({ position: { x: 18, y: 18 } })
  await expect(page.locator('.live-mirror')).toHaveAttribute('data-selected-id', /.+/)
  const firstSelected = await page.locator('.live-mirror').getAttribute('data-selected-id')
  await page.getByRole('button', { name: 'Показать код', exact: true }).click()
  const line = page.getByRole('dialog').locator('.code-line[data-source-id]').last()
  const targetId = await line.getAttribute('data-source-id')
  expect(targetId).toBeTruthy()
  expect(targetId).not.toBe(firstSelected)
  await expect(line).toContainText('Финиш')
  await assertReachable(line)
  await line.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.live-mirror')).toHaveAttribute('data-selected-id', targetId!)
  await expect(page.locator('.text_print.blocklySelected')).toHaveCount(1)
  await page.getByRole('button', { name: 'Показать код', exact: true }).click()
  await expect(page.getByRole('dialog').locator('.code-line[data-source-id]').last()).toHaveAttribute('data-source-id', targetId!)
  await expect(page.getByRole('dialog').locator('.code-line[data-source-id]').last()).toHaveClass(/code-highlight/)
  await page.keyboard.press('Escape')
  await expect(page.locator('.text .blocklyInputField')).toContainText(['Старт', 'Финиш'])
})

test('minimalism: длинный текст не растягивает редактор, номера строк прокручиваются с текстом', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, 21)
  const answer = page.getByLabel('Твой Python', { exact: true })
  const lines = Array.from({ length: 100 }, (_, index) => `print("строка ${index + 1} ${'x'.repeat(48)}")`)
  const draft = lines.join('\n')
  await answer.fill(draft)
  const editor = await bounds(page.locator('.minimal-code-editor'))
  expect(editor.height).toBeLessThanOrEqual(320)
  await expect(page.locator('.editor-line-numbers')).toHaveText(Array.from({ length: 100 }, (_, index) => index + 1).join('\n'))
  await answer.press('Control+End')
  await expect.poll(() => answer.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  await expect.poll(() => page.locator('.editor-line-numbers').evaluate(element => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
    const input = element.parentElement!.querySelector('textarea')!
    return Math.abs(matrix.m42 + input.scrollTop) <= 1
  })).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await assertReachable(page.locator('.primary-action button'))
  await page.reload()
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await expect(answer).toHaveValue(draft)
  expect((await bounds(page.locator('.minimal-code-editor'))).height).toBeLessThanOrEqual(320)
})

test('minimalism: Blockly с visualViewport 420px сохраняет видимое поле и уменьшает холст', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockVisualViewport(page)
  await seed(page)
  await add(page, 'Напечатать')
  await add(page, 'Текст')
  await page.locator('.text .blocklyInputField').click()
  const input = page.locator('.blocklyHtmlInput')
  await input.fill('Новый черновик')
  await resizeVisualViewport(page, 420, 70)
  expect(await page.evaluate(() => innerHeight)).toBe(844)
  await expect.poll(() => page.locator('.blockly-host').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(165)
  await expect.poll(() => page.locator('.blockly-host').evaluate(element => element.getBoundingClientRect().height)).toBeLessThanOrEqual(175)
  await expect.poll(() => input.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const action = document.querySelector('.primary-action')!.getBoundingClientRect()
    return rect.top >= 70 && rect.bottom <= Math.min(490, action.top - 1)
  })).toBe(true)
  await assertReachable(input, 0)
  await assertReachable(page.locator('.primary-action button'))
  const action = await bounds(page.locator('.primary-action'))
  expect(action.y).toBeGreaterThanOrEqual(70)
  expect(action.y + action.height).toBeLessThanOrEqual(491)
  await expect(input).toHaveValue('Новый черновик')
  await input.press('Enter')
  await resizeVisualViewport(page, 844)
  await expect(page.locator('.text .blocklyInputField')).toContainText('Новый черновик')
  await assertReachable(page.locator('.add-block-button'))
})

test('minimalism: Tab делает отступ, ShiftTab выходит, номера строк не перекрывают прокрученный код', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, 20)
  const answer = page.getByLabel('Твой Python', { exact: true })
  const code = `print("${'длинная_строка_'.repeat(24)}")\nprint("следующая")`
  await answer.fill(code)
  await answer.press('Control+Home')
  await answer.press('Tab')
  await expect(answer).toHaveValue(`    ${code}`)
  await expect(answer).toBeFocused()
  await answer.press('Shift+Tab')
  await expect(answer).not.toBeFocused()
  await answer.focus()
  await answer.evaluate(element => {
    element.scrollLeft = 140
    element.dispatchEvent(new Event('scroll', { bubbles: true }))
  })
  await expect.poll(() => answer.evaluate(element => element.scrollLeft)).toBeGreaterThan(100)
  const gutter = page.locator('.editor-line-numbers')
  expect(await gutter.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(await page.locator('.minimal-code-editor').evaluate(element => getComputedStyle(element).backgroundColor))
  expect(await gutter.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
  expect(await gutter.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none')
  expect(await page.locator('.minimal-code-editor').evaluate(element => {
    const rect = element.getBoundingClientRect()
    return document.elementFromPoint(rect.left + 18, rect.top + 28) === element.querySelector('textarea')
  })).toBe(true)
  const rect = await bounds(page.locator('.minimal-code-editor'))
  await page.mouse.click(rect.x + 18, rect.y + 28)
  await expect(answer).toBeFocused()
  await expect(answer).toHaveValue(`    ${code}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await assertReachable(page.locator('.primary-action button'))
})

test('minimalism: меню программы закрываются снаружи и после действия', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  const editorMenu = page.locator('.editor-menu')
  const workspaceMenu = page.locator('.workspace-menu')
  await page.getByLabel('Другие действия').click()
  await expect(editorMenu).toHaveAttribute('open', '')
  await page.locator('.task-copy').click()
  await expect(editorMenu).not.toHaveAttribute('open', '')
  await page.getByLabel('Действия с программой').click()
  await expect(workspaceMenu).toHaveAttribute('open', '')
  await page.locator('.task-copy').click()
  await expect(workspaceMenu).not.toHaveAttribute('open', '')
  await page.getByLabel('Другие действия').click()
  await editorMenu.getByRole('button', { name: 'Показать все блоки', exact: true }).click()
  await expect(editorMenu).not.toHaveAttribute('open', '')
  await page.getByLabel('Действия с программой').click()
  await workspaceMenu.getByRole('button', { name: 'Очистить программу', exact: true }).click()
  await expect(workspaceMenu).not.toHaveAttribute('open', '')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.editor-menu[open], .workspace-menu[open]')).toHaveCount(0)
  await assertReachable(page.locator('.add-block-button'))
  await assertReachable(page.locator('.primary-action button'))
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).sessions['13'].attempts, progressKey)).toBe(0)
})
