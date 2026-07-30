import { defineConfig, devices } from '@playwright/test';

const localChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/Games/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.PLAYWRIGHT_DISABLE_VIDEO === 'true' ? 'off' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: localChromium
          ? {
              executablePath: localChromium,
              args: ['--no-sandbox'],
            }
          : undefined,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4173/Games/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
