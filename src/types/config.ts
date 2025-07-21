export interface TestConfig {
  execution: {
    mode: 'browser' | 'service';
    endpoint?: string;
    saveTests: boolean;
    realTimeResults: boolean;
    browserType: 'chromium' | 'firefox' | 'webkit';
    retries: number;
    headless: boolean;
  };
  recording: {
    enabled: boolean;
    autoSelectors: boolean;
    smartAssertions: boolean;
  };
  playwright: {
    features: {
      network: boolean;
      screenshots: boolean;
      video: boolean;
      tracing: boolean;
    };
    timeout: number;
    retries: number;
  };
  api: {
    apiKey?: string;
    model?: string;
  };
  storage: {
    location: 'local' | 'remote';
    path: string;
    format: 'json' | 'typescript';
  };
}

export const defaultConfig: TestConfig = {
  execution: {
    mode: 'browser',
    saveTests: true,
    realTimeResults: true,
    browserType: 'chromium',
    retries: 0,
    headless: false  // Changed to false so tests are visible by default
  },
  recording: {
    enabled: true,
    autoSelectors: true,
    smartAssertions: true,
  },
  playwright: {
    features: {
      network: true,
      screenshots: true,
      video: true,
      tracing: false,
    },
    timeout: 30000,
    retries: 1,
  },
  api: {
    apiKey: undefined,
    model: 'anthropic/claude-3-sonnet',
  },
  storage: {
    location: 'local',
    path: './tests',
    format: 'typescript',
  },
}; 