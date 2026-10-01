import { expect, test } from '@playwright/test'

test('ошибка → AI подсказка → новая попытка, без влияния AI на оценку', async ({ page }) => {
  test.skip(process.env.KODIK_AI_UI_TEST !== 'true', 'Requires VITE_AI_TUTOR_ENABLED=true in the test server')
  await page.addInitScript(() => localStorage.setItem('kodik-progress-v1', JSON.stringify({ version: 4, started: true, currentLesson: 14,
    completed: [1,13], introducedConcepts: ['print','text_value'], skillStates: {
      print: { skillId: 'print', mastery: .8, attempts: 2, successes: 2, independentSuccesses: 2, hintsUsed: 0, consecutiveErrors: 0 },
      string: { skillId: 'string', mastery: .8, attempts: 2, successes: 2, independentSuccesses: 2, hintsUsed: 0, consecutiveErrors: 0 },
    } })))
  let requests = 0
  await page.route('**/api/ai/tutor', async route => {
    requests++
    const body = route.request().postDataJSON()
    expect(body.action).toBe('hint')
    expect(body.context.lastError.type).toBeTruthy()
    expect(body.context.currentSolution.normalizedStructure).toBe('not_shared')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      type: 'hint', message: 'Вспомни, какая команда показывает сообщение.', concept: null, example: null,
      shouldRevealSolution: false, confidence: 'high',
    }) })
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await page.getByRole('radio', { name: 'say("Привет!")', exact: true }).check()
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Почти получилось' })).toBeVisible()
  await page.getByRole('button', { name: 'Нужна подсказка?' }).click()
  await expect(page.locator('.hint-area')).toContainText('Вспомни, какая команда показывает сообщение.')
  expect(requests).toBe(1)
  await page.getByRole('radio', { name: 'print("Привет!")', exact: true }).check()
  await page.getByRole('button', { name: 'Проверить снова' }).click()
  await expect(page.getByRole('heading', { name: 'Получилось!' })).toBeVisible()
  const data = await page.evaluate(() => ({ progress: JSON.parse(localStorage.getItem('kodik-progress-v1') || '{}'), events: JSON.parse(localStorage.getItem('kodik-events-v1') || '[]') }))
  expect(data.progress.sessions['14'].hintsUsed).toBe(1)
  expect(data.progress.sessions['14'].finished).toBe(true)
  expect(data.events.some((event: { name: string; data?: { passed?: boolean } }) => event.name === 'ai_hint_outcome' && event.data?.passed)).toBe(true)
})

test('объяснение, пример и разбор ошибки доступны без свободного чата', async ({ page }) => {
  test.skip(process.env.KODIK_AI_UI_TEST !== 'true', 'Requires AI flags in the test server')
  await page.addInitScript(() => localStorage.setItem('kodik-progress-v1', JSON.stringify({ version: 4, started: true, currentLesson: 14, completed: [1,13] })))
  const actions: string[] = []
  await page.route('**/api/ai/tutor', async route => {
    const action = route.request().postDataJSON().action as string
    actions.push(action)
    const type = action === 'example' ? 'example' : 'explanation'
    const message = action === 'concept' ? 'Команда вывода показывает значение на экране.' : action === 'example' ? 'Представь, что нужно показать другое сообщение.' : 'Проверь, совпадает ли выбранная команда с задачей.'
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type, message, concept: null,
      example: action === 'example' ? { code: 'print("Другая задача")', explanation: 'Здесь показан другой текст.' } : null,
      shouldRevealSolution: false, confidence: 'high' }) })
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await page.getByRole('button', { name: 'Объясни проще' }).click()
  await expect(page.locator('.ai-tutor-answer')).toContainText('Команда вывода показывает')
  await page.getByRole('button', { name: 'Похожий пример' }).click()
  await expect(page.locator('.ai-tutor-answer')).toContainText('Другая задача')
  await page.getByRole('radio', { name: 'say("Привет!")', exact: true }).check()
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await page.getByRole('button', { name: 'Почему ошибка?' }).click()
  await expect(page.locator('.ai-feedback-answer')).toContainText('Проверь, совпадает ли')
  expect(actions).toEqual(['concept', 'example', 'error_explanation'])
})
