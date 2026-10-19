import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { releaseDefines } from './scripts/release.mjs'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:4173' } },
  define: releaseDefines(),
})
