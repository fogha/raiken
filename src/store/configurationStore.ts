import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TestConfig, defaultConfig } from '@/types/config';

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
      
      reset: () => set({ config: defaultConfig })
    }),
    {
      name: 'raiken-configuration',
      skipHydration: true,
    }
  )
); 