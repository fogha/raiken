/**
 * Playwright Configuration Utilities
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Create a temporary Playwright config file
 */
export async function createPlaywrightConfig(
  features: { screenshots?: boolean; video?: boolean; tracing?: boolean },
  browserType: string = 'chromium',
  timeout: number = 30000
): Promise<string> {
  const configContent = `const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: ${timeout},
  testDir: './generated-tests',
  reporter: 'json',
  use: {
    screenshot: '${features.screenshots ? 'only-on-failure' : 'off'}',
    video: '${features.video ? 'retain-on-failure' : 'off'}',
    trace: '${features.tracing ? 'retain-on-failure' : 'off'}',
  },
  projects: [
    {
      name: '${browserType}',
      use: { ...devices['${getDeviceNameForBrowser(browserType)}'] },
    },
  ],
});`;
  
  const tempDir = path.join(process.cwd(), 'temp-configs');
  await fs.mkdir(tempDir, { recursive: true });
  
  const configPath = path.join(tempDir, `playwright-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.config.js`);
  await fs.writeFile(configPath, configContent);
  
  return configPath;
}

/**
 * Clean up a config file
 */
export async function cleanupConfig(configPath: string): Promise<void> {
  try {
    await fs.unlink(configPath);
  } catch (error) {
    console.warn(`Failed to cleanup config file: ${configPath}`, error);
  }
}

/**
 * Get browser-specific options
 */
function getBrowserOptions(browserType: string) {
  switch (browserType) {
    case 'firefox':
      return {};
    case 'webkit':
      return {};
    case 'chromium':
    default:
      return {}; // Use default Playwright chromium, not Chrome channel
  }
}

/**
 * Get device name for browser type
 */
function getDeviceNameForBrowser(browserType: string): string {
  switch (browserType) {
    case 'firefox':
      return 'Desktop Firefox';
    case 'webkit':
      return 'Desktop Safari';
    case 'chromium':
    default:
      return 'Desktop Chrome';
  }
}
