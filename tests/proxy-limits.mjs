import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/b2b/app.mjs';
// Audit item: behind a reverse proxy every connection comes from the proxy. Login limits must still
// be per school network, so one school's failed logins cannot lock out another school; and a client
// must not escape the limits by sending its own X-Forwarded-For.
async function server(options){
  const dir=await mkdtemp(join(tmpdir(),'kodik-proxy-')),app=createApp({dbPath:join(dir,'p.sqlite'),secure:false,loginNetworkBudget:6,...options});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${app.server.address().port}`;
  const login=async(forwarded,user,password)=>{const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(forwarded?{'X-Forwarded-For':forwarded}:{})},body:JSON.stringify({login:user,password})});return r.status};
  const register=async(school,user,password)=>{const r=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Forwarded-For':'198.51.100.250'},body:JSON.stringify({school,name:'Админ',login:user,password})});assert.equal(r.status,200)};
  return {login,register,close:async()=>{await new Promise(r=>app.server.close(r));await rm(dir,{recursive:true,force:true}).catch(()=>{})}};
}
const password='Proxy-limits-test-321!';

test('behind a trusted proxy each school network has its own login budget',async()=>{
  const s=await server({trustedProxies:['127.0.0.1','::1']});
  try{
    await s.register('Школа А','proxy-school-a',password);await s.register('Школа Б','proxy-school-b',password);
    // School A (203.0.113.10) exhausts its network budget with wrong passwords (different logins).
    const a=[];for(let i=0;i<8;i++)a.push(await s.login('203.0.113.10',`unknown-a-${i}`,'wrong-password-123'));
    assert.deepEqual(a.slice(0,6),[401,401,401,401,401,401]);assert.equal(a[6],429);
    assert.equal(await s.login('203.0.113.10','proxy-school-a',password),429,'school A is limited');
    // School B behind the same proxy is not affected.
    assert.equal(await s.login('198.51.100.7','proxy-school-b',password),200);
    // A client of school A cannot escape by sending a forged first X-Forwarded-For entry:
    // the proxy appends the real address, and only that right-most entry counts.
    assert.equal(await s.login('192.0.2.99, 203.0.113.10','proxy-school-a',password),429);
  }finally{await s.close()}
});

test('without a trusted proxy the header is ignored and cannot be used to evade limits',async()=>{
  const s=await server({trustedProxies:[]});
  try{
    const codes=[];for(let i=0;i<8;i++)codes.push(await s.login(`192.0.2.${i}`,`nobody-${i}`,'wrong-password-123'));
    assert.equal(codes[6],429,'forged addresses all count as the one real connection');
  }finally{await s.close()}
});
