import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { releaseDefines } from './scripts/release.mjs'

// Android uses public configuration only; never load .env.local into this build.
export default defineConfig({
  plugins: [react(), { name:'android-contained-viewport', transformIndexHtml:html=>html.replace('viewport-fit=cover','viewport-fit=contain') }],
  envDir: false,
  define: {
    ...releaseDefines(),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://kodiknew.vercel.app/api'),
    'import.meta.env.VITE_AI_TUTOR_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_AI_EXPLANATIONS_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_AI_EXAMPLES_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_ANALYTICS_ENABLED': JSON.stringify('true'),
  },
})
