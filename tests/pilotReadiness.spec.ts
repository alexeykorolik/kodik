import { test,expect } from '@playwright/test'
function luminance(rgb: string) {
 const parts=rgb.match(/[\d.]+/g)!.slice(0,3).map(Number).map(value=>value/255).map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4)
 return parts[0]*.2126+parts[1]*.7152+parts[2]*.0722
}
function contrast(foreground: string,background: string) {
 const levels=[luminance(foreground),luminance(background)].sort((a,b)=>b-a)
 return (levels[0]+.05)/(levels[1]+.05)
}
for(const width of [320,390])test(`мобильная навигация без дубля, читаемые подписи и контраст при ширине ${width}`,async({page})=>{
 await page.setViewportSize({width,height:667});await page.goto('/')
 await expect(page.getByRole('button',{name:'Карта курса ↗',exact:true})).toHaveCount(0)
 const navigation=page.getByRole('navigation',{name:'Основная навигация'})
 for(const button of await navigation.getByRole('button').all()) {
  const style=await button.evaluate(element=>{const css=getComputedStyle(element);const rect=element.getBoundingClientRect();return {color:css.color,fontSize:parseFloat(css.fontSize),background:getComputedStyle(element.parentElement!).backgroundColor,height:rect.height,left:rect.left,right:rect.right,width:element.clientWidth,scrollWidth:element.scrollWidth}})
  expect(style.fontSize).toBeGreaterThanOrEqual(13);expect(style.height).toBeGreaterThanOrEqual(44)
  expect(style.left).toBeGreaterThanOrEqual(0);expect(style.right).toBeLessThanOrEqual(width);expect(style.scrollWidth).toBeLessThanOrEqual(style.width)
  expect(contrast(style.color,style.background)).toBeGreaterThanOrEqual(4.5)
 }
 const text=await page.locator('.home-greeting .eyebrow').evaluate(element=>({color:getComputedStyle(element).color,background:getComputedStyle(document.documentElement).backgroundColor}))
 expect(contrast(text.color,text.background)).toBeGreaterThanOrEqual(4.5)
 await page.getByRole('button',{name:'Курс',exact:true}).click()
 const chapter=await page.locator('.chapter-switcher small').evaluate(element=>({color:getComputedStyle(element).color,background:getComputedStyle(document.documentElement).backgroundColor}))
 expect(contrast(chapter.color,chapter.background)).toBeGreaterThanOrEqual(4.5)
 await page.getByRole('button',{name:'Прогресс',exact:true}).click();await expect(page.getByRole('heading',{name:'Прогресс',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Карта курса ↗',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Аккаунт',exact:true}).click()
 await expect(page.getByRole('button',{name:'Карта курса ↗',exact:true})).toHaveCount(0)
 await expect(page.getByLabel('Вход в аккаунт — скоро')).toContainText('Скоро')
 await expect(page.getByLabel('Вход в аккаунт — скоро').locator('button,a,input,[tabindex]')).toHaveCount(0)
 await expect(page.locator('.account-name-card')).toContainText('на этом устройстве')
 expect(await page.evaluate(()=>scrollY)).toBe(0)
})
test('desktop сохраняет ссылку курса, клавиатурный фокус зелёный',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.goto('/')
 const link=page.getByRole('button',{name:'Карта курса ↗',exact:true})
 await expect(link).toBeVisible();await link.click();await expect(page.getByRole('heading',{name:'Python с нуля',exact:true})).toBeVisible()
 const button=page.getByRole('button',{name:'Курс',exact:true})
 await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab')
 const color=await button.evaluate(element=>getComputedStyle(element).outlineColor)
 expect(color).toBe('rgb(23, 70, 58)')
})
test('канонические экраны текущего интерфейса',async({page})=>{
 await page.setViewportSize({width:390,height:667});await page.goto('/')
 await page.screenshot({path:'docs/screenshots/current/home-mobile.png'})
 await page.getByRole('button',{name:'Курс',exact:true}).click();await page.screenshot({path:'docs/screenshots/current/course-mobile.png'})
 await page.getByRole('button',{name:'Прогресс',exact:true}).click();await page.screenshot({path:'docs/screenshots/current/progress-mobile.png'})
 await page.getByRole('button',{name:'Аккаунт',exact:true}).click();await page.screenshot({path:'docs/screenshots/current/account-mobile.png'})
 await page.getByRole('button',{name:'Главная',exact:true}).click();await page.getByRole('button',{name:'Начать бесплатно',exact:true}).click()
 await expect(page.locator('.blocklySvg')).toBeVisible();await page.screenshot({path:'docs/screenshots/current/lesson-mobile.png'})
})
