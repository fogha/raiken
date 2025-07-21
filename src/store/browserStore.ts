import { createSlice } from './createSlice';
import { StatusType } from '@/types/status';
export type { StatusType };

export type SystemAction = 
  // Browser actions
  | 'BROWSER_INITIALIZING'
  | 'BROWSER_READY'
  | 'BROWSER_CLOSED'
  | 'BROWSER_ERROR'
  | 'BROWSER_CLOSING'
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
  // Screenshot actions
  | 'TAKING_SCREENSHOT'
  | 'SCREENSHOT_TAKEN'
  | 'SCREENSHOT_ERROR'
  // View actions
  | 'REFRESHING_VIEW'
  | 'VIEW_REFRESHED'
  | 'REFRESH_ERROR'
  // Test actions
  | 'GENERATING_TEST'
  | 'TEST_GENERATED'
  | 'RUNNING_TEST'
  | 'TEST_ERROR'
  | 'TEST_PASSED'
  | 'TEST_FAILED'
  | 'IDLE';

interface SystemStatus {
  action: SystemAction;
  message: string;
  type: StatusType;
  timestamp: number;
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
  error?: string;
}

interface BrowserState {
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
  
  // Status and messaging
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
  
  // Editor actions
  addEditorTab: (tab: TestTab) => void;
  updateEditorTab: (id: string, updates: Partial<TestTab>) => void;
  removeEditorTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const initialState = {
  url: '',
  isLoading: false,
  isLaunched: false,
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

export const useBrowserStore = createSlice<BrowserState>('browser', (set, get) => ({
  // Initial state
  url: null,
  isLoading: false,
  isLaunched: false,
  screenshot: null,
  pageInfo: null,
  
  // Viewport state
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  isMobile: false,
  
  // Status
  status: {
    action: 'IDLE' as SystemAction,
    message: 'Ready',
    type: 'idle' as StatusType
  },
  
  // Editor state
  editorTabs: [],
  activeTabId: null,

  // Actions
  setUrl: (url) => set({ url }),
  setLoading: (isLoading) => set({ isLoading }),
  setLaunched: (isLaunched) => set({ isLaunched }),
  setScreenshot: (screenshot) => set({ screenshot }),
  setPageInfo: (pageInfo) => set({ pageInfo }),
  setViewport: (width, height) => set({ viewport: { width, height } }),
  setDeviceScaleFactor: (deviceScaleFactor) => set({ deviceScaleFactor }),
  setMobile: (isMobile) => set({ isMobile }),
  setStatus: (action, message, type = 'info') => set({ 
    status: { action, message, type } 
  }),

  // Editor actions
  addEditorTab: (tab) => set((state) => ({ 
    editorTabs: [...state.editorTabs, tab],
    activeTabId: tab.id
  })),
  updateEditorTab: (id, updates) => set((state) => ({
    editorTabs: state.editorTabs.map(tab => 
      tab.id === id ? { ...tab, ...updates } : tab
    )
  })),
  removeEditorTab: (id) => set((state) => ({
    editorTabs: state.editorTabs.filter(tab => tab.id !== id),
    activeTabId: state.activeTabId === id ? 
      (state.editorTabs.length > 1 ? state.editorTabs[0].id : null) : 
      state.activeTabId
  })),
  setActiveTab: (id) => set({ activeTabId: id })
})); 