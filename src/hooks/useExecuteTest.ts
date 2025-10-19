import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalBridge } from './useLocalBridge';

interface ExecuteTestParams {
  testPath: string;
  config?: {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    retries?: number;
    timeout?: number;
    maxFailures?: number;
    parallel?: boolean;
    workers?: number;
    screenshots?: boolean;
    videos?: boolean;
    tracing?: boolean;
    outputDir?: string;
    reporters?: string[];
  };
}

export function useExecuteTest() {
  const { isConnected, connection } = useLocalBridge();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ testPath, config }: ExecuteTestParams) => {
      if (!isConnected || !connection) {
        throw new Error('No bridge connection available');
      }

      const defaultConfig = {
        browserType: 'chromium' as const,
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
        reporters: ['json', 'html'],
      };

      const response = await fetch(`${connection.url}/api/execute-test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testPath,
          config: { ...defaultConfig, ...config },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute test');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate reports to show the new test result
      queryClient.invalidateQueries({ queryKey: ['testReports'] });
    },
  });

  return {
    executeTest: mutation.mutate,
    executeTestAsync: mutation.mutateAsync,
    isExecuting: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}

