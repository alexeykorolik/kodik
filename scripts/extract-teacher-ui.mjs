import {build} from 'esbuild';
import {mkdir,copyFile,cp,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const root=resolve('teacher-demo');
const built=await build({entryPoints:['src/b2b/App.tsx','src/pythonExecution.ts','src/pythonRuntime.ts','src/pythonStructure.ts'],bundle:true,write:false,outdir:'work/demo-discovery',format:'esm',metafile:true,jsx:'automatic'});
for(const file of Object.keys(built.metafile.inputs).filter(f=>f.startsWith('src/'))){const dest=resolve(root,'kodik',file);await mkdir(dirname(dest),{recursive:true});await copyFile(file,dest)}
const app=resolve(root,'kodik/src/b2b/App.tsx');let source=await readFile(app,'utf8');
source=source.replace('<div className="main-column">','<div className="main-column"><div className="teacher-demo-label"><strong>ДЕМОВЕРСИЯ</strong><span>Кабинет преподавателя · 14 вымышленных учеников · изменения сохраняются в этом браузере</span><button onClick={()=>window.dispatchEvent(new Event("kodik-demo-reset"))}>Сбросить демо</button></div>');
// The hosted extraction always has a teacher identity; no owner portal or legacy app is included.
source=source.replace("import {Owner} from './Owner';","const Owner=()=>null;");
await writeFile(app,source);
await copyFile('src/b2b/styles.css',resolve(root,'kodik/src/b2b/styles.css'));
await cp('public/fonts',resolve(root,'fonts'),{recursive:true});
console.log(JSON.stringify({extractedFiles:Object.keys(built.metafile.inputs).filter(f=>f.startsWith('src/')).length}));
