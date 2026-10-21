import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('.'),npm=process.platform==='win32'?'npm.cmd':'npm';
function command(file,args,cwd=root,env=process.env){return execFileSync(file,args,{cwd,env,stdio:'inherit',windowsHide:true,shell:process.platform==='win32'&&file.endsWith('.cmd')})}
execFileSync('git',['diff','--quiet'],{cwd:root});execFileSync('git',['diff','--cached','--quiet'],{cwd:root});
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim();if(untracked)throw new Error('Commit all release source files before checking a clean release.');
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
await mkdir(resolve('work'),{recursive:true});const directory=await mkdtemp(resolve('work/release-')),archive=join(directory,'source.tar'),checkout=join(directory,'checkout');await mkdir(checkout);
command('git',['archive','--format=tar','-o',archive,sha]);command('tar',['-xf',archive,'-C',checkout]);
// A git archive has no .git directory. Preserve the source identity in the built
// application instead of silently labelling the clean release as "development".
const cleanEnv={...process.env,VERCEL_GIT_COMMIT_SHA:sha};
command(npm,['ci','--no-audit','--no-fund'],checkout);command(npm,['run','build'],checkout,cleanEnv);command(npm,['run','test:smoke'],checkout,cleanEnv);
const report={at:new Date().toISOString(),commit:sha,node:process.version,os:process.platform,sourceSha256:createHash('sha256').update(await readFile(archive)).digest('hex'),cleanInstall:true,build:true,smoke:true,directory,scope:'Clean install from committed sources on this Windows host. The target deployment host requires its own acceptance.'};
await writeFile(resolve('work/clean-release-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
