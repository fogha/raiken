const fs = require('fs');
const path = require('path');

/**
 * Creates a temporary Playwright configuration file with user settings
 * @param {Object} features - Configuration features (screenshots, video, tracing, network)
 * @param {string} browserType - Browser type (chromium, firefox, webkit)
 * @param {number} timeout - Test timeout in milliseconds
 * @returns {string} Path to the generated config file
 */
function createPlaywrightConfig(features, browserType, timeout) {
  const configContent = `
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'json',
  
  use: {
    baseURL: process.env.BASE_URL,
    
    // Recording options based on user configuration
    screenshot: ${features.screenshots ? "'on'" : "'off'"},
    video: ${features.video ? "'retain-on-failure'" : "'off'"},
    trace: ${features.tracing ? "'on-first-retry'" : "'off'"},
    
    // Timeout setting
    actionTimeout: ${timeout},
  },

  projects: [
    {
      name: '${browserType}',
      use: { ...devices['Desktop ${getBrowserDeviceName(browserType)}'] },
    },
  ],

  outputDir: 'test-results/',
});
`;

  const configPath = path.join(process.cwd(), 'playwright.config.temp.ts');
  fs.writeFileSync(configPath, configContent);
  return configPath;
}

/**
 * Get the proper device name for Playwright devices
 */
function getBrowserDeviceName(browserType) {
  switch (browserType) {
    case 'chromium':
      return 'Chrome';
    case 'firefox':
      return 'Firefox';
    case 'webkit':
      return 'Safari';
    default:
      return 'Chrome';
  }
}

/**
 * Cleanup temporary config file
 */
function cleanupConfig(configPath) {
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

module.exports = {
  createPlaywrightConfig,
  cleanupConfig
}; 