import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalBridge } from './useLocalBridge';
import { useProjectStore } from '@/store/projectStore';

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

// Local storage helpers
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

  // Query for execution config
  const configQuery = useQuery({
    queryKey: ['executionConfig'],
    queryFn: () => getExecutionConfig(),
    staleTime: Infinity,
  });

  // Query for generated tests
  const generatedTestsQuery = useQuery({
    queryKey: ['generatedTests'],
    queryFn: () => getGeneratedTests(),
    staleTime: Infinity,
  });

  // Mutation to update config
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

  // Mutation to reset config
  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      saveExecutionConfig(defaultExecutionConfig);
      return defaultExecutionConfig;
    },
    onSuccess: (config) => {
      queryClient.setQueryData(['executionConfig'], config);
    },
  });

  // Mutation to generate test
  const generateTestMutation = useMutation({
    mutationFn: async (testSpec: any) => {
      const domTree = useProjectStore.getState().domTree;
      const config = configQuery.data || defaultExecutionConfig;

      // Use Next.js API route for test generation (not the bridge)
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testSpec,
          domTree,
          config,
        }),
      });

      const result = await response.json();

      // Check for errors in the response
      if (!response.ok || result.error) {
        throw new Error(result.error || result.message || 'Failed to generate test');
      }
      
      if (!result.testScript) {
        throw new Error('No test script returned from server');
      }

      return result.testScript;
    },
    onSuccess: (testScript) => {
      const currentTests = generatedTestsQuery.data || [];
      const newTest: GeneratedTest = {
        id: `test_${Date.now()}`,
        content: testScript,
        timestamp: new Date().toISOString(),
      };
      const updatedTests = [newTest, ...currentTests];
      saveGeneratedTests(updatedTests);
      queryClient.setQueryData(['generatedTests'], updatedTests);
    },
  });

  // Mutation to save test
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
      // Invalidate test files to show the new saved test
      queryClient.invalidateQueries({ queryKey: ['testFiles'] });
    },
  });

  // Mutation to clear generated tests
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
    // Config
    executionConfig: configQuery.data || defaultExecutionConfig,
    updateExecutionConfig: updateConfigMutation.mutate,
    resetExecutionConfig: resetConfigMutation.mutate,
    
    // Generated tests
    generatedTests: generatedTestsQuery.data || [],
    latestTest: generatedTestsQuery.data?.[0] || null,
    
    // Actions
    generateTest: generateTestMutation.mutate,
    generateTestAsync: generateTestMutation.mutateAsync,
    isGenerating: generateTestMutation.isPending,
    generationError: generateTestMutation.error,
    
    saveTest: saveTestMutation.mutate,
    saveTestAsync: saveTestMutation.mutateAsync,
    isSaving: saveTestMutation.isPending,
    saveError: saveTestMutation.error,
    
    clearGeneratedTests: clearGeneratedTestsMutation.mutate,
  };
}

