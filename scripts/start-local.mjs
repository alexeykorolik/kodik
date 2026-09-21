import { spawn, spawnSync } from 'node:child_process'
import { openSync, writeFileSync, closeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:net'
const root = fileURLToPath(new URL('../', import.meta.url))
const port = Number(process.argv[2] || 4173)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port between 1024 and 65535.')
await new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', () => reject(new Error(`Port ${port} is in use. Run npm run local -- 4174 to choose another port.`)))
  probe.listen(port, '127.0.0.1', () => probe.close(resolve))
})
for (const args of [['node_modules/typescript/bin/tsc', '-b'], ['node_modules/vite/bin/vite.js', 'build']]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true })
  if (result.status !== 0) process.exit(result.status || 1)
}
const out = openSync(new URL('../local-server.log', import.meta.url), 'w')
const err = openSync(new URL('../local-server-error.log', import.meta.url), 'w')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', out, err] })
server.unref(); closeSync(out); closeSync(err)
writeFileSync(new URL('../local-server.pid', import.meta.url), String(server.pid))
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`)
    if (response.ok) { console.log(`Kodik is running: http://127.0.0.1:${port}/ (PID ${server.pid})`); process.exit(0) }
  } catch { /* Wait for the local server to start. */ }
  await new Promise(resolve => setTimeout(resolve, 250))
}
throw new Error('Local server did not respond. Check local-server-error.log.')
