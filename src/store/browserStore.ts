import { create } from 'zustand';
import type { DOMNode } from '@/types/dom';

export type StatusType = 'idle' | 'loading' | 'success' | 'error';

export type SystemAction = 
  // Browser actions
  | 'BROWSER_INITIALIZING'
  | 'BROWSER_READY'
  | 'BROWSER_CLOSED'
  | 'BROWSER_ERROR'
  // Navigation actions
  | 'NAVIGATING'
  | 'NAVIGATION_COMPLETE'
  | 'NAVIGATION_ERROR'
  | 'NAVIGATION_SUCCESS'
  // DOM actions
  | 'DOM_EXTRACTING'
  | 'DOM_READY'
  | 'DOM_ERROR'
  | 'DOM_UPDATED'
  | 'EXTRACTING_DOM'
  | 'ELEMENT_SELECTED'
  | 'ELEMENT_HIGHLIGHTED'
  // Test actions
  | 'GENERATING_TEST'
  | 'TEST_GENERATED'
  | 'RUNNING_TEST'
  | 'TEST_SUCCESS'
  | 'TEST_ERROR'
  | 'TEST_FAILED'
  | 'TEST_PASSED'
  | 'IDLE';

interface SystemStatus {
  action: SystemAction;
  message: string;
  type: StatusType;
  timestamp: number;
}

export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

interface TestTab {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'json';
  config: {
    headless: boolean;
    browserType: 'chromium' | 'firefox' | 'webkit';
  };
  isRunning?: boolean;
  results?: TestResult[];
  error?: string;
}

interface BrowserState {
  // Browser state
  url: string;
  isLoading: boolean;
  isLaunched: boolean;
  
  // Test execution state
  isTestRunning: boolean;
  testResult: TestResult[];
  
  // Editor state
  editorTabs: TestTab[];
  activeTabId: string | null;
  
  // Browser settings
  viewport: {
    width: number;
    height: number;
  };
  deviceScaleFactor: number;
  isMobile: boolean;

  // System status
  status: SystemStatus;
  
  // Actions
  setUrl: (url: string) => void;
  setLoading: (isLoading: boolean) => void;
  setLaunched: (isLaunched: boolean) => void;
  setTestRunning: (isRunning: boolean) => void;
  setTestResult: (result: TestResult[]) => void;
  setViewport: (width: number, height: number) => void;
  setDeviceScaleFactor: (scale: number) => void;
  setMobile: (isMobile: boolean) => void;
  setStatus: (action: SystemAction, message: string, type?: StatusType) => void;
  
  // Editor actions
  setEditorTabs: (tabs: TestTab[]) => void;
  setActiveTabId: (id: string | null) => void;
  addEditorTab: (tab: TestTab) => void;
  updateEditorTab: (id: string, updates: Partial<TestTab>) => void;
  removeEditorTab: (id: string) => void;
  
  reset: () => void;
}

const initialState = {
  url: '',
  isLoading: false,
  isLaunched: false,
  isTestRunning: false,
  testResult: [],
  editorTabs: [],
  activeTabId: null,
  viewport: {
    width: 1280,
    height: 720
  },
  deviceScaleFactor: 1,
  isMobile: false,
  status: {
    action: 'BROWSER_CLOSED' as SystemAction,
    message: 'Browser is closed',
    type: 'idle' as StatusType,
    timestamp: Date.now()
  }
};

export const useBrowserStore = create<BrowserState>((set, get) => ({
  ...initialState,

  setUrl: (url) => set({ url }),
  setLoading: (isLoading) => set({ isLoading }),
  setLaunched: (isLaunched) => set({ isLaunched }),
  setTestRunning: (isRunning) => set({ isTestRunning: isRunning }),
  setTestResult: (result) => set({ testResult: result }),
  setViewport: (width, height) => set((state) => ({
    viewport: { ...state.viewport, width, height }
  })),
  setDeviceScaleFactor: (scale) => set({ deviceScaleFactor: scale }),
  setMobile: (isMobile) => set({ isMobile }),
  setStatus: (action, message, type = 'loading') => set({
    status: {
      action,
      message,
      type,
      timestamp: Date.now()
    }
  }),

  // Editor actions
  setEditorTabs: (tabs) => set({ editorTabs: tabs }),
  setActiveTabId: (id) => set({ activeTabId: id }),
  addEditorTab: (tab) => set((state) => ({ 
    editorTabs: [...state.editorTabs, tab],
    activeTabId: tab.id
  })),
  updateEditorTab: (id, updates) => set((state) => ({
    editorTabs: state.editorTabs.map(tab => 
      tab.id === id ? { ...tab, ...updates } : tab
    )
  })),
  removeEditorTab: (id) => set((state) => {
    const newTabs = state.editorTabs.filter(tab => tab.id !== id);
    return {
      editorTabs: newTabs,
      activeTabId: state.activeTabId === id ? (newTabs[0]?.id || null) : state.activeTabId
    };
  }),
  
  reset: () => set(initialState)
})); 