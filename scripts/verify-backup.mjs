import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {backupDatabase} from './database-backup.mjs';
import {createApp} from '../server/b2b/app.mjs';
export async function verifyBackup(source,destination){
  const original=new DatabaseSync(resolve(source),{readOnly:true}),snapshots=[];
  try{
    const tables=original.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('submission_jobs','schema_migrations')").all();
    for(const {name} of tables){if(!/^[a-z_]+$/.test(name))throw new Error('Unexpected table name.');const columns=original.prepare(`PRAGMA table_info(${name})`).all().map(c=>c.name);snapshots.push({name,columns,rows:original.prepare(`SELECT ${columns.join(',')} FROM ${name}`).all()});}
  }finally{original.close();}
  await backupDatabase(source,destination);
  const {server,db}=createApp({dbPath:resolve(destination),secure:false});
  try{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));const response=await fetch(`http://127.0.0.1:${server.address().port}/api/health`);if(!response.ok)throw new Error('Restored application is not ready.');const health=await response.json();
    for(const table of snapshots){const rows=new Set(db.prepare(`SELECT ${table.columns.join(',')} FROM ${table.name}`).all().map(r=>JSON.stringify(r)));if(table.rows.some(r=>!rows.has(JSON.stringify(r))))throw new Error(`Restoration changed existing records in ${table.name}.`);}
    return {verified:true,tables:snapshots.length,preservedRows:snapshots.reduce((n,t)=>n+t.rows.length,0),schema:health.schema,httpReady:true};
  }finally{await new Promise(r=>server.close(r));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(!process.argv[2]||!process.argv[3])throw new Error('Usage: node scripts/verify-backup.mjs SOURCE_BACKUP.sqlite NEW_RESTORE_PROBE.sqlite');console.log(JSON.stringify(await verifyBackup(process.argv[2],process.argv[3])));}
