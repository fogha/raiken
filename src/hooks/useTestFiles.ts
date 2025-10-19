import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalBridge } from './useLocalBridge';

export interface TestFile {
    name: string;
    path: string;
    content: string;
    createdAt: string;
    modifiedAt: string;
  }

  
export function useTestFiles() {
  const { isConnected, connection } = useLocalBridge();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['testFiles', connection?.url],
    queryFn: async () => {
      if (!isConnected || !connection) {
        return [];
      }

      const response = await fetch(`${connection.url}/api/test-files`, {
        headers: {
          'Authorization': `Bearer ${connection.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch test files');
      }

      const data = await response.json();
      return data.files as TestFile[];
    },
    enabled: isConnected && !!connection,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false,
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (testPath: string) => {
      if (!connection) throw new Error('No connection');

      const response = await fetch(`${connection.url}/api/test-files`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${connection.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testPath }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete test file');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testFiles'] });
    },
  });

  return {
    testFiles: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    deleteTest: deleteTestMutation.mutate,
    isDeleting: deleteTestMutation.isPending,
  };
}

