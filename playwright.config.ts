import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL as 'chrome' | 'msedge' | undefined,
  },
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 1,
        defaultBrowserType: 'chromium',
      },
    },
  ],
});
