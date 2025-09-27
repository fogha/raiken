import { DOMNode } from '@/types/dom';
import { TestTab, TestScriptConfig } from '@/types/test';
import { ViewportState } from '@/types/browser';
import { BrowserState } from './browserStore';

// DOM state types
export interface DOMState {
  domTree: DOMNode | null;
  selectedNode: DOMNode | null;
}

// Test result structure
export interface TestResult {
  success: boolean;
  message: string;
  durationMs?: number;
  timestamp: string;
}

// Testing state types
export interface TestingState {
  tabs: TestTab[];
  activeTabId: string | null;
  jsonTestScript: string;
  testScripts: string[];
  generatedTests: string[];
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
  setUrl: (url: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsLaunched: (isLaunched: boolean) => void;
  setViewport: (viewport: ViewportState) => void;
  setScale: (scale: number) => void;
  setIsMobile: (isMobile: boolean) => void;
  
  // DOM actions
  setDOMTree: (domTree: DOMNode | null) => void;
  setSelectedNode: (node: DOMNode | null) => void;
  
  // Testing actions
  setTabs: (tabs: TestTab[]) => void;
  setActiveTabId: (activeTabId: string | null) => void;
  addTab: (tab: TestTab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<TestTab>) => void;
  setJsonTestScript: (jsonTestScript: string) => void;
  addTestScript: (script: string) => void;
  addGeneratedTest: (script: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setShowResults: (showResults: boolean) => void;
  setGenerationError: (generationError: string | null) => void;
  setResults: (results: any[]) => void;
  
  // Settings actions
  setGlobalConfig: (globalConfig: TestScriptConfig) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
