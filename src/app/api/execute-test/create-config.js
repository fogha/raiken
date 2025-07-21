const fs = require('fs/promises');
const path = require('path');

/**
 * Creates a temporary Playwright configuration file with user settings
 * @param {Object} features - Configuration features (screenshots, video, tracing, network)
 * @param {string} browserType - Browser type (chromium, firefox, webkit)
 * @param {number} timeout - Test timeout in milliseconds
 * @returns {string} Path to the generated config file
 */
async function createPlaywrightConfig(features, browserType, timeout) {
  console.log(`[Config] Creating ${browserType} config with video: ${features.video}, screenshots: ${features.screenshots}`);

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
    // Recording options based on user configuration
    screenshot: ${features.screenshots ? "'on'" : "'off'"},
    video: ${features.video ? "'on'" : "'off'"},
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

  outputDir: 'test-results/temp-execution/',
});
`;

  const configPath = path.join(process.cwd(), 'playwright.config.temp.ts');
  await fs.writeFile(configPath, configContent);
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
async function cleanupConfig(configPath) {
  try {
    await fs.unlink(configPath);
  } catch (_) {
    /* ignore */
  }
}

module.exports = {
  createPlaywrightConfig,
  cleanupConfig
}; 