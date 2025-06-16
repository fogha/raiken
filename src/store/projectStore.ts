import { create } from 'zustand';
import type { DOMNode } from '@/types/dom';

interface ProjectState {
  // Browser state
  url: string | null;
  isLoading: boolean;
  loadError: string | null;
  
  // DOM state
  selectedNode: DOMNode | null;
  domTree: DOMNode | null;
  
  // UI state
  sidebarCollapsed: boolean;
  
  // Test state
  generatedTestScript: string;
  
  // Actions
  setUrl: (url: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setLoadError: (error: string | null) => void;
  setSelectedNode: (node: DOMNode | null) => void;
  setDomTree: (tree: DOMNode | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setGeneratedTestScript: (script: string) => void;
  
  // Complex actions
  loadProject: (url: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  url: null,
  isLoading: false,
  loadError: null,
  selectedNode: null,
  domTree: null,
  sidebarCollapsed: false,
  generatedTestScript: '',
  
  // Simple actions
  setUrl: (url) => set({ url }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setLoadError: (error) => set({ loadError: error }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setDomTree: (tree) => set({ domTree: tree }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setGeneratedTestScript: (script) => set({ generatedTestScript: script }),
  
  // Complex actions
  loadProject: async (url) => {
    const state = get();
    state.setIsLoading(true);
    state.setLoadError(null);
    state.setSelectedNode(null);
    state.setDomTree(null);

    try {
      state.setUrl(url);
    } catch (error) {
      state.setLoadError(error instanceof Error ? error.message : 'Failed to load project');
    } finally {
      state.setIsLoading(false);
    }
  }
})); 