import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface EditorState {
  // Editor state
  editorTabs: TestTab[];
  activeTabId: string | null;
  
  // Editor actions
  addEditorTab: (tab: TestTab) => void;
  updateEditorTab: (id: string, updates: Partial<TestTab>) => void;
  removeEditorTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      // Initial state
      editorTabs: [],
      activeTabId: null,
      
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
    }),
    {
      name: 'raiken-editor',
    }
  )
);

