// One-use provisioning, run from an authenticated Vercel checkout. The generated
// route is removed before the final deploy. It accepts no SQL from the caller.
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
const token = randomBytes(32).toString('hex'), route = `setup${randomBytes(16).toString('hex')}`
const sql = await readFile('supabase/migrations/003_events_and_ai_budget.sql', 'utf8')
const eventId = randomUUID(), sessionId = randomUUID(), learnerId = randomUUID()
const code = `import pg from 'pg';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(Date.now()>${Date.now()+15*60000} || req.method!=='POST' || req.headers.authorization!==${JSON.stringify(`Bearer ${token}`)}) return res.status(404).json({error:'not_found'});
 const connection=new URL(process.env.POSTGRES_URL);
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert']) connection.searchParams.delete(key);
 const config={connectionString:connection.toString(),ssl:{rejectUnauthorized:false}};
 const client=new pg.Client(config);
 try {
  await client.connect();
  if(req.body?.action==='verify') {
   const result=await client.query('select data from public.learning_events where id=$1',[${JSON.stringify(eventId)}]);
   return res.status(200).json({count:result.rowCount,privateFieldsAbsent:result.rows.every(row=>!('code' in row.data)&&!('email' in row.data)),data:result.rows[0]?.data});
  }
  await client.query('begin');
  await client.query(${JSON.stringify(sql)});
  await client.query('commit');
  const qa='qa:'+crypto.randomUUID();
  const pool=new pg.Pool({...config,max:20});
  const buckets=JSON.stringify([{key:qa,limit:8,expires:new Date(Date.now()+60000).toISOString()}]);
  let claims;
  try {claims=await Promise.all(Array.from({length:20},()=>pool.query('select public.claim_learning_budget($1::jsonb) as allowed',[buckets])));}
  finally {await pool.end();}
  const allowed=claims.filter(result=>result.rows[0].allowed).length;
  await client.query('delete from public.learning_budgets where bucket=$1',[qa]);
  const access=await client.query("select has_table_privilege('anon','public.learning_events','select') as can_read,has_function_privilege('anon','public.claim_learning_budget(jsonb)','execute') as can_claim");
  await client.query("notify pgrst, 'reload schema'");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  let rest;
  try {
   const response=await fetch(process.env.SUPABASE_URL+'/rest/v1/learning_events?select=id&limit=0',{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(8000)});
   let errorCode; if(!response.ok) {const body=await response.json().catch(()=>({}));errorCode=body.code;}
   rest={status:response.status,errorCode};
  }catch(error){rest={error:error.name};}
  return res.status(200).json({migration:true,concurrentAllowed:allowed,concurrentRejected:20-allowed,anonymousAccess:access.rows[0],rest});
 } catch(error) {await client.query('rollback').catch(()=>{});return res.status(500).json({error:'setup_failed',code:error.code || error.name});}
 finally {await client.end();}
}`
await writeFile('.vercel/audit-setup-info.json', JSON.stringify({ token, route, eventId, sessionId, learnerId }))
await build({ stdin: { contents: code, resolveDir: process.cwd(), sourcefile: '.vercel/audit-setup.js' }, bundle: true, platform: 'node', format: 'esm', target: 'node24', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }, outfile: `api/${route}.js` })
console.log('One-use storage setup prepared. No credentials exported.')
