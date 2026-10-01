import { build } from 'esbuild'

await build({
  entryPoints: ['server/aiTutor.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: 'api/ai/tutor.js',
})
await build({ entryPoints: ['server/events.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node24', outfile: 'api/events.js' })
