import { createSlice } from './createSlice';
import { useBrowserStore } from './browserStore';
import { localBridge } from '@/lib/local-bridge';

const BRIDGE_TIMEOUT_MS = parseInt(process.env.RAIKEN_BRIDGE_TIMEOUT_MS || '300000'); // 5 minutes default

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
  testScripts: string[];
  generatedTests: string[];
  jsonTestScript: string;
  isGenerating: boolean;
  runningTests: Record<string, boolean>;
  results: any[];
  generationError: string | null;
  testFiles: TestFile[];
  isLoadingFiles: boolean;
  executionConfig: TestExecutionConfig;

  addTestScript: (script: string) => void;
  addGeneratedTest: (script: string) => void;
  setJsonTestScript: (script: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setTestRunning: (testPath: string, isRunning: boolean) => void;
  isTestRunning: (testPath: string) => boolean;
  setResults: (results: any[]) => void;
  setGenerationError: (error: string | null) => void;
  setTestFiles: (files: TestFile[]) => void;
  setIsLoadingFiles: (loading: boolean) => void;
  updateExecutionConfig: (config: Partial<TestExecutionConfig>) => void;
  resetExecutionConfig: () => void;

  generateTest: () => Promise<void>;
  runTest: (testPath?: string) => Promise<void>;
  deleteTestFile: (testPath: string) => Promise<void>;
  saveTest: () => Promise<void>;
  loadTestFiles: () => Promise<void>;
}

const defaultExecutionConfig: TestExecutionConfig = {
  browserType: 'chromium',
  headless: true,
  retries: 1,
  timeout: 30000,
  maxFailures: 1,
  parallel: false,
  workers: 1,
  screenshots: true,
  videos: true,
  tracing: true,
  outputDir: 'test-results',
  reporters: ['json', 'html']
};

const loadExecutionConfig = (): TestExecutionConfig => {
  if (typeof window === 'undefined') return defaultExecutionConfig;
  try {
    const saved = localStorage.getItem('raiken-execution-config');
    return saved ? { ...defaultExecutionConfig, ...JSON.parse(saved) } : defaultExecutionConfig;
  } catch {
    return defaultExecutionConfig;
  }
};

const saveExecutionConfig = (config: TestExecutionConfig) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('raiken-execution-config', JSON.stringify(config));
  } catch {}
};

export const useTestStore = createSlice<TestState>('test', (set, get) => ({
  testScripts: [],
  generatedTests: [],
  jsonTestScript: '',
  isGenerating: false,
  runningTests: {},
  results: [],
  generationError: null,
  testFiles: [],
  isLoadingFiles: false,
  executionConfig: loadExecutionConfig(),
  addTestScript: (script) => set((state) => ({ testScripts: [...state.testScripts, script] })),
  addGeneratedTest: (script) => set((state) => ({ generatedTests: [...state.generatedTests, script] })),
  setJsonTestScript: (script) => set({ jsonTestScript: script }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setTestRunning: (testPath, isRunning) => set((state) => ({
    runningTests: { ...state.runningTests, [testPath]: isRunning }
  })),
  isTestRunning: (testPath) => Boolean(get().runningTests[testPath]),
  setResults: (results) => set({ results }),
  setGenerationError: (error) => set({ generationError: error }),
  setTestFiles: (files) => set({ testFiles: Array.isArray(files) ? files : [] }),
  setIsLoadingFiles: (loading) => set({ isLoadingFiles: loading }),

  updateExecutionConfig: (config) => set((state) => {
    const newConfig = { ...state.executionConfig, ...config };
    saveExecutionConfig(newConfig);
    return { executionConfig: newConfig };
  }),
  resetExecutionConfig: () => {
    saveExecutionConfig(defaultExecutionConfig);
    return set({ executionConfig: defaultExecutionConfig });
  },

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
          const filename = `${base}.spec.ts`;
          pathToExecute = localBridge.isConnected() ? filename : `generated-tests/${filename}`;
        } catch {
          pathToExecute = localBridge.isConnected() ? 'test.spec.ts' : 'generated-tests/test.spec.ts';
        }
      }
    }

    // Helper function to set test results and status
    const setTestResult = (success: boolean, output: string, statusMessage: string) => {
      state.setResults([{
        testPath: pathToExecute,
        success,
        output,
        timestamp: new Date().toISOString()
      }]);
    };

    state.setTestRunning(pathToExecute, true);

    try {
      const { executionConfig } = state;

      // Project-focused: Only execute tests in connected project
      if (!localBridge.isConnected()) {
        throw new Error('No project connected. Run "raiken remote" in your project directory to execute tests.');
      }

      console.log(`[TestStore] Executing test in project: ${pathToExecute}`);

      try {
        // Create timeout promise with configurable duration
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Test execution timeout (${BRIDGE_TIMEOUT_MS / 1000}s)`));
          }, BRIDGE_TIMEOUT_MS);
        });

        const bridgeExecutionPromise = localBridge.executeTestRemotely(pathToExecute, {
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

        const bridgeResult = await Promise.race([bridgeExecutionPromise, timeoutPromise]);

        // Clear timeout if execution completed
        clearTimeout(timeoutId!);

        // Validate bridge result structure
        if (!bridgeResult || typeof bridgeResult !== 'object') {
          throw new Error('Invalid project response');
        }

        if (bridgeResult.success) {
          console.log(`[TestStore] Test execution completed successfully`);
          setTestResult(true, bridgeResult.output || 'Test completed in project', 'Test passed successfully');
        } else {
          console.warn(`[TestStore] Test execution failed: ${bridgeResult.error}`);
          setTestResult(false, bridgeResult.error || 'Test execution failed', `Test execution failed: ${bridgeResult.error || 'Unknown error'}`);
        }

        // Refresh test files from project
        await state.loadTestFiles();

      } catch (bridgeError) {
        console.error(`[TestStore] Test execution error:`, bridgeError);
        const errorMessage = bridgeError instanceof Error ? bridgeError.message : 'Unknown error';
        setTestResult(false, `Test execution error: ${errorMessage}`, `Test execution error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Test execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResult(false, `Execution failed: ${errorMessage}`, `Test execution failed: ${errorMessage}`);
    } finally {
      state.setTestRunning(pathToExecute, false);
    }
  },

  saveTest: async() => {
    const state = get();
    try {
      const testSpec = JSON.parse(state.jsonTestScript);

      // Always use the exact test name from the JSON specification
      const testName = testSpec.name || 'Generated Test';
      const testContent = state.generatedTests[state.generatedTests.length - 1];
      const filename = `${testName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase()}.spec.ts`;

      // save to connected project
      if (localBridge.isConnected()) {
        console.log('[Raiken] 💾 Saving test to project...');
        const result = await localBridge.saveTestToLocal(testContent, filename);

        if (!result.success) {
          throw new Error(`Failed to save test to project: ${result.error}`);
        }
        console.log(`[Raiken] ✅ Test saved to project: ${result.path}`);
      } else {
        throw new Error('No project connected. Run "raiken remote" in your project directory to save tests.');
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
      // Project-focused: Only delete from connected project
      if (!localBridge.isConnected()) {
        throw new Error('No project connected. Cannot delete test file.');
      }

      console.log('[Raiken] 🗑️ Deleting test from project...');
      const connection = localBridge.getConnectionInfo();
      if (!connection) {
        throw new Error('No project connection available');
      }

      const response = await fetch(`${connection.url}/api/delete-test`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${connection.token}`
        },
        body: JSON.stringify({ testPath })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete test from project: ${response.status} ${response.statusText}`);
      }

      console.log(`[Raiken] ✅ Test deleted from project: ${testPath}`);
      state.loadTestFiles(); // Refresh list
    } catch (error) {
      console.error('Failed to delete test file:', error);
      throw error; // Re-throw so UI can handle it
    }
  },

  loadTestFiles: async () => {
    const state = get();
    state.setIsLoadingFiles(true);

    try {
      // load files from connected project
      if (localBridge.isConnected()) {
        console.log('[Raiken] 📁 Loading tests from project...');
        const result = await localBridge.getLocalTestFiles();

        if (result.success && result.files && Array.isArray(result.files)) {
          console.log(`[Raiken] ✅ Loaded ${result.files.length} tests from project`);
          state.setTestFiles(result.files);
        } else {
          console.warn('[Raiken] ⚠️ Failed to load project files:', result.error);
          state.setTestFiles([]);
        }
      } else {
        // No project connected - show empty list
        console.log('[Raiken] 📁 No project connected');
        state.setTestFiles([]);
      }
    } catch (error) {
      console.error('Failed to load test files:', error);
      state.setTestFiles([]);
    } finally {
      state.setIsLoadingFiles(false);
    }
  }
}));