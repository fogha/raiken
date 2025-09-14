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
  
  // Get browser-specific configuration
  const browserConfig = getBrowserConfig(browserType);
  // Resolve absolute paths for config
  const testDirPath = path.resolve(process.cwd(), 'generated-tests');
  const outputDirPath = path.resolve(process.cwd(), 'test-results');
  
  const configContent = `const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: ${timeout},
  testDir: '${testDirPath}',
  
  // Reporter configuration
  reporter: [
    ['json', { outputFile: '${outputDirPath}/results.json' }],
    ['html', { open: 'never', outputFolder: '${outputDirPath}/html-report' }]
  ],
  
  // Global test configuration
  use: {
    // Screenshot configuration
    screenshot: ${features.screenshots ? "'only-on-failure'" : "'off'"},
    
    // Video configuration
    video: ${features.video ? "'retain-on-failure'" : "'off'"},
    
    // Trace configuration
    trace: ${features.tracing ? "'retain-on-failure'" : "'off'"},
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Browser launch options for better debugging
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--enable-logging',
        '--log-level=0'
      ]
    }
  },
  
  // Project configuration
  projects: [
    {
      name: '${browserType}',
      use: { 
        ${browserConfig.useConfig}
        viewport: { width: 1280, height: 720 }
      },
    },
  ],
  
  // Output configuration
  outputDir: '${outputDirPath}',
  
  // Execution configuration
  fullyParallel: false,
  forbidOnly: false,
  workers: 1,
  retries: 0, // Handled by test suite manager
  
  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
});`;
  
  // Validate configuration content
  if (!configContent || configContent.trim().length === 0) {
    throw new Error('Generated Playwright config is empty');
  }
  
  // Create temp directory
  const tempDir = path.join(process.cwd(), 'temp-configs');
  await fs.mkdir(tempDir, { recursive: true });
  
  // Generate unique config file path
  const configPath = path.join(tempDir, `playwright-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.config.js`);
  
  try {
    // Write config file
    await fs.writeFile(configPath, configContent);
    
    // Validate that file was written successfully
    const stats = await fs.stat(configPath);
    if (stats.size === 0) {
      throw new Error('Config file was written but is empty');
    }
    
    console.log(`[PlaywrightConfig] Created config: ${configPath}`);
    
    
    return configPath;
  } catch (error) {
    console.error('[PlaywrightConfig] Failed to create config:', error);
    throw new Error(`Failed to create Playwright config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up a config file
 */
export async function cleanupConfig(configPath: string): Promise<void> {
  try {
    await fs.unlink(configPath);
    console.log(`[PlaywrightConfig] Cleaned up config: ${configPath}`);
  } catch (error) {
    console.warn(`[PlaywrightConfig] Failed to cleanup config file: ${configPath}`, error);
  }
}

/**
 * Validate a Playwright config file by checking its syntax and structure
 */
export async function validateConfig(configPath: string): Promise<boolean> {
  try {
    // Read the config file content
    const configContent = await fs.readFile(configPath, 'utf8');
    
    // Basic syntax validation - check for common issues
    if (!configContent || configContent.trim().length === 0) {
      console.error(`[PlaywrightConfig] Config file is empty: ${configPath}`);
      return false;
    }
    
    // Check for required patterns in the config
    const requiredPatterns = [
      /module\.exports\s*=\s*defineConfig/,
      /testDir:/,
      /projects:/
    ];
    
    for (const pattern of requiredPatterns) {
      if (!pattern.test(configContent)) {
        console.error(`[PlaywrightConfig] Missing required pattern ${pattern} in: ${configPath}`);
        console.error(`[PlaywrightConfig] Config content for debugging:`);
        console.error(configContent);
        return false;
      }
    }
    
    // Check for syntax errors by attempting to parse as JavaScript
    try {
      const vm = require('vm');
      const script = new vm.Script(configContent, { filename: configPath });
    } catch (syntaxError) {
      console.error(`[PlaywrightConfig] Syntax error in config: ${configPath}`, syntaxError);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[PlaywrightConfig] Config validation failed for: ${configPath}`, error);
    return false;
  }
}

/**
 * Get browser-specific configuration
 */
function getBrowserConfig(browserType: string) {
  switch (browserType) {
    case 'firefox':
      return {
        useConfig: `...devices['Desktop Firefox'],`
      };
    case 'webkit':
      return {
        useConfig: `...devices['Desktop Safari'],`
      };
    case 'chromium':
    default:
      return {
        useConfig: `...devices['Desktop Chrome'],`
      };
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
