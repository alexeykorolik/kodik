import assert from 'node:assert/strict'
import { apiCors, trustedApiOrigin } from '../server/apiOrigin'
import events from '../server/events'
import tutor from '../server/aiTutor'
import { abortable, resolveApiBaseUrl } from '../src/api'
import { registerBackAction, handleAndroidBack } from '../src/nativeBack'

assert.equal(resolveApiBaseUrl(false),'/api')
assert.equal(resolveApiBaseUrl(true,'https://kodiknew.vercel.app/api/'),'https://kodiknew.vercel.app/api')
for (const url of [undefined,'/api','http://kodiknew.vercel.app/api']) assert.throws(()=>resolveApiBaseUrl(true,url))
const controller = new AbortController()
const pending = abortable(new Promise<void>(()=>{}),controller.signal)
controller.abort(); await assert.rejects(pending)
assert.equal(await abortable(Promise.resolve(42)),42)
await assert.rejects(abortable(Promise.reject(Error('network')),new AbortController().signal),/network/)

let screen='lesson', modal=true, keyboard=true
const removals=[
  registerBackAction(()=>{ if(screen==='home') return false; screen=screen==='lesson'?'course':'home'; return true }),
  registerBackAction(()=>{ if(!modal)return false;modal=false;return true },100),
  registerBackAction(()=>{ if(!keyboard)return false;keyboard=false;return true },200),
]
assert.equal(handleAndroidBack(),true);assert.equal(keyboard,false);assert.equal(modal,true);assert.equal(screen,'lesson')
handleAndroidBack();assert.equal(modal,false);assert.equal(screen,'lesson')
handleAndroidBack();assert.equal(screen,'course');handleAndroidBack();assert.equal(screen,'home')
assert.equal(handleAndroidBack(),false);removals.forEach(remove=>remove());assert.equal(handleAndroidBack(),false)

let code=0, headers:Record<string,string>={}
const res={status:(value:number)=>{code=value;return res},json:(_value:unknown)=>{},setHeader:(key:string,value:string)=>{headers[key]=value}}
const native={method:'OPTIONS',headers:{host:'kodiknew.vercel.app',origin:'https://localhost'}}
assert.equal(trustedApiOrigin(native),true);assert.equal(apiCors(native,res),false);assert.equal(code,200)
assert.equal(headers['Access-Control-Allow-Origin'],'https://localhost');assert.equal(headers['Access-Control-Allow-Credentials'],'true')
for(const origin of ['https://evil.example','https://localhost.evil.example','http://localhost','null','https://localhost:1234']) {
  assert.equal(trustedApiOrigin({...native,headers:{...native.headers,origin}}),false)
  for(const handler of [events,tutor]) { await handler({...native,headers:{...native.headers,origin}},res);assert.equal(code,403) }
}
for(const handler of [events,tutor]) { headers={};await handler(native,res);assert.equal(code,200);assert.equal(headers['Access-Control-Allow-Origin'],'https://localhost') }
assert.equal(trustedApiOrigin({...native,headers:{...native.headers,origin:'https://kodiknew.vercel.app'}}),true)
console.log('✓ Android integration: HTTPS API config, abort/failure, Back priorities, exact trusted origins and both preflight handlers.')
