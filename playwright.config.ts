import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', timeout: 60000, fullyParallel: false, workers: 1,
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120000
  },
  use: { baseURL: process.env.KODIK_TEST_URL || 'http://127.0.0.1:5173', channel: 'msedge', actionTimeout: 10000, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: [['list']], outputDir: 'test-results'
})
