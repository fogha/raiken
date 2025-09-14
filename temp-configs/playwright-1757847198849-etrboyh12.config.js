const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 30000,
  testDir: '/Users/Armand/Documents/Code/raiken/generated-tests',
  
  // Reporter configuration
  reporter: [
    ['json', { outputFile: '/Users/Armand/Documents/Code/raiken/test-results/results.json' }],
    ['html', { open: 'never', outputFolder: '/Users/Armand/Documents/Code/raiken/test-results/html-report' }]
  ],
  
  // Global test configuration
  use: {
    // Screenshot configuration
    screenshot: 'only-on-failure',
    
    // Video configuration
    video: 'retain-on-failure',
    
    // Trace configuration
    trace: 'retain-on-failure',
    
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
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
  ],
  
  // Output configuration
  outputDir: '/Users/Armand/Documents/Code/raiken/test-results',
  
  // Execution configuration
  fullyParallel: false,
  forbidOnly: false,
  workers: 1,
  retries: 0, // Handled by test suite manager
  
  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
});