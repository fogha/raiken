import { create } from 'zustand';
import { convertToRunnableScript } from '@/core/testing/test-script-utils';
import { useBrowserStore } from './browserStore';

interface TestTab {
  id: string;
  name: string;
  content: string;
  language: string;
  config: {
    headless: boolean;
    browserType: string;
  };
}

interface TestState {
  // Test script state
  testScripts: string[];
  generatedTests: string[];
  jsonTestScript: string;
  isGenerating: boolean;
  isRunning: boolean;
  results: any[];
  generationError: string | null;
  
  // Test tabs
  tabs: TestTab[];
  
  // Actions
  addTestScript: (script: string) => void;
  addGeneratedTest: (script: string) => void;
  setJsonTestScript: (script: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setResults: (results: any[]) => void;
  setGenerationError: (error: string | null) => void;
  addTab: (tab: TestTab) => void;
  
  // Complex actions
  generateTest: () => Promise<void>;
  runTest: () => Promise<void>;
}

export const useTestStore = create<TestState>((set, get) => ({
  // Initial state
  testScripts: [],
  generatedTests: [],
  jsonTestScript: '',
  isGenerating: false,
  isRunning: false,
  results: [],
  generationError: null,
  tabs: [],
  
  // Simple actions
  addTestScript: (script) => set((state) => ({ testScripts: [...state.testScripts, script] })),
  addGeneratedTest: (script) => set((state) => ({ generatedTests: [...state.generatedTests, script] })),
  setJsonTestScript: (script) => set({ jsonTestScript: script }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setResults: (results) => set({ results }),
  setGenerationError: (error) => set({ generationError: error }),
  addTab: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),
  
  // Complex actions
  generateTest: async () => {
    const state = get();
    state.setIsGenerating(true);
    state.setGenerationError(null);

    try {
      console.log('[Arten] Sending request to /api/generate-test endpoint');
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: state.jsonTestScript
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test script');
      }

      const generatedScript = await response.text();
      state.addGeneratedTest(generatedScript);

      try {
        const testSpec = JSON.parse(state.jsonTestScript);
        const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
        const testName = testSpec.name ? `${testSpec.name} ${timestamp}` : `Generated Test ${timestamp}`;
        const runnableScript = convertToRunnableScript(testSpec);
        
        // Add to test scripts array
        state.addTestScript(runnableScript);
        
        // Create a new tab in the browser store
        const browserStore = useBrowserStore.getState();
        const newTab = {
          id: `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: testName,
          content: runnableScript,
          language: 'typescript' as const,
          config: {
            headless: true,
            browserType: 'chromium' as const
          }
        };
        
        browserStore.addEditorTab(newTab);
        
        // Switch to Tests tab after a short delay to ensure UI is ready
        setTimeout(() => {
          const testsTabTrigger = document.querySelector('[data-state="inactive"][value="tests"]') as HTMLButtonElement;
          if (testsTabTrigger) {
            console.log('[Arten] Switching to Tests tab');
            testsTabTrigger.click();
          }
        }, 100);
      } catch (scriptError) {
        console.error('[Arten] Error creating runnable script:', scriptError);
      }
    } catch (error) {
      console.error('[Arten] Test generation failed:', error);
      state.setGenerationError(error instanceof Error ? error.message : String(error));
    } finally {
      state.setIsGenerating(false);
    }
  },
  
  runTest: async () => {
    const state = get();
    state.setIsRunning(true);
    
    try {
      const response = await fetch('/api/execute-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: state.testScripts[state.generatedTests.length - 1],
          config: {}  // TODO: Add test configuration
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute test');
      }

      const { results: testResults, error } = await response.json();
      state.setResults(testResults);

      if (error) throw error;
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      state.setIsRunning(false);
    }
  }
})); 