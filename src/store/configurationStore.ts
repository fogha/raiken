import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TestConfig, defaultConfig } from '@/types/config';

interface ConfigurationState {
  config: TestConfig;
  activeTab: 'execution' | 'recording' | 'playwright' | 'ai' | 'storage';
  
  // Actions
  setConfig: (config: Partial<TestConfig>) => void;
  setActiveTab: (tab: ConfigurationState['activeTab']) => void;
  
  // Specific section updates for better performance
  updateExecutionConfig: (updates: Partial<TestConfig['execution']>) => void;
  updateRecordingConfig: (updates: Partial<TestConfig['recording']>) => void;
  updatePlaywrightConfig: (updates: Partial<TestConfig['playwright']>) => void;
  updateApiConfig: (updates: Partial<TestConfig['api']>) => void;
  updateStorageConfig: (updates: Partial<TestConfig['storage']>) => void;
  
  // Reset functionality
  resetConfig: () => void;
  resetSection: (section: keyof TestConfig) => void;
}

export const useConfigurationStore = create<ConfigurationState>()(
  devtools(
    (set) => ({
      config: defaultConfig,
      activeTab: 'execution',

      setConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates }
        }), false, 'configuration/setConfig'),

      setActiveTab: (tab) =>
        set({ activeTab: tab }, false, 'configuration/setActiveTab'),

      updateExecutionConfig: (updates) =>
        set((state) => ({
          config: {
            ...state.config,
            execution: { ...state.config.execution, ...updates }
          }
        }), false, 'configuration/updateExecutionConfig'),

      updateRecordingConfig: (updates) =>
        set((state) => ({
          config: {
            ...state.config,
            recording: { ...state.config.recording, ...updates }
          }
        }), false, 'configuration/updateRecordingConfig'),

      updatePlaywrightConfig: (updates) =>
        set((state) => ({
          config: {
            ...state.config,
            playwright: { ...state.config.playwright, ...updates }
          }
        }), false, 'configuration/updatePlaywrightConfig'),

      updateApiConfig: (updates) =>
        set((state) => ({
          config: {
            ...state.config,
            api: { ...state.config.api, ...updates }
          }
        }), false, 'configuration/updateApiConfig'),

      updateStorageConfig: (updates) =>
        set((state) => ({
          config: {
            ...state.config,
            storage: { ...state.config.storage, ...updates }
          }
        }), false, 'configuration/updateStorageConfig'),

      resetConfig: () =>
        set({ config: defaultConfig }, false, 'configuration/resetConfig'),

      resetSection: (section) =>
        set((state) => ({
          config: {
            ...state.config,
            [section]: defaultConfig[section]
          }
        }), false, 'configuration/resetSection'),
    }),
    {
      name: 'configuration-store',
      // Only serialize the config object when persisting
      serialize: {
        options: {
          map: new Map([
            ['config', true],
            ['activeTab', false]
          ])
        }
      }
    }
  )
); 