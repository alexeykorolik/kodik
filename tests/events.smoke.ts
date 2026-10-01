import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import handler from '../server/events'
import { identity, digest } from '../server/storage'
const originalFetch=globalThis.fetch
const prior=[process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY]
process.env.SUPABASE_URL='https://storage.example.com';process.env.SUPABASE_SERVICE_ROLE_KEY='unit-test-secret'
let status=0, body:unknown, headers:Record<string,string>={}
const res={setHeader:(key:string,value:string)=>{headers[key]=value},status:(value:number)=>{status=value;return res},json:(value:unknown)=>{body=value}}
const event={id:randomUUID(),sessionId:randomUUID(),name:'check',lesson:58,at:Date.now(),data:{passed:false,attempt:1,skillId:'function',code:'print("secret")',email:'secret@example.com'}}
const request={method:'POST',headers:{host:'app.example.com',origin:'https://app.example.com'},body:{learnerId:randomUUID(),events:[event]}}
let inserted:unknown
globalThis.fetch=async (url,init)=>{
 if(String(url).includes('rpc/claim_learning_budget'))return new Response('true',{status:200})
 inserted=JSON.parse(String(init?.body));return new Response(null,{status:201})
}
await handler(request,res)
assert.equal(status,200);assert.deepEqual(body,{accepted:[event.id]})
assert.equal(JSON.stringify(inserted).includes('secret'),false)
assert.equal(JSON.stringify(inserted).includes((request.body.learnerId)),false)
assert.ok(headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Lax'))
const first=identity({...request,headers:{...request.headers,cookie:headers['Set-Cookie']}},res)
const repeated=identity({...request,headers:{...request.headers,cookie:headers['Set-Cookie']}},res)
assert.equal(first.learner,repeated.learner)
const signed=String(headers['Set-Cookie']).split('=')[1].split(';')[0]
assert.equal(first.learner,digest(signed.split('.')[0]))
await handler({...request,headers:{...request.headers,origin:'https://other.example.com'}},res);assert.equal(status,403)
globalThis.fetch=async()=>new Response('false',{status:200})
await handler(request,res);assert.equal(status,429)
globalThis.fetch=async()=>{throw Error('offline')}
await handler(request,res);assert.equal(status,503)
globalThis.fetch=originalFetch
for(const [i,key]of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].entries()){if(prior[i]===undefined)delete process.env[key];else process.env[key]=prior[i]}
console.log('✓ Events: empty201 acknowledgement, private schema, stable signed identity, origin, quota and outage.')
