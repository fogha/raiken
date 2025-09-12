/**
 * Zustand Store Types
 */

import { SystemAction, StatusType } from './status';
import { DOMNode } from './dom';
import { TestTab, TestFile, TestExecutionResult } from './test';
import { BrowserConfig } from './config';

// Browser Store Types
export interface BrowserState {
  // Browser state
  url: string | null;
  isLoading: boolean;
  isLaunched: boolean;
  
  // Visual state
  screenshot: string | null;
  pageInfo: {
    url: string;
    title: string;
    viewport: { width: number; height: number } | null;
  } | null;
  
  // Viewport state
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  
  // Status
  status: {
    action: SystemAction;
    message: string;
    type: StatusType;
  };
  
  // Editor state
  editorTabs: TestTab[];
  activeTabId: string | null;
  
  // Actions
  setUrl: (url: string | null) => void;
  setLoading: (loading: boolean) => void;
  setLaunched: (launched: boolean) => void;
  setScreenshot: (screenshot: string | null) => void;
  setPageInfo: (pageInfo: BrowserState['pageInfo']) => void;
  setViewport: (width: number, height: number) => void;
  setDeviceScaleFactor: (scale: number) => void;
  setMobile: (isMobile: boolean) => void;
  setStatus: (action: SystemAction, message: string, type?: StatusType) => void;
  clearStatus: () => void;
  
  // Editor actions
  addEditorTab: (tab: TestTab) => void;
  updateEditorTab: (id: string, updates: Partial<TestTab>) => void;
  removeEditorTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

// Project Store Types
export interface ProjectState {
  url: string;
  domTree: DOMNode | null;
  selectedNode: DOMNode | null;
  loadError: string | null;
  
  // Actions
  setUrl: (url: string) => void;
  setDomTree: (domTree: DOMNode | null) => void;
  setSelectedNode: (node: DOMNode | null) => void;
  setLoadError: (error: string | null) => void;
}

// Test Store Types
export interface TestState {
  // Test generation
  isGenerating: boolean;
  generatedTests: string[];
  generationError: string | null;
  testResults: Map<string, TestExecutionResult>;
  
  // Test management
  testFiles: TestFile[];
  currentTest: string | null;
  
  // Actions
  setIsGenerating: (isGenerating: boolean) => void;
  addGeneratedTest: (test: string) => void;
  setGenerationError: (error: string | null) => void;
  setTestResults: (tabId: string, result: TestExecutionResult) => void;
  setTestFiles: (files: TestFile[]) => void;
  setCurrentTest: (test: string | null) => void;
  
  // Async actions
  generateTest: (prompt: string) => Promise<void>;
  executeTest: (test: string, suiteId?: string) => Promise<TestExecutionResult>;
  saveTest: () => Promise<void>;
  deleteTest: (testPath: string) => Promise<void>;
  loadTestFiles: () => Promise<void>;
}

// Configuration Store Types
export interface ConfigurationState {
  config: BrowserConfig;
  
  // Actions
  updateConfig: (updates: Partial<BrowserConfig>) => void;
  reset: () => void;
}

// Notification Store Types
export interface NotificationState {
  notifications: Notification[];
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}
