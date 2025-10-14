import { createSlice } from './createSlice';
import { useBrowserStore } from './browserStore';
import { unifiedBridgeService } from '@/lib/unified-bridge';

const BRIDGE_TIMEOUT_MS = parseInt(process.env.RAIKEN_BRIDGE_TIMEOUT_MS || '300000');

export interface TestFile {
  name: string;
  path: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
}

export interface TestExecutionConfig {
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  retries: number;
  timeout: number;
  maxFailures: number;
  parallel: boolean;
  workers: number;
  screenshots: boolean;
  videos: boolean;
  tracing: boolean;
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

  // Actions
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

  // Async operations
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
  } catch {
    // Silent fail
  }
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

  // Simple state updates
  addTestScript: (script) => set((state) => ({ 
    testScripts: [...state.testScripts, script] 
  })),
  
  addGeneratedTest: (script) => set((state) => ({ 
    generatedTests: [...state.generatedTests, script] 
  })),
  
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

  // Async operations
  generateTest: async () => {
    const state = get();
    state.setIsGenerating(true);
    state.setGenerationError(null);

    try {
      const { useProjectStore } = await import('./projectStore');
      const projectState = useProjectStore.getState();
      
      const response = await fetch('/api/v1/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt: state.jsonTestScript,
          domTree: projectState.domTree,
          url: projectState.url
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test script');
      }

      const responseData = await response.json();
      state.addGeneratedTest(responseData.testScript);
      await state.saveTest();

    } catch (error) {
      state.setGenerationError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      state.setIsGenerating(false);
    }
  },

  runTest: async (testPath?: string) => {
    const state = get();
    const pathToExecute = testPath || state.getDefaultTestPath();
    
    state.setTestRunning(pathToExecute, true);

    try {
      const bridge = await unifiedBridgeService.getBridge();
      if (!bridge) {
        throw new Error('No bridge connection available');
      }

      const result = await Promise.race([
        bridge.rpc('executeTest', {
          testPath: pathToExecute,
          config: state.executionConfig
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test execution timeout')), BRIDGE_TIMEOUT_MS)
        )
      ]);

      state.setResults([{
        testPath: pathToExecute,
        success: result.success,
        output: result.output || result.error || 'Test completed',
        timestamp: new Date().toISOString()
      }]);

      await state.loadTestFiles();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      state.setResults([{
        testPath: pathToExecute,
        success: false,
        output: `Execution failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      state.setTestRunning(pathToExecute, false);
    }
  },

  saveTest: async () => {
    const state = get();
    try {
      const testSpec = JSON.parse(state.jsonTestScript);
      const testName = testSpec.name || 'Generated Test';
      const testContent = state.generatedTests[state.generatedTests.length - 1];
      const filename = `${testName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase()}.spec.ts`;

      const bridge = await unifiedBridgeService.getBridge();
      if (!bridge) {
        throw new Error('No bridge connection available');
      }

      const result = await bridge.rpc('saveTest', {
        content: testContent,
        filename,
      });

      if (!result.success) {
        throw new Error(`Failed to save test: ${result.error}`);
      }

      state.addTestScript(testContent);

      // Create editor tab
      const browserStore = useBrowserStore.getState();
      browserStore.addEditorTab({
        id: `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: testName,
        content: testContent,
        language: 'typescript' as const,
        config: {
          headless: true,
          browserType: 'chromium' as const
        }
      });

      await state.loadTestFiles();

    } catch (error) {
      throw error;
    }
  },

  deleteTestFile: async (testPath: string) => {
    const state = get();
    try {
      const bridge = await unifiedBridgeService.getBridge();
      if (!bridge) {
        throw new Error('No bridge connection available');
      }

      await bridge.rpc('deleteTest', { testPath });
      await state.loadTestFiles();

    } catch (error) {
      throw error;
    }
  },

  loadTestFiles: async () => {
    const state = get();
    state.setIsLoadingFiles(true);

    try {
      const bridge = await unifiedBridgeService.getBridge();
      if (!bridge) {
        state.setTestFiles([]);
        return;
      }

      const result = await bridge.rpc('getTestFiles', {});
      
      if (result.success && Array.isArray(result.files)) {
        state.setTestFiles(result.files);
      } else {
        state.setTestFiles([]);
      }

    } catch (error) {
      state.setTestFiles([]);
    } finally {
      state.setIsLoadingFiles(false);
    }
  },

  // Helper method
  getDefaultTestPath: () => {
    const state = get();
    const latest = state.testFiles[0];
    if (latest?.path) return latest.path;

    try {
      const spec = JSON.parse(state.jsonTestScript || '{}');
      const base = (spec.name || 'test').toString().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      return `${base}.spec.ts`;
    } catch {
      return 'test.spec.ts';
    }
  }
}));