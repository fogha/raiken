import { createSlice } from './createSlice';

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

export interface BrowserState {
  // Browser state
  url: string | null;
  isLoading: boolean;
  isLaunched: boolean;
  
  // Editor state
  editorTabs: TestTab[];
  activeTabId: string | null;
  
  // Actions
  setUrl: (url: string | null) => void;
  setLoading: (loading: boolean) => void;
  setLaunched: (launched: boolean) => void;
  
  // Editor actions
  addEditorTab: (tab: TestTab) => void;
  updateEditorTab: (id: string, updates: Partial<TestTab>) => void;
  removeEditorTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const useBrowserStore = createSlice<BrowserState>('browser', (set, get) => ({
  // Initial state
  url: null,
  isLoading: false,
  isLaunched: false,
  editorTabs: [],
  activeTabId: null,
  
  // Actions
  setUrl: (url) => set({ url }),
  setLoading: (isLoading) => set({ isLoading }),
  setLaunched: (isLaunched) => set({ isLaunched }),
  
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
  
  removeEditorTab: (id) => set((state) => {
    const newTabs = state.editorTabs.filter(tab => tab.id !== id);
    const newActiveId = state.activeTabId === id 
      ? (newTabs.length > 0 ? newTabs[0].id : null)
      : state.activeTabId;
    
    return {
      editorTabs: newTabs,
      activeTabId: newActiveId
    };
  }),
  
  setActiveTab: (id) => set({ activeTabId: id })
}));