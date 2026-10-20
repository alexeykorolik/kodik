import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["b2b.e2e.ts", "pilot.e2e.ts","curriculum.e2e.ts","task-quality.e2e.ts","modes.e2e.ts","pilot-operations.e2e.ts","journal-refresh.e2e.ts","block-keyboard.e2e.ts","owner-conflicts.e2e.ts","desktop-layout.e2e.ts","modes-late-answer.e2e.ts","help-classroom.e2e.ts","recommendation-lifecycle.e2e.ts","group-archive.e2e.ts"],
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4186",
    channel: "msedge",
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 10000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/helpers/browser-server.mjs",
    url: "http://127.0.0.1:4186/api/health",
    reuseExistingServer: false,
    env: { PORT: "4186", KODIK_DB: "work/browser-test.sqlite" },
    timeout: 30000,
  },
  outputDir: "test-results/b2b",
  reporter: "list",
});
