import { useMutation, useQuery, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useLocalBridge } from './useLocalBridge';
import { useProjectStore } from '@/store/projectStore';
import { JsonTestSpec } from '@/types/test-generation';

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

interface GeneratedTest {
  id: string;
  content: string;
  timestamp: string;
}

export interface TestGenerationResponse {
  success: boolean;
  testScript: string;
  requestId: string;
  metadata: {
    generationTime: number;
    scriptLength: number;
  };
}

export interface TestGenerationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export interface TestGenerationInput {
  testSpec: JsonTestSpec;
  domTree?: unknown;
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

const getExecutionConfig = (): TestExecutionConfig => {
  if (typeof window === 'undefined') return defaultExecutionConfig;
  
  try {
    const saved = localStorage.getItem('raiken-execution-config');
    if (saved) {
      return { ...defaultExecutionConfig, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load execution config:', error);
  }
  
  return defaultExecutionConfig;
};

const saveExecutionConfig = (config: TestExecutionConfig) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('raiken-execution-config', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save execution config:', error);
  }
};

const getGeneratedTests = (): GeneratedTest[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem('raiken-generated-tests');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load generated tests:', error);
  }
  
  return [];
};

const saveGeneratedTests = (tests: GeneratedTest[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('raiken-generated-tests', JSON.stringify(tests));
  } catch (error) {
    console.error('Failed to save generated tests:', error);
  }
};

export function useTestGeneration() {
  const { isConnected, connection } = useLocalBridge();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['executionConfig'],
    queryFn: () => getExecutionConfig(),
    staleTime: Infinity,
  });

  const generatedTestsQuery = useQuery({
    queryKey: ['generatedTests'],
    queryFn: () => getGeneratedTests(),
    staleTime: Infinity,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<TestExecutionConfig>) => {
      const currentConfig = configQuery.data || defaultExecutionConfig;
      const newConfig = { ...currentConfig, ...updates };
      saveExecutionConfig(newConfig);
      return newConfig;
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData(['executionConfig'], newConfig);
    },
  });

  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      saveExecutionConfig(defaultExecutionConfig);
      return defaultExecutionConfig;
    },
    onSuccess: (config) => {
      queryClient.setQueryData(['executionConfig'], config);
    },
  });

  const generateTestMutation = useMutation<TestGenerationResponse, Error, JsonTestSpec>({
    mutationKey: ['generateTest'],
    
    mutationFn: async (testSpec: JsonTestSpec): Promise<TestGenerationResponse> => {
      const domTree = useProjectStore.getState().domTree;

      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testSpec,
          domTree,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const error = result.error;
        const errorMessage = error?.message || error || 'Failed to generate test';
        const errorCode = error?.code || 'GENERATION_ERROR';
        const requestId = result.requestId || 'unknown';
        
        const structuredError = new Error(`${errorMessage}`);
        structuredError.name = errorCode;
        (structuredError as any).code = errorCode;
        (structuredError as any).requestId = requestId;
        (structuredError as any).details = error?.details;
        
        throw structuredError;
      }
      
      if (!result.success || !result.testScript) {
        throw new Error('Invalid response: No test script returned from server');
      }

      return {
        success: result.success,
        testScript: result.testScript,
        requestId: result.requestId || 'unknown',
        metadata: result.metadata || { generationTime: 0, scriptLength: 0 }
      };
    },

    // Smart retry configuration
    retry: (failureCount, error) => {
      // Don't retry validation errors
      if ((error as any).code === 'VALIDATION_ERROR') {
        return false;
      }
      
      // Don't retry config errors
      if ((error as any).code === 'CONFIG_ERROR') {
        return false;
      }
      
      // Retry generation errors up to 2 times
      if ((error as any).code === 'GENERATION_ERROR' && failureCount < 2) {
        return true;
      }
      
      // Retry network errors up to 3 times
      return failureCount < 3;
    },

    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    onSuccess: (result) => {
      const currentTests = generatedTestsQuery.data || [];
      const newTest: GeneratedTest = {
        id: result.requestId || `test_${Date.now()}`,
        content: result.testScript,
        timestamp: new Date().toISOString(),
      };
      const updatedTests = [newTest, ...currentTests];
      saveGeneratedTests(updatedTests);
      queryClient.setQueryData(['generatedTests'], updatedTests);
    },
  });

  const saveTestMutation = useMutation({
    mutationFn: async (testContent: string) => {
      if (!isConnected || !connection) {
        throw new Error('No bridge connection available');
      }

      const filename = `test_${Date.now()}.spec.ts`;

      const response = await fetch(`${connection.url}/api/test-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: testContent,
          filename,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save test');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testFiles'] });
    },
  });

  const clearGeneratedTestsMutation = useMutation({
    mutationFn: async () => {
      saveGeneratedTests([]);
      return [];
    },
    onSuccess: (emptyTests) => {
      queryClient.setQueryData(['generatedTests'], emptyTests);
    },
  });

  return {
    executionConfig: configQuery.data || defaultExecutionConfig,
    updateExecutionConfig: updateConfigMutation.mutate,
    resetExecutionConfig: resetConfigMutation.mutate,
    
    generatedTests: generatedTestsQuery.data || [],
    latestTest: generatedTestsQuery.data?.[0] || null,
    
    generateTest: generateTestMutation.mutate,
    generateTestAsync: generateTestMutation.mutateAsync,
    isGenerating: generateTestMutation.isPending,
    isIdle: generateTestMutation.isIdle,
    isSuccess: generateTestMutation.isSuccess,
    isError: generateTestMutation.isError,
    generationError: generateTestMutation.error,
    
    generationData: generateTestMutation.data,
    generationTime: generateTestMutation.data?.metadata?.generationTime,
    scriptLength: generateTestMutation.data?.metadata?.scriptLength,
    requestId: generateTestMutation.data?.requestId,
    
    errorCode: (generateTestMutation.error as any)?.code,
    errorRequestId: (generateTestMutation.error as any)?.requestId,
    errorDetails: (generateTestMutation.error as any)?.details,
    
    saveTest: saveTestMutation.mutate,
    saveTestAsync: saveTestMutation.mutateAsync,
    isSaving: saveTestMutation.isPending,
    saveError: saveTestMutation.error,
    
    clearGeneratedTests: clearGeneratedTestsMutation.mutate,
    
    resetGeneration: generateTestMutation.reset,
  };
}

/**
 * Advanced hook for test generation with custom options
 * Provides the raw mutation with retry logic and error handling
 */
export function useTestGenerationMutation(
  options?: UseMutationOptions<TestGenerationResponse, Error, JsonTestSpec>
) {
  return useMutation<TestGenerationResponse, Error, JsonTestSpec>({
    mutationKey: ['generateTest'],
    
    mutationFn: async (testSpec: JsonTestSpec): Promise<TestGenerationResponse> => {
      const domTree = useProjectStore.getState().domTree;

      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testSpec,
          domTree,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const error = result.error;
        const errorMessage = error?.message || error || 'Failed to generate test';
        const errorCode = error?.code || 'GENERATION_ERROR';
        const requestId = result.requestId || 'unknown';
        
        const structuredError = new Error(`${errorMessage}`);
        structuredError.name = errorCode;
        (structuredError as any).code = errorCode;
        (structuredError as any).requestId = requestId;
        (structuredError as any).details = error?.details;
        
        throw structuredError;
      }
      
      if (!result.success || !result.testScript) {
        throw new Error('Invalid response: No test script returned from server');
      }

      return {
        success: result.success,
        testScript: result.testScript,
        requestId: result.requestId || 'unknown',
        metadata: result.metadata || { generationTime: 0, scriptLength: 0 }
      };
    },

    retry: (failureCount, error) => {
      if ((error as any).code === 'VALIDATION_ERROR') {
        return false;
      }
      
      if ((error as any).code === 'CONFIG_ERROR') {
        return false;
      }
      
      if ((error as any).code === 'GENERATION_ERROR' && failureCount < 2) {
        return true;
      }
      
      return failureCount < 3;
    },

    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    ...options,
  });
}

/**
 * Convenience hook that provides commonly used mutation states
 * Lighter alternative to the full useTestGeneration hook
 */
export function useTestGenerationState() {
  const mutation = useTestGenerationMutation();
  
  return {
    generateTest: mutation.mutate,
    generateTestAsync: mutation.mutateAsync,
    
    isGenerating: mutation.isPending,
    isIdle: mutation.isIdle,
    
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    
    data: mutation.data,
    error: mutation.error,
    
    reset: mutation.reset,
    
    generationTime: mutation.data?.metadata?.generationTime,
    scriptLength: mutation.data?.metadata?.scriptLength,
    requestId: mutation.data?.requestId,
    
    errorCode: (mutation.error as any)?.code,
    errorRequestId: (mutation.error as any)?.requestId,
    errorDetails: (mutation.error as any)?.details,
  };
}

