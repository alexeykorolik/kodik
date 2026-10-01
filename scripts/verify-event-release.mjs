// QA against the short-lived provisioning route; no server credentials leave Vercel.
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
const info = JSON.parse(await readFile('.vercel/audit-setup-info.json','utf8'))
const base = process.env.KODIK_TEST_URL || 'https://kodiknew.vercel.app'
const sha = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const event = {id:info.eventId,sessionId:info.sessionId,name:'check',lesson:58,at:Date.now(),curriculumVersion:'2026-10-01.2',appVersion:sha,lessonKey:'client-override',data:{passed:true,attempt:1,independent:true,hintsUsed:0,runStartedAt:Date.now(),code:'QA-private-code',email:'qa@example.test'}}
for (let i=0;i<2;i++) {
 const response = await fetch(`${base}/api/events`,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({learnerId:info.learnerId,events:[event]}),signal:AbortSignal.timeout(15000)})
 const result = await response.json()
 if (!response.ok || result.accepted?.[0]!==event.id) throw new Error(`Event acknowledgement failed: ${response.status}`)
}
const response = await fetch(`${base}/api/${info.route}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${info.token}`},body:JSON.stringify({action:'verify'}),signal:AbortSignal.timeout(15000)})
const result = await response.json()
console.log('Release event verification:',response.status,result)
if (!response.ok || result.count!==1 || !result.privateFieldsAbsent || result.event.curriculum_version!==event.curriculumVersion || result.event.app_version!==sha || result.event.lesson_key!=='functions.square') throw new Error('Stored event version, identity, privacy or idempotence mismatch')
