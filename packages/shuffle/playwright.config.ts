import { defineConfig, devices } from "@playwright/test";

const port = 5199;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  outputDir: "./test-results",
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "./playwright-report", open: "never" }]]
    : [["list"]],

  use: {
    baseURL,
    viewport: { width: 1280, height: 1024 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1024 } },
    },
  ],

  webServer: {
    command:
      "yarn workspace @pitter-patter/shuffle exec vite --config tests/harness/vite.config.ts",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
