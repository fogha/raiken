import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { type TestTab } from '@/types/test';
import { type AppState, type DOMState, type TestingState, type SettingsState } from './types';
import { type BrowserState, type ViewportState } from '@/types/browser';
import { type StatusLevel } from '@/types/status';

// Initial states
const initialBrowserState: BrowserState = {
  url: null,
  isLoading: false,
  isLaunched: false,
  viewport: {
    width: 1024,
    height: 768,
    scale: 1,
    isMobile: false
  },
  error: null,
  status: null
};

const initialDOMState: DOMState = {
  domTree: null,
  selectedNode: null
};

const initialTestingState: TestingState = {
  tabs: [],
  activeTabId: null,
  jsonTestScript: '',
  testScripts: [],
  generatedTests: [],
  isGenerating: false,
  isRunning: false,
  showResults: false,
  generationError: null,
  results: []
};

const initialSettingsState: SettingsState = {
  globalConfig: {
    headless: true,
    browserType: 'chromium'
  },
  theme: 'system'
};

// Create the store with a fix to prevent infinite update loops
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        browser: initialBrowserState,
        dom: initialDOMState,
        testing: initialTestingState,
        settings: initialSettingsState,
        
        // Flag to prevent circular updates
        _updatesEnabled: true,
        
        // Helper to batch updates and prevent loops
        batchUpdates: (updates: () => void) => {
          // Skip if updates are already in progress
          if (!get()._updatesEnabled) return;
          
          try {
            // Disable nested updates temporarily
            set({ _updatesEnabled: false });
            // Perform all updates in a single batch
            updates();
          } finally {
            // Re-enable updates when done
            setTimeout(() => {
              set({ _updatesEnabled: true });
            }, 0);
          }
        },
        
        // Browser actions - wrapped to prevent infinite updates
        setUrl: (url: string | null) => {
          const state = get();
          if (!state._updatesEnabled) return;
          if (state.browser.url === url) return;
          
          set(state => ({
            browser: { ...state.browser, url }
          }));
        },
        setIsLoading: (isLoading: boolean) => {
          const state = get();
          if (!state._updatesEnabled) return;
          if (state.browser.isLoading === isLoading) return;
          
          set(state => ({
            browser: { ...state.browser, isLoading }
          }));
        },
        setIsLaunched: (isLaunched: boolean) => {
          const state = get();
          if (!state._updatesEnabled) return;
          set(state => ({
            browser: { ...state.browser, isLaunched }
          }));
        },
        setViewport: (viewport: ViewportState) => {
          const state = get();
          if (!state._updatesEnabled) return;
          set(state => ({
            browser: { ...state.browser, viewport }
          }));
        },
        setScale: (scale: number) => {
          const state = get();
          if (!state._updatesEnabled) return;
          set(state => ({
            browser: { ...state.browser, viewport: { ...state.browser.viewport, scale } }
          }));
        },
        setIsMobile: (isMobile: boolean) => {
          const state = get();
          if (!state._updatesEnabled) return;
          set(state => ({
            browser: { ...state.browser, viewport: { ...state.browser.viewport, isMobile } }
          }));
        },
        setStatus: (type: string, message: string, level: StatusLevel) => {
          const state = get();
          if (!state._updatesEnabled) return;
          set(state => ({
            browser: { ...state.browser, status: { type, message, level, timestamp: Date.now() } }
          }));
        },
        setBrowserError: (error: string | null) => {
          const state = get();
          if (!state._updatesEnabled) return;
          if (state.browser.error === error) return; // Skip if unchanged
          
          set(state => ({
            browser: { ...state.browser, error }
          }));
        },
        resetBrowser: () => set(state => ({
          browser: initialBrowserState
        })),
        
        // DOM actions
        setDOMTree: (domTree: any) => set(state => ({
          dom: { ...state.dom, domTree }
        })),
        setSelectedNode: (selectedNode: any) => set(state => ({
          dom: { ...state.dom, selectedNode }
        })),
        
        // Testing actions
        setTabs: (tabs: TestTab[]) => set(state => ({
          testing: { ...state.testing, tabs }
        })),
        setActiveTabId: (activeTabId: string | null) => set(state => ({
          testing: { ...state.testing, activeTabId }
        })),
        addTab: (tab: TestTab) => set(state => ({
          testing: { 
            ...state.testing, 
            tabs: [...state.testing.tabs, tab],
            activeTabId: tab.id
          }
        })),
        removeTab: (tabId: string) => {
          const { testing } = get();
          const newTabs = testing.tabs.filter(tab => tab.id !== tabId);
          const newActiveTabId = testing.activeTabId === tabId && newTabs.length > 0 ? newTabs[0].id : testing.activeTabId;
          
          return set(state => ({
            testing: { 
              ...state.testing, 
              tabs: newTabs,
              activeTabId: newActiveTabId
            }
          }));
        },
        updateTab: (tabId: string, tabData: Partial<TestTab>) => set(state => ({
          testing: { 
            ...state.testing, 
            tabs: state.testing.tabs.map(tab => 
              tab.id === tabId ? { ...tab, ...tabData } : tab
            )
          }
        })),
        setJsonTestScript: (jsonTestScript: string) => set(state => ({
          testing: { ...state.testing, jsonTestScript }
        })),
        addTestScript: (script: string) => set(state => ({
          testing: { ...state.testing, testScripts: [...state.testing.testScripts, script] }
        })),
        addGeneratedTest: (script: string) => set(state => ({
          testing: { ...state.testing, generatedTests: [...state.testing.generatedTests, script] }
        })),
        setIsGenerating: (isGenerating: boolean) => set(state => ({
          testing: { ...state.testing, isGenerating }
        })),
        setIsRunning: (isRunning: boolean) => set(state => ({
          testing: { ...state.testing, isRunning }
        })),
        setShowResults: (showResults: boolean) => set(state => ({
          testing: { ...state.testing, showResults }
        })),
        setGenerationError: (generationError: string | null) => set(state => ({
          testing: { ...state.testing, generationError }
        })),
        setResults: (results: any[]) => set(state => ({
          testing: { ...state.testing, results }
        })),
        
        // Settings actions
        setGlobalConfig: (globalConfig: any) => set(state => ({
          settings: { ...state.settings, globalConfig }
        })),
        setTheme: (theme: 'light' | 'dark' | 'system') => set(state => ({
          settings: { ...state.settings, theme }
        }))
      }),
      {
        name: 'arten-storage',
        partialize: (state) => ({
          settings: state.settings,  // Only persist settings
        }),
      }
    )
  )
);

// Export convenience hooks for specific slices - using proper selectors to avoid infinite render loops
// Instead of calling getState() (which causes re-renders), we use a selector function

export const useBrowserStore = () => useAppStore(state => ({
  // State
  url: state.browser.url,
  isLoading: state.browser.isLoading,
  isLaunched: state.browser.isLaunched,
  error: state.browser.error,
  // Actions
  setUrl: state.setUrl,
  setIsLoading: state.setIsLoading,
  setIsLaunched: state.setIsLaunched,
  setViewport: state.setViewport,
  setScale: state.setScale,
  setIsMobile: state.setIsMobile,
  setStatus: state.setStatus
}));

export const useDOMStore = () => useAppStore(state => ({
  // State
  domTree: state.dom.domTree,
  selectedNode: state.dom.selectedNode,
  // Actions
  setDOMTree: state.setDOMTree,
  setSelectedNode: state.setSelectedNode
}));

export const useTestingStore = () => useAppStore(state => ({
  // State
  tabs: state.testing.tabs,
  activeTabId: state.testing.activeTabId,
  jsonTestScript: state.testing.jsonTestScript,
  testScripts: state.testing.testScripts,
  generatedTests: state.testing.generatedTests,
  isGenerating: state.testing.isGenerating,
  isRunning: state.testing.isRunning,
  showResults: state.testing.showResults,
  generationError: state.testing.generationError,
  results: state.testing.results,
  // Actions
  setTabs: state.setTabs,
  setActiveTabId: state.setActiveTabId,
  addTab: state.addTab,
  removeTab: state.removeTab,
  updateTab: state.updateTab,
  setJsonTestScript: state.setJsonTestScript,
  addTestScript: state.addTestScript,
  addGeneratedTest: state.addGeneratedTest,
  setIsGenerating: state.setIsGenerating,
  setIsRunning: state.setIsRunning,
  setShowResults: state.setShowResults,
  setGenerationError: state.setGenerationError,
  setResults: state.setResults
}));

export const useSettingsStore = () => useAppStore(state => ({
  // State
  globalConfig: state.settings.globalConfig,
  theme: state.settings.theme,
  // Actions
  setGlobalConfig: state.setGlobalConfig,
  setTheme: state.setTheme
}));
