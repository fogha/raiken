import { create } from 'zustand';
import { convertToRunnableScript } from '@/core/testing/test-script-utils';
import { useBrowserStore } from './browserStore';
import { useConfigurationStore } from './configurationStore';

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

interface TestFile {
  name: string;
  path: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
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
  
  // Test files from folder
  testFiles: TestFile[];
  isLoadingFiles: boolean;
  
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
  setTestFiles: (files: TestFile[]) => void;
  setIsLoadingFiles: (loading: boolean) => void;
  
  // Complex actions
  generateTest: () => Promise<void>;
  runTest: (testPath?: string) => Promise<void>;
  loadTestFiles: () => Promise<void>;
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
  testFiles: [],
  isLoadingFiles: false,
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
  setTestFiles: (files) => set({ testFiles: files }),
  setIsLoadingFiles: (loading) => set({ isLoadingFiles: loading }),
  
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
        
        // Save the test script to the generated-tests folder via API
        const saveResponse = await fetch('/api/save-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: testName,
            content: runnableScript
          }),
        });

        if (!saveResponse.ok) {
          const saveError = await saveResponse.json();
          console.warn('[Arten] Failed to save test script:', saveError.error);
        } else {
          const saveResult = await saveResponse.json();
          console.log('[Arten] Test script saved to:', saveResult.filePath);
        }
        
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
  
  runTest: async (testPath?: string) => {
    const state = get();
    state.setIsRunning(true);
    
    try {
      // Get configuration from configuration store
      const configStore = useConfigurationStore.getState();
      
      // Use provided testPath or default to the most recent generated test
      const pathToExecute = testPath || `generated-tests/${state.tabs[state.tabs.length - 1]?.name || 'test'}.spec.ts`;
      
      const response = await fetch('/api/execute-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testPath: pathToExecute,
          config: {
            browserType: configStore.config.execution.browserType,
            retries: configStore.config.execution.retries,
            timeout: configStore.config.playwright.timeout,
            features: configStore.config.playwright.features
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute test');
      }

      const { results: testResults, success, resultFile } = await response.json();
      state.setResults(testResults);

      console.log(`[Arten] Test execution ${success ? 'completed' : 'failed'}. Results saved to: ${resultFile}`);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      state.setIsRunning(false);
    }
  },

  loadTestFiles: async () => {
    const state = get();
    state.setIsLoadingFiles(true);
    
    try {
      const response = await fetch('/api/test-files');
      
      if (!response.ok) {
        throw new Error('Failed to load test files');
      }
      
      const { files } = await response.json();
      state.setTestFiles(files);
      
      console.log(`[Arten] Loaded ${files.length} test files from folder`);
    } catch (error) {
      console.error('Failed to load test files:', error);
    } finally {
      state.setIsLoadingFiles(false);
    }
  }
})); 