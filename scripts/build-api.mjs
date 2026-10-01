import { build } from 'esbuild'
import { releaseDefines } from './release.mjs'

await build({
  entryPoints: ['server/aiTutor.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: 'api/ai/tutor.js',
  define: releaseDefines(),
})
await build({ entryPoints: ['server/events.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node24', define: releaseDefines(), outfile: 'api/events.js' })
