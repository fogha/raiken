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

export interface TestExecutionConfig {
  // Browser settings
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  
  // Execution settings
  retries: number;
  timeout: number;
  maxFailures: number;
  parallel: boolean;
  workers: number;
  
  // Debugging features
  screenshots: boolean;
  videos: boolean;
  tracing: boolean;
  
  // Output settings
  outputDir: string;
  reporters: string[];
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
  
  // Test execution configuration
  executionConfig: TestExecutionConfig;
  
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
  updateExecutionConfig: (config: Partial<TestExecutionConfig>) => void;
  resetExecutionConfig: () => void;
  
  // Complex actions
  generateTest: () => Promise<void>;
  runTest: (testPath?: string) => Promise<void>;
  deleteTestFile: (testPath: string) => Promise<void>;
  saveTest: () => Promise<void>;
  loadTestFiles: () => Promise<void>;
}

const defaultExecutionConfig: TestExecutionConfig = {
  // Browser settings
  browserType: 'chromium',
  headless: true,
  
  // Execution settings
  retries: 1,
  timeout: 30000,
  maxFailures: 1,
  parallel: false,
  workers: 1,
  
  // Debugging features
  screenshots: true,
  videos: true,
  tracing: true,
  
  // Output settings
  outputDir: 'test-results',
  reporters: ['json', 'html']
};

// Configuration persistence helpers
const EXECUTION_CONFIG_KEY = 'raiken-execution-config';

const loadExecutionConfig = (): TestExecutionConfig => {
  if (typeof window === 'undefined') return defaultExecutionConfig;
  
  try {
    const saved = localStorage.getItem(EXECUTION_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Validate the loaded configuration structure
      if (parsed && typeof parsed === 'object') {
        // Ensure all required properties exist and have correct types
        const validatedConfig: TestExecutionConfig = {
          browserType: ['chromium', 'firefox', 'webkit'].includes(parsed.browserType) 
            ? parsed.browserType : defaultExecutionConfig.browserType,
          headless: typeof parsed.headless === 'boolean' 
            ? parsed.headless : defaultExecutionConfig.headless,
          retries: typeof parsed.retries === 'number' && parsed.retries >= 0 
            ? parsed.retries : defaultExecutionConfig.retries,
          timeout: typeof parsed.timeout === 'number' && parsed.timeout >= 5000 
            ? parsed.timeout : defaultExecutionConfig.timeout,
          maxFailures: typeof parsed.maxFailures === 'number' && parsed.maxFailures >= 1 
            ? parsed.maxFailures : defaultExecutionConfig.maxFailures,
          parallel: typeof parsed.parallel === 'boolean' 
            ? parsed.parallel : defaultExecutionConfig.parallel,
          workers: typeof parsed.workers === 'number' && parsed.workers >= 1 
            ? parsed.workers : defaultExecutionConfig.workers,
          screenshots: typeof parsed.screenshots === 'boolean' 
            ? parsed.screenshots : defaultExecutionConfig.screenshots,
          videos: typeof parsed.videos === 'boolean' 
            ? parsed.videos : defaultExecutionConfig.videos,
          tracing: typeof parsed.tracing === 'boolean' 
            ? parsed.tracing : defaultExecutionConfig.tracing,
          outputDir: typeof parsed.outputDir === 'string' && parsed.outputDir.trim() 
            ? parsed.outputDir : defaultExecutionConfig.outputDir,
          reporters: Array.isArray(parsed.reporters) 
            ? parsed.reporters : defaultExecutionConfig.reporters
        };
        
        return validatedConfig;
      }
    }
  } catch (error) {
    console.warn('[Raiken] Failed to load execution config from localStorage:', error);
  }
  
  return defaultExecutionConfig;
};

const saveExecutionConfig = (config: TestExecutionConfig) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(EXECUTION_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('[Raiken] Failed to save execution config to localStorage:', error);
  }
};

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
  executionConfig: loadExecutionConfig(),
  
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
  
  // Configuration actions
  updateExecutionConfig: (config) => set((state) => {
    const newConfig = { ...state.executionConfig, ...config };
    saveExecutionConfig(newConfig);
    return { executionConfig: newConfig };
  }),
  resetExecutionConfig: () => {
    saveExecutionConfig(defaultExecutionConfig);
    return set({ executionConfig: defaultExecutionConfig });
  },
  
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

      console.log('[Raiken] Sending request to /api/v1/tests endpoint with DOM context');
      const response = await fetch('/api/v1/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          prompt: state.jsonTestScript,
          domTree: domTree,
          url: currentUrl
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test script');
      }

      const responseData = await response.json();
      const generatedScript = responseData.testScript;
      state.addGeneratedTest(generatedScript);

      // Call the saveTest method to save and create a new tab
      await state.saveTest();

    } catch (error) {
      console.error('[Raiken] Test generation failed:', error);
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
      const browserState = useBrowserStore.getState();
      const { executionConfig } = state;
      
      // Check if local bridge is available and use it for test execution
      if (localBridge.isConnected()) {
        console.log(`[TestStore] Executing test via local bridge: ${pathToExecute}`);
        
        const bridgeResult = await localBridge.executeTestRemotely(pathToExecute, {
          browserType: executionConfig.browserType,
          retries: executionConfig.retries,
          timeout: executionConfig.timeout,
          maxFailures: executionConfig.maxFailures,
          parallel: executionConfig.parallel,
          workers: executionConfig.workers,
          features: {
            screenshots: executionConfig.screenshots,
            video: executionConfig.videos,
            tracing: executionConfig.tracing
          },
          headless: executionConfig.headless,
          outputDir: executionConfig.outputDir,
          reporters: executionConfig.reporters
        });
        
        if (bridgeResult.success) {
          // Handle successful bridge execution
          console.log(`[TestStore] Bridge execution completed successfully`);
          state.setResults([{
            testPath: pathToExecute,
            success: true,
            output: bridgeResult.output || 'Test completed via local bridge',
            timestamp: new Date().toISOString()
          }]);
          return;
        } else {
          console.warn(`[TestStore] Bridge execution failed: ${bridgeResult.error}`);
          // Fall back to direct execution
        }
      }
      
      console.log(`[TestStore] Executing test via Raiken API: ${pathToExecute}`);
      const response = await fetch('/api/v1/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute',
          testPath: pathToExecute,
          browserType: executionConfig.browserType,
          retries: executionConfig.retries,
          timeout: executionConfig.timeout,
          maxFailures: executionConfig.maxFailures,
          parallel: executionConfig.parallel,
          workers: executionConfig.workers,
          features: {
            screenshots: executionConfig.screenshots,
            video: executionConfig.videos,
            tracing: executionConfig.tracing
          },
          headless: executionConfig.headless,
          outputDir: executionConfig.outputDir,
          reporters: executionConfig.reporters
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute test');
      }

      const responseData = await response.json();
      const { result } = responseData;
      const { results: testResults, success, resultFile, summary, needsAIAnalysis } = result;
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
          needsAIAnalysis
        }}));
      }

      console.log(`[Raiken] Test execution ${success ? 'completed' : 'failed'}. Results saved to: ${resultFile}`);
      console.log(`[Raiken] AI Analysis: ${needsAIAnalysis ? 'Generated for failed test' : 'Not needed for passed test'}`);
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
        console.log('[Raiken] 💾 Saving test via local CLI...');
        const result = await localBridge.saveTestToLocal(testContent, filename);
        
        if (result.success) {
          console.log(`[Raiken] ✅ Test saved locally: ${result.path}`);
        } else {
          console.warn('[Raiken] ⚠️ Local CLI save failed, falling back to server:', result.error);
          // Continue to fallback below
        }
      }
      
      if (!localBridge.isConnected()) {
        // Fallback: Save via hosted server (existing behavior)
        console.log('[Raiken] 💾 Saving test via hosted server...');
        const saveResponse = await fetch('/api/v1/tests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save',
            filename: testName,
            content: testContent
          }),
        });

        if (!saveResponse.ok) {
          const saveError = await saveResponse.json();
          console.warn('[Raiken] Failed to save test script:', saveError.error);
        } else {
          const saveResult = await saveResponse.json();
          console.log('[Raiken] Test script saved to:', saveResult.filePath);
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
          console.log('[Raiken] Switching to Tests tab');
          testsTabTrigger.click();
        }
      }, 100);
    } catch (scriptError) {
      console.error('[Raiken] Error creating runnable script:', scriptError);
    }
  },

  deleteTestFile: async (testPath: string) => {
    const state = get();
    try {
      // Try to delete via local CLI first, then fallback to server
      if (localBridge.isConnected()) {
        console.log('[Raiken] 🗑️ Deleting test via local CLI...');
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
            console.log(`[Raiken] ✅ Test deleted locally: ${testPath}`);
            state.loadTestFiles(); // Refresh list
            return;
          } else {
            console.warn('[Raiken] ⚠️ Local CLI delete failed, falling back to server');
            // Continue to fallback below
          }
        }
      }
      
      // Fallback: Delete via hosted server (unified endpoint)
      console.log('[Raiken] 🗑️ Deleting test via hosted server...');
      const response = await fetch(`/api/v1/tests?path=${encodeURIComponent(testPath)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete test file');
      }

      const result = await response.json();
      console.log(`[Raiken] Test file deleted: ${testPath}`);
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
        console.log('[Raiken] 📁 Loading tests via local CLI...');
        const result = await localBridge.getLocalTestFiles();
        
        if (result.success && result.files && Array.isArray(result.files)) {
          console.log(`[Raiken] ✅ Loaded ${result.files.length} tests from local project`);
          state.setTestFiles(result.files);
          return;
        } else {
          console.warn('[Raiken] ⚠️ Local CLI load failed or returned invalid data, falling back to server:', result.error);
          // Continue to fallback below
        }
      }
      
      // Fallback: Load via hosted server (existing behavior)
      console.log('[Raiken] 📁 Loading tests via hosted server...');
      const response = await fetch('/api/v1/tests?action=list');
      
      if (!response.ok) {
        throw new Error('Failed to load test files');
      }
      
      const data = await response.json();
      const files = data.files || [];
      
      // Ensure files is an array
      if (!Array.isArray(files)) {
        console.error('[Raiken] ⚠️ API returned non-array for files:', files);
        state.setTestFiles([]);
        return;
      }
      
      state.setTestFiles(files);
      
      console.log(`[Raiken] Loaded ${files.length} test files from folder`);
    } catch (error) {
      console.error('Failed to load test files:', error);
    } finally {
      state.setIsLoadingFiles(false);
    }
  }
})); 