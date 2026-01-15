import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for visual regression testing of PDF export.
 *
 * Run with: npx playwright test
 * Update snapshots: npx playwright test --update-snapshots
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",

  use: {
    // Base URL for the app (local dev server)
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Snapshot settings for visual comparison
  expect: {
    toHaveScreenshot: {
      // Allow up to 0.5% pixel difference (for font rendering variations)
      maxDiffPixelRatio: 0.005,
      // Compare only meaningful differences
      threshold: 0.1,
    },
  },
});
