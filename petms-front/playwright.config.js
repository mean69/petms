import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 35000 },
  use: {
    baseURL: "http://localhost:5184",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [
    {
      command: "node scripts/e2e-api.mjs",
      url: "http://localhost:8011/up",
      reuseExistingServer: false,
      timeout: 90000,
    },
    {
      command: "node scripts/e2e-web.mjs",
      url: "http://localhost:5184",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
});
