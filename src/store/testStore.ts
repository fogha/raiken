import { createSlice } from './createSlice';
import { useBrowserStore } from './browserStore';
import { useConfigurationStore } from './configurationStore';
import { localBridge } from '@/lib/local-bridge';

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

export interface TestFile {
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
  runningTests: Record<string, boolean>; // Track which tests are currently running
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
  setTestRunning: (testPath: string, isRunning: boolean) => void;
  isTestRunning: (testPath: string) => boolean;
  setResults: (results: any[]) => void;
  setGenerationError: (error: string | null) => void;
  addTab: (tab: TestTab) => void;
  setTestFiles: (files: TestFile[]) => void;
  setIsLoadingFiles: (loading: boolean) => void;
  
  // Complex actions
  generateTest: () => Promise<void>;
  runTest: (testPath?: string) => Promise<void>;
  deleteTestFile: (testPath: string) => Promise<void>;
  saveTest: () => Promise<void>;
  loadTestFiles: () => Promise<void>;
}

export const useTestStore = createSlice<TestState>('test', (set, get) => ({
  // Initial state
  testScripts: [],
  generatedTests: [],
  jsonTestScript: '',
  isGenerating: false,
  runningTests: {},
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
  setTestRunning: (testPath, isRunning) => set((state) => ({
    runningTests: {
      ...state.runningTests,
      [testPath]: isRunning
    }
  })),
  isTestRunning: (testPath) => Boolean(get().runningTests[testPath]),
  setResults: (results) => set({ results }),
  setGenerationError: (error) => set({ generationError: error }),
  addTab: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),
  setTestFiles: (files) => set({ testFiles: Array.isArray(files) ? files : [] }),
  setIsLoadingFiles: (loading) => set({ isLoadingFiles: loading }),
  
  // Complex actions
  generateTest: async () => {
    const state = get();
    state.setIsGenerating(true);
    state.setGenerationError(null);

    try {
      // Get DOM context from project store
      const { useProjectStore } = await import('./projectStore');
      const projectState = useProjectStore.getState();
      const domTree = projectState.domTree;
      const currentUrl = projectState.url;

      console.log('[Arten] Sending request to /api/generate-test endpoint with DOM context');
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: state.jsonTestScript,
          domTree: domTree,
          currentUrl: currentUrl
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test script');
      }

      const responseData = await response.json();
      const generatedScript = responseData.script;
      state.addGeneratedTest(generatedScript);

      // Call the saveTest method to save and create a new tab
      await state.saveTest();

    } catch (error) {
      console.error('[Arten] Test generation failed:', error);
      state.setGenerationError(error instanceof Error ? error.message : String(error));
    } finally {
      state.setIsGenerating(false);
    }
  },
  
  runTest: async (testPath?: string) => {
    const state = get();
    // Determine path to execute:
    // 1) explicit param
    // 2) most recently saved file from server response cached in testFiles
    // 3) fallback to last generated test name
    let pathToExecute = testPath;
    if (!pathToExecute) {
      const latest = Array.isArray(state.testFiles) && state.testFiles.length > 0
        ? state.testFiles[0]
        : null;
      if (latest?.path) {
        pathToExecute = latest.path;
      } else {
        // Fallback: derive from last generated test name
        try {
          const spec = JSON.parse(state.jsonTestScript || '{}');
          const base = (spec.name || 'test').toString().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          pathToExecute = `generated-tests/${base}.spec.ts`;
        } catch {
          pathToExecute = 'generated-tests/test.spec.ts';
        }
      }
    }
    
    state.setTestRunning(pathToExecute, true);
    
    try {
      const configStore = useConfigurationStore.getState();
      const browserState = useBrowserStore.getState();
      
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
            features: configStore.config.playwright.features,
            headless: configStore.config.execution.headless
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute test');
      }

      const { results: testResults, success, resultFile, summary, needsAIAnalysis, suiteId } = await response.json();
      state.setResults(testResults);
      // Refresh local cache of files after execution in case retries or artifacts changed
      state.loadTestFiles();

      // Update browser status for toast notifications
      const browserStore = useBrowserStore.getState();
      if (success) {
        browserStore.setStatus('TEST_PASSED', 'Test passed successfully', 'success');
      } else {
        const failMsg = summary || (testResults?.error || 'Test failed');
        browserStore.setStatus('TEST_FAILED', failMsg, 'error');
      }

      // Dispatch custom event for TestReports component to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('test-execution-complete', { detail: {
          success,
          resultFile,
          summary,
          needsAIAnalysis,
          suiteId
        }}));
      }

      console.log(`[Arten] Test execution ${success ? 'completed' : 'failed'}. Results saved to: ${resultFile}`);
      console.log(`[Arten] Used test suite: ${suiteId}`);
      console.log(`[Arten] AI Analysis: ${needsAIAnalysis ? 'Generated for failed test' : 'Not needed for passed test'}`);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      state.setTestRunning(pathToExecute, false);
    }
  },

  saveTest: async() => {
    const state = get();
    try {
      const testSpec = JSON.parse(state.jsonTestScript);
      
      // Use the test name from the JSON without adding timestamp
      // Timestamp will only be added for completely new tests via TestBuilder
      const testName = testSpec.name || 'Generated Test';
      const testContent = state.generatedTests[state.generatedTests.length - 1];
      const filename = `${testName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.spec.ts`;
      
      // Try to save via local CLI first, then fallback to server
      if (localBridge.isConnected()) {
        console.log('[Arten] 💾 Saving test via local CLI...');
        const result = await localBridge.saveTestToLocal(testContent, filename);
        
        if (result.success) {
          console.log(`[Arten] ✅ Test saved locally: ${result.path}`);
        } else {
          console.warn('[Arten] ⚠️ Local CLI save failed, falling back to server:', result.error);
          // Continue to fallback below
        }
      }
      
      if (!localBridge.isConnected()) {
        // Fallback: Save via hosted server (existing behavior)
        console.log('[Arten] 💾 Saving test via hosted server...');
        const saveResponse = await fetch('/api/save-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: testName,
            content: testContent
          }),
        });

        if (!saveResponse.ok) {
          const saveError = await saveResponse.json();
          console.warn('[Arten] Failed to save test script:', saveError.error);
        } else {
          const saveResult = await saveResponse.json();
          console.log('[Arten] Test script saved to:', saveResult.filePath);
        }
      }
      
      // Add to test scripts array
      state.addTestScript(state.generatedTests[state.generatedTests.length - 1]); // Add the last generated script
      
      // Create a new tab in the browser store
      const browserStore = useBrowserStore.getState();
      const newTab = {
        id: `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: testName,
        content: state.generatedTests[state.generatedTests.length - 1], // Use the last generated script
        language: 'typescript' as const,
        config: {
          headless: true,
          browserType: 'chromium' as const
        }
      };
      
      browserStore.addEditorTab(newTab);
      
      // Refresh list of test files so runTest can pick up latest saved path
      await state.loadTestFiles();

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
  },

  deleteTestFile: async (testPath: string) => {
    const state = get();
    try {
      // Try to delete via local CLI first, then fallback to server
      if (localBridge.isConnected()) {
        console.log('[Arten] 🗑️ Deleting test via local CLI...');
        const connection = localBridge.getConnectionInfo();
        if (connection) {
          const response = await fetch(`${connection.url}/api/delete-test`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${connection.token}`
            },
            body: JSON.stringify({ testPath })
          });
          
          if (response.ok) {
            console.log(`[Arten] ✅ Test deleted locally: ${testPath}`);
            state.loadTestFiles(); // Refresh list
            return;
          } else {
            console.warn('[Arten] ⚠️ Local CLI delete failed, falling back to server');
            // Continue to fallback below
          }
        }
      }
      
      // Fallback: Delete via hosted server (unified endpoint)
      console.log('[Arten] 🗑️ Deleting test via hosted server...');
      const response = await fetch('/api/test-files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testPath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete test file');
      }

      const result = await response.json();
      console.log(`[Arten] Test file deleted: ${testPath}`);
      state.setTestFiles(state.testFiles.filter(file => file.path !== testPath));
    } catch (error) {
      console.error('Failed to delete test file:', error);
    }
  },

  loadTestFiles: async () => {
    const state = get();
    state.setIsLoadingFiles(true);
    
    try {
      // Try to load via local CLI first, then fallback to server
      if (localBridge.isConnected()) {
        console.log('[Arten] 📁 Loading tests via local CLI...');
        const result = await localBridge.getLocalTestFiles();
        
        if (result.success && result.files && Array.isArray(result.files)) {
          console.log(`[Arten] ✅ Loaded ${result.files.length} tests from local project`);
          state.setTestFiles(result.files);
          return;
        } else {
          console.warn('[Arten] ⚠️ Local CLI load failed or returned invalid data, falling back to server:', result.error);
          // Continue to fallback below
        }
      }
      
      // Fallback: Load via hosted server (existing behavior)
      console.log('[Arten] 📁 Loading tests via hosted server...');
      const response = await fetch('/api/test-files');
      
      if (!response.ok) {
        throw new Error('Failed to load test files');
      }
      
      const data = await response.json();
      const files = data.files || [];
      
      // Ensure files is an array
      if (!Array.isArray(files)) {
        console.error('[Arten] ⚠️ API returned non-array for files:', files);
        state.setTestFiles([]);
        return;
      }
      
      state.setTestFiles(files);
      
      console.log(`[Arten] Loaded ${files.length} test files from folder`);
    } catch (error) {
      console.error('Failed to load test files:', error);
    } finally {
      state.setIsLoadingFiles(false);
    }
  }
})); 