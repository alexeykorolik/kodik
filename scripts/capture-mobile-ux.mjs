import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { lessons } from '../src/course.ts'

const output = 'docs/mobile-ux'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge' })

async function scene(name, progress, action) {
  if (process.env.UX_SCENE && process.env.UX_SCENE !== name) return
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  if (name === '09-typing-keyboard') await context.addInitScript(() => {
    let height = 844
    const viewport = new EventTarget()
    Object.defineProperties(viewport, { height: { get: () => height }, offsetTop: { get: () => 0 } })
    Object.defineProperty(window, 'visualViewport', { get: () => viewport })
    window.addEventListener('kodik:preview-keyboard', () => { height = 578; viewport.dispatchEvent(new Event('resize')) })
  })
  if (progress) await context.addInitScript(data => localStorage.setItem('kodik-progress-v1', JSON.stringify(data)), progress)
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/')
  await action(page)
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: false, animations: 'disabled' })
  await context.close()
}

function before(id) {
  const prior = lessons.slice(0, lessons.findIndex(lesson => lesson.id === id))
  return { version: 4, started: true, currentLesson: id, completed: prior.map(lesson => lesson.id), introducedConcepts: prior.flatMap(lesson => lesson.tutorial || []), bestStars: Object.fromEntries(prior.filter(lesson => !lesson.tutorial).map(lesson => [lesson.id, 3])), supportOverrides: { [id]: id === 16 ? 'guided_code' : id === 19 ? 'code_tokens' : id >= 20 ? 'free_code' : 'blocks_with_code' } }
}
async function addBlock(page, label) {
  await page.getByRole('button', { name: /Добавить блок/ }).click()
  await page.getByRole('dialog').locator('.block-options button').filter({ has: page.getByText(label, { exact: true }) }).click()
}
async function preparedBlockLesson(page) {
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await addBlock(page, 'Напечатать')
  await addBlock(page, 'Текст')
  await page.locator('.text .blocklyInputField').click()
  const keyboard = page.getByRole('dialog', { name: 'Клавиатура Кодик' })
  await keyboard.getByRole('button', { name: 'Очистить', exact: true }).click()
  await keyboard.getByRole('button', { name: 'Заглавная буква' }).click()
  for (const letter of ['К', 'о', 'д', 'и', 'к']) await keyboard.getByRole('button', { name: letter, exact: true }).click()
  await keyboard.getByRole('button', { name: 'Готово' }).click()
}
await scene('01-home', null, async page => { await page.getByRole('heading', { name: /Привет!/ }).waitFor() })
await scene('02-path', before(3), async page => { await page.getByRole('button', { name: 'Карта курса ↗' }).click() })
await scene('03-block-lesson', before(13), preparedBlockLesson)
await scene('04-add-block-sheet', null, async page => { await page.getByRole('button', { name: /Начать бесплатно/ }).click(); await page.getByRole('button', { name: /Добавить блок/ }).click(); await page.getByRole('dialog').waitFor() })
await scene('04a-number-keyboard', before(6), async page => { await page.getByRole('button', { name: /Продолжить обучение/ }).click(); await addBlock(page, 'Число'); await page.locator('.math_number .blocklyField').first().click(); await page.getByRole('dialog', { name: 'Клавиатура Кодик' }).waitFor() })
await scene('05-python-preview', before(13), async page => { await preparedBlockLesson(page); await page.getByRole('button', { name: 'Показать код', exact: true }).click(); await page.getByRole('dialog').waitFor() })
await scene('06-guided-input', before(16), async page => { await page.getByRole('button', { name: /Продолжить обучение/ }).click() })
await scene('07-token-input', before(19), async page => { await page.getByRole('button', { name: /Продолжить обучение/ }).click() })
await scene('08-free-input', before(20), async page => { await page.getByRole('button', { name: /Продолжить обучение/ }).click() })
await scene('09-typing-keyboard', before(20), async page => {
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await page.getByLabel('Твой Python', { exact: true }).fill('имя = "Мира"\nprint(имя)')
  await page.getByLabel('Твой Python', { exact: true }).focus()
  await page.evaluate(() => {
    window.dispatchEvent(new Event('kodik:preview-keyboard'))
    const keyboard = document.createElement('div')
    keyboard.className = 'prototype-keyboard'
    keyboard.setAttribute('aria-label', 'Демонстрация системной клавиатуры')
    keyboard.innerHTML = '<div class="keyboard-toolbar">Готово <span>⌄</span></div><div class="keyboard-keys">Q W E R T Y U I O P<br>A S D F G H J K L<br>⇧ Z X C V B N M ⌫<br>123　 ,　 пробел　 .　 ↵</div>'
    keyboard.style.cssText = 'position:fixed;z-index:80;bottom:0;left:0;right:0;height:266px;background:#d7dce1;color:#25313a;font:20px/2 system-ui;text-align:center;padding:7px 9px;box-shadow:0 -4px 16px #0002'
    document.body.append(keyboard)
  })
})
await scene('10-error', before(20), async page => { await page.getByRole('button', { name: /Продолжить обучение/ }).click(); await page.getByLabel('Твой Python', { exact: true }).fill('print('); await page.getByRole('button', { name: 'Проверить', exact: true }).click(); await page.getByText('Почти получилось').waitFor() })
await scene('11-success', before(20), async page => { await page.getByRole('button', { name: /Продолжить обучение/ }).click(); await page.getByLabel('Твой Python', { exact: true }).fill('имя = "Мира"\nprint(имя)'); await page.getByRole('button', { name: 'Проверить', exact: true }).click(); await page.getByText('Получилось!').waitFor() })
await scene('12-extended-course', before(90), async page => { await page.getByRole('button', { name: 'Карта курса ↗' }).click() })
await scene('13-final-project', before(100), async page => {
  await page.getByRole('button', { name: /Продолжить обучение/ }).click()
  await page.getByLabel('Твой Python', { exact: true }).fill(lessons.find(lesson => lesson.id === 100).answer)
  await page.getByRole('button', { name: 'Проверить', exact: true }).click()
  await page.getByText('Получилось!').waitFor()
  await page.getByRole('button', { name: 'Посмотреть результат', exact: true }).click()
})
await browser.close()
