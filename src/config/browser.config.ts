/**
 * Browser Configuration
 */

export interface BrowserConfig {
  default: {
    browserType: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
    deviceScaleFactor: number;
    isMobile: boolean;
  };
  timeout: {
    navigation: number;
    action: number;
    assertion: number;
  };
  retry: {
    attempts: number;
    delay: number;
  };
  screenshot: {
    mode: 'off' | 'only-on-failure' | 'on';
    quality: number;
    fullPage: boolean;
  };
  video: {
    mode: 'off' | 'on' | 'retain-on-failure';
    size: {
      width: number;
      height: number;
    };
  };
  trace: {
    mode: 'off' | 'on' | 'retain-on-failure';
    screenshots: boolean;
    snapshots: boolean;
  };
}

export const browserConfig: BrowserConfig = {
  default: {
    browserType: 'chromium',
    headless: true,
    viewport: {
      width: 1920,
      height: 1080,
    },
    deviceScaleFactor: 1,
    isMobile: false,
  },
  
  timeout: {
    navigation: 30000,
    action: 10000,
    assertion: 5000,
  },
  
  retry: {
    attempts: 2,
    delay: 1000,
  },
  
  screenshot: {
    mode: 'only-on-failure',
    quality: 90,
    fullPage: false,
  },
  
  video: {
    mode: 'retain-on-failure',
    size: {
      width: 1280,
      height: 720,
    },
  },
  
  trace: {
    mode: 'retain-on-failure',
    screenshots: true,
    snapshots: true,
  },
};

/**
 * Get browser configuration
 */
export function getBrowserConfig(): BrowserConfig {
  // Could be extended to merge with user preferences
  return browserConfig;
}

/**
 * Get playwright launch options
 */
export function getPlaywrightOptions(overrides?: Partial<BrowserConfig['default']>) {
  const config = getBrowserConfig();
  
  return {
    ...config.default,
    ...overrides,
  };
}

/**
 * Get test configuration for playwright.config.ts
 */
export function getTestConfig() {
  const config = getBrowserConfig();
  
  return {
    timeout: config.timeout.action,
    expect: {
      timeout: config.timeout.assertion,
    },
    use: {
      ...config.default,
      actionTimeout: config.timeout.action,
      navigationTimeout: config.timeout.navigation,
      screenshot: config.screenshot.mode,
      video: config.video.mode,
      trace: config.trace.mode,
    },
    retries: config.retry.attempts,
  };
}
