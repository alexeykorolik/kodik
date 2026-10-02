import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const mode = process.argv[2] || 'debug'
if (!['debug','release'].includes(mode)) throw new Error('Choose debug or release')
const root = resolve(import.meta.dirname,'..')
const localPaths = join(root,'artifacts/android-toolchain/paths.json')
const paths = existsSync(localPaths) ? JSON.parse(readFileSync(localPaths,'utf8')) : {}
const java = process.env.JAVA_HOME || paths.java
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || paths.sdk
if (!java || !sdk) throw new Error('Set JAVA_HOME (JDK 21) and ANDROID_HOME (SDK 36). See docs/ANDROID_APP.md')
writeFileSync(join(root,'android/local.properties'),`sdk.dir=${sdk.replaceAll('\\','/') }\n`)
const command = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const result = spawnSync(command, [mode === 'debug' ? 'assembleDebug' : 'assembleRelease','--console=plain','--no-daemon'], {
  cwd:join(root,'android'), env:{...process.env,JAVA_HOME:java,ANDROID_HOME:sdk}, stdio:'inherit', shell:process.platform === 'win32',
})
if (result.status !== 0) process.exit(result.status || 1)
const file = mode === 'debug' ? 'app-debug.apk' : 'app-release-unsigned.apk'
const directory = join(root,'artifacts/android'); mkdirSync(directory,{recursive:true})
const output = join(directory, mode === 'debug' ? 'Kodik-debug.apk' : 'Kodik-release-unsigned.apk')
copyFileSync(join(root,`android/app/build/outputs/apk/${mode}/${file}`),output)
console.log(`APK: ${output}`)
