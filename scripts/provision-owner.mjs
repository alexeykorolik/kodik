import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {openDatabase} from '../server/b2b/database.mjs';
import {passwordHash} from '../server/b2b/app.mjs';
// Explicit operator-only bootstrap. Credentials come from the environment, never a public API.
const login=process.env.KODIK_OWNER_LOGIN?.trim().toLowerCase(),password=process.env.KODIK_OWNER_PASSWORD;
if(!login||login.length>120||!password||password.length<10||password.length>128)throw new Error('Set KODIK_OWNER_LOGIN and KODIK_OWNER_PASSWORD (10–128 characters).');
const db=openDatabase(process.env.KODIK_DB||resolve('data/kodik.sqlite'));
try{
  if(db.prepare('SELECT 1 FROM users WHERE login=?').get(login))throw new Error('Login already exists. Choose a dedicated owner login; school accounts are not promoted.');
  const org=randomUUID(),user=randomUUID(),at=new Date().toISOString(),hashed=await passwordHash(password);
  db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO organizations VALUES(?,?,?)').run(org,'Kodik — владелец',at);db.prepare("INSERT INTO users(id,org_id,name,login,password,role,platform_owner,created_at) VALUES(?,?,?,?,?,'admin',1,?)").run(user,org,'Владелец Kodik',login,hashed,at);db.prepare('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)').run(randomUUID(),org,user,'owner.provisioned',user,'{}',at);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  console.log('Dedicated platform owner created. Sign in using the configured login.');
}finally{db.close()}
