import { readFile } from 'node:fs/promises'
const info=JSON.parse(await readFile('.vercel/audit-setup-info.json','utf8'))
const base=process.env.KODIK_TEST_URL || 'https://kodiknew.vercel.app'
const response=await fetch(`${base}/api/${info.route}`,{method:'POST',headers:{Authorization:`Bearer ${info.token}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(60000)})
const result=await response.json()
console.log('Storage setup:',response.status,result)
if (!response.ok || result.concurrentAllowed!==8 || result.anonymousAccess?.can_read || result.anonymousAccess?.can_claim) process.exitCode=1
