import { execFileSync } from 'node:child_process'
export function releaseDefines() {
  let sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (!sha) try { sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch { sha = 'development' }
  if (!/^[0-9a-f]{40}$/.test(sha)) sha = 'development'
  return { __KODIK_APP_VERSION__: JSON.stringify(sha) }
}
