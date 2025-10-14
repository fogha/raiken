import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TestConfig, defaultConfig } from '@/types/config';

type ConfigTab = 'execution' | 'recording' | 'ai' | 'storage';

interface ConfigurationState {
  config: TestConfig;
  activeTab: ConfigTab;
  setActiveTab: (tab: ConfigTab) => void;
  updateExecutionConfig: (updates: Partial<TestConfig['execution']>) => void;
  updateRecordingConfig: (updates: Partial<TestConfig['recording']>) => void;
  updateApiConfig: (updates: Partial<TestConfig['api']>) => void;
  updateStorageConfig: (updates: Partial<TestConfig['storage']>) => void;
  updateConfig: <K extends keyof TestConfig>(
    section: K, 
    updates: Partial<TestConfig[K]>
  ) => void;
  reset: () => void;
}

const createConfigUpdater = <K extends keyof TestConfig>(section: K) => 
  (updates: Partial<TestConfig[K]>) => (state: ConfigurationState) => ({
    config: {
      ...state.config,
      [section]: {
        ...state.config[section],
        ...updates
      }
    }
  });

export const useConfigurationStore = create<ConfigurationState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      activeTab: 'execution',
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      updateExecutionConfig: (updates) => set(createConfigUpdater('execution')(updates)),
      updateRecordingConfig: (updates) => set(createConfigUpdater('recording')(updates)),
      updateApiConfig: (updates) => set(createConfigUpdater('api')(updates)),
      updateStorageConfig: (updates) => set(createConfigUpdater('storage')(updates)),
      
      updateConfig: (section, updates) => set(createConfigUpdater(section)(updates)),
      
      reset: () => set({ config: defaultConfig, activeTab: 'execution' })
    }),
    {
      name: 'raiken-configuration',
      skipHydration: true,
    }
  )
);