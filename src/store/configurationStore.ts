import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TestConfig {
  execution: {
    mode: 'browser' | 'service';
    endpoint?: string;
    saveTests: boolean;
    realTimeResults: boolean;
    browserType: 'chromium' | 'firefox' | 'webkit';
    retries: number;
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

interface ConfigurationState {
  config: TestConfig;
  activeTab: 'execution' | 'recording' | 'playwright' | 'ai' | 'storage';
  setActiveTab: (tab: 'execution' | 'recording' | 'playwright' | 'ai' | 'storage') => void;
  updateExecutionConfig: (updates: Partial<TestConfig['execution']>) => void;
  updateRecordingConfig: (updates: Partial<TestConfig['recording']>) => void;
  updatePlaywrightConfig: (updates: Partial<TestConfig['playwright']>) => void;
  updateApiConfig: (updates: Partial<TestConfig['api']>) => void;
  updateStorageConfig: (updates: Partial<TestConfig['storage']>) => void;
  reset: () => void;
}

const defaultConfig: TestConfig = {
  execution: {
    mode: 'browser',
    saveTests: true,
    realTimeResults: true,
    browserType: 'chromium',
    retries: 0,
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

export const useConfigurationStore = create<ConfigurationState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      activeTab: 'execution',
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      updateExecutionConfig: (updates) => set((state) => ({
        config: {
          ...state.config,
          execution: {
            ...state.config.execution,
            ...updates
          }
        }
      })),
      
      updateRecordingConfig: (updates) => set((state) => ({
        config: {
          ...state.config,
          recording: {
            ...state.config.recording,
            ...updates
          }
        }
      })),
      
      updatePlaywrightConfig: (updates) => set((state) => ({
        config: {
          ...state.config,
          playwright: {
            ...state.config.playwright,
            ...updates
          }
        }
      })),
      
      updateApiConfig: (updates) => set((state) => ({
        config: {
          ...state.config,
          api: {
            ...state.config.api,
            ...updates
          }
        }
      })),
      
      updateStorageConfig: (updates) => set((state) => ({
        config: {
          ...state.config,
          storage: {
            ...state.config.storage,
            ...updates
          }
        }
      })),
      
      reset: () => set({ config: defaultConfig, activeTab: 'execution' })
    }),
    {
      name: 'configuration-storage'
    }
  )
); 