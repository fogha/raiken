export interface TestConfig {
  execution: {
    mode: 'browser' | 'service';
    endpoint?: string;
    saveTests: boolean;
    realTimeResults: boolean;
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
      video: false,
      tracing: false,
    },
    timeout: 30000,
    retries: 1,
  },
  storage: {
    location: 'local',
    path: './tests',
    format: 'typescript',
  },
}; 