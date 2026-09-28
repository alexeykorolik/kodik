import { chromium, expect, type Page } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// No fabricated mastery, overrides or completions. Build the demo history by
// solving the actual UI in a separate, disposable browser context.
const server = spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5190','--strictPort'],{cwd:process.cwd(),windowsHide:true,stdio:'pipe'})
let output = '';server.stderr?.on('data',data=>{output += data.toString()})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const base = 'http://127.0.0.1:5190'
async function add(page:Page,name:string) {
  await page.getByRole('button',{name:/Добавить блок/}).click()
  await page.locator('.block-options button').filter({has:page.getByText(name,{exact:true})}).click()
}
async function greeting(page:Page,message:string) {
  await add(page,'Напечатать');await add(page,'Текст')
  await page.locator('.text .blocklyInputField').click();await page.locator('.blocklyHtmlInput').fill(message);await page.locator('.blocklyHtmlInput').press('Enter')
}
async function pass(page:Page) {
  await page.getByRole('button',{name:'Проверить',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Получилось!',exact:true})).toBeVisible()
}
async function repeat(page:Page) {
  await page.getByRole('button',{name:'К карте курса'}).click()
  await page.getByRole('button').filter({hasText:'Теперь — твоё сообщение'}).click()
}
async function snapshot(page:Page,name:string) {
  const storage = await page.evaluate(()=>({progress:localStorage.getItem('kodik-progress-v1')!,events:localStorage.getItem('kodik-events-v1')!}))
  writeFileSync(resolve('artifacts',`demo-${name}.json`),JSON.stringify(storage,null,2))
  await page.screenshot({path:resolve('artifacts',`demo-${name}.png`),fullPage:true})
  return storage
}
try {
  await new Promise<void>((res,rej)=>{
    const timeout = setTimeout(()=>rej(new Error(`Demo preview did not start. ${output}`)),15000)
    server.once('error',rej);server.once('exit',()=>rej(new Error(`Demo preview stopped. ${output}`)))
    server.stdout?.on('data',data=>{if(data.toString().includes('5190')){clearTimeout(timeout);res()}})
  })
  mkdirSync(resolve('artifacts'),{recursive:true})
  browser = await chromium.launch({channel:'msedge',headless:true})
  const page = await browser.newPage({viewport:{width:1440,height:900}})
  await page.goto(base);await page.getByRole('button',{name:/Начать бесплатно/}).click()
  await greeting(page,'Привет!');await pass(page)
  await snapshot(page,'first-blocks')
  await page.getByRole('button',{name:'Продолжить',exact:true}).click()
  for(let i=0;i<3;i++) {await greeting(page,'Мне нравится Python');await pass(page);if(i<2)await repeat(page)}
  await snapshot(page,'blocks-with-code')
  await repeat(page)
  await expect(page.locator('.format-explanation')).toContainText('часть Python уже готова')
  const guided = await snapshot(page,'guided-ready')
  for(let i=0;i<2;i++) {await page.getByRole('radio',{name:'"Мне нравится Python"',exact:true}).check();await pass(page);await repeat(page)}
  await expect(page.locator('.token-options')).toBeVisible()
  await snapshot(page,'tokens-ready')
  for(let i=0;i<2;i++) {
    const tokens = await page.locator('.token-options button').allTextContents()
    const code = 'print("Мне нравится Python")';let built = '';const used:number[] = []
    while(built!==code) {
      const index=tokens.findIndex((token,n)=>!used.includes(n)&&code.startsWith(built+token))
      if(index<0)throw new Error('Cannot assemble the real token variant')
      used.push(index);built+=tokens[index];await page.locator('.token-options button').nth(index).click()
    }
    await pass(page);await repeat(page)
  }
  await expect(page.getByLabel('Твой Python',{exact:true})).toBeVisible()
  await snapshot(page,'free-ready')
  console.log('Real demo history and screenshots saved in artifacts/demo-*.json and artifacts/demo-*.png.')
  await browser.close();browser=undefined
  if (process.argv.includes('--open')) {
    // Explicitly requested by the person running this command; never use their normal profile.
    browser = await chromium.launch({channel:'msedge',headless:false})
    const page = await browser.newPage({viewport:{width:1440,height:900}})
    await page.addInitScript(data=>{localStorage.setItem('kodik-progress-v1',data.progress);localStorage.setItem('kodik-events-v1',data.events)},guided)
    await page.goto(base);await page.getByRole('button',{name:/Продолжить обучение/}).click()
    console.log('Isolated demo opened. Close this browser window to stop its preview.')
    await new Promise<void>(res=>browser!.once('disconnected',()=>res()))
  }
} finally {await browser?.close();server.kill()}
