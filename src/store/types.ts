import { type DOMNode } from '@/types/dom';

// Browser state types
export interface BrowserState {
  url: string | null;
  isLoading: boolean;
  isBrowserLaunched: boolean;
  error: string | null;
}

// DOM state types
export interface DOMState {
  domTree: DOMNode | null;
  selectedNode: DOMNode | null;
}

// Test script tab configuration
export interface TestScriptConfig {
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
}

// Test result structure
export interface TestResult {
  success: boolean;
  message: string;
  durationMs?: number;
  timestamp: string;
}

// Test script tab data structure
export interface TestTab {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'json';
  config: TestScriptConfig;
  isRunning?: boolean;
  results?: TestResult[];
  error?: string;
}

// Testing state types
export interface TestingState {
  tabs: TestTab[];
  activeTabId: string | null;
  jsonTestScript: string;
  testScript: string;
  isGenerating: boolean;
  isRunning: boolean;
  showResults: boolean;
  generationError: string | null;
  results: any[];
}

// Settings state types
export interface SettingsState {
  globalConfig: TestScriptConfig;
  theme: 'light' | 'dark' | 'system';
}

// Combined application state
export interface AppState {
  // State slices
  browser: BrowserState;
  dom: DOMState;
  testing: TestingState;
  settings: SettingsState;
  
  // Internal flag to prevent circular updates
  _updatesEnabled: boolean;
  
  // Helper method to batch updates safely
  batchUpdates: (updates: () => void) => void;
  
  // Browser actions
  setUrl: (url: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsBrowserLaunched: (isBrowserLaunched: boolean) => void;
  setBrowserError: (error: string | null) => void;
  resetBrowser: () => void;
  
  // DOM actions
  setDOMTree: (domTree: DOMNode | null) => void;
  setSelectedNode: (selectedNode: DOMNode | null) => void;
  
  // Testing actions
  setTabs: (tabs: TestTab[]) => void;
  setActiveTabId: (activeTabId: string | null) => void;
  addTab: (tab: TestTab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, tabData: Partial<TestTab>) => void;
  setJsonTestScript: (jsonTestScript: string) => void;
  setTestScript: (testScript: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setShowResults: (showResults: boolean) => void;
  setGenerationError: (generationError: string | null) => void;
  setResults: (results: any[]) => void;
  
  // Settings actions
  setGlobalConfig: (globalConfig: TestScriptConfig) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
