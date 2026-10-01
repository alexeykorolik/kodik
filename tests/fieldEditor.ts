import type { Page } from '@playwright/test'

export async function fillFieldEditor(page: Page, value: string) {
  const keyboard = page.getByRole('dialog', { name: 'Клавиатура Кодик' })
  if (await keyboard.isVisible()) {
    await keyboard.getByRole('button', { name: 'Очистить', exact: true }).click()
    const numeric = await keyboard.getByRole('button', { name: '123', exact: true }).count() === 0
    let layout = 'ru'
    for (const char of value) {
      if (char === ' ') { await keyboard.getByRole('button', { name: 'Пробел', exact: true }).click(); continue }
      const target = /[а-яё]/i.test(char) ? 'ru' : /[a-z]/i.test(char) ? 'en' : 'numbers'
      if (!numeric && layout !== target) {
        if (layout === 'numbers') { await keyboard.getByRole('button', { name: 'АБВ', exact: true }).click(); layout = 'ru' }
        if (target === 'numbers') await keyboard.getByRole('button', { name: '123', exact: true }).click()
        else if (layout !== target) await keyboard.getByRole('button', { name: layout === 'ru' ? 'EN' : 'РУ', exact: true }).click()
        layout = target
      }
      if (!numeric && char !== char.toLowerCase()) await keyboard.getByRole('button', { name: 'Заглавная буква', exact: true }).click()
      await keyboard.getByRole('button', { name: char, exact: true }).click()
    }
    await keyboard.getByRole('button', { name: 'Готово', exact: true }).click()
  } else {
    await page.locator('.blocklyHtmlInput').fill(value)
    await page.locator('.blocklyHtmlInput').press('Enter')
  }
}
