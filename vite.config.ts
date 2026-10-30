import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { brotliCompressSync, gzipSync, constants } from 'node:zlib'
import { releaseDefines } from './scripts/release.mjs'

// Full Python for the practice sandbox: Pyodide (CPython in WebAssembly) served from our own origin,
// never from a CDN. Files live under a versioned path so browsers may cache them for good.
const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
const PYODIDE_TYPES: Record<string, string> = { '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.zip': 'application/zip', '.json': 'application/json' }
function pyodideAssets(): Plugin {
  const dir = resolve('node_modules/pyodide'), version = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version
  const base = `pyodide/${version}/`
  return {
    name: 'kodik-pyodide',
    config: () => ({ define: { 'import.meta.env.VITE_PYODIDE_BASE': JSON.stringify('/' + base) } }),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = req.url?.match(/^\/pyodide\/[^/]+\/([^?#]+)/)?.[1]
        if (!file || !PYODIDE_FILES.includes(file)) return next()
        res.setHeader('Content-Type', PYODIDE_TYPES[file.slice(file.lastIndexOf('.'))] || 'application/octet-stream')
        res.end(readFileSync(join(dir, file)))
      })
    },
    generateBundle() {
      // Precompressed copies (brotli 13.5 → 5.5 MB) for the server to send when the browser accepts them.
      // The standard library is a zip already and gains nothing.
      for (const file of PYODIDE_FILES) {
        const source = readFileSync(join(dir, file))
        this.emitFile({ type: 'asset', fileName: base + file, source })
        if (file.endsWith('.zip')) continue
        this.emitFile({ type: 'asset', fileName: base + file + '.br', source: brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }) })
        this.emitFile({ type: 'asset', fileName: base + file + '.gz', source: gzipSync(source, { level: 9 }) })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), pyodideAssets()],
  server: { proxy: { '/api': 'http://127.0.0.1:4173' } },
  define: releaseDefines(),
})
