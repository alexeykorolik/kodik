import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { releaseDefines } from './scripts/release.mjs'

export default defineConfig({
  plugins: [react()],
  define: releaseDefines(),
})
