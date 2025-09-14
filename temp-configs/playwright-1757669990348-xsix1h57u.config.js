const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 30000,
  testDir: './generated-tests',
  reporter: 'json',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});