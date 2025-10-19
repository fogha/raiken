import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalBridge } from './useLocalBridge';

export interface TestReport {
  id: string;
  testPath: string;
  timestamp: string;
  success: boolean;
  output: string;
  error?: string;
  config: any;
  results?: any;
  artifacts?: Array<{
    name: string;
    contentType: string;
    path: string;
    relativePath: string;
    url: string;
  }>;
  aiAnalysis?: {
    rootCause: string;
    recommendations: string[];
    confidence: number;
  };
  summary?: {
    duration: number;
  };
}

export function useTestReports() {
  const { isConnected, connection, getReports } = useLocalBridge();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['testReports', connection?.url],
    queryFn: async () => {
      if (!isConnected) {
        const response = await fetch('/api/v1/tests?action=reports');
        if (!response.ok) {
          throw new Error('Failed to fetch reports');
        }
        const result = await response.json();
        return (result.reports || []) as TestReport[];
      }

      const result = await getReports();
      return (result.reports || []) as TestReport[];
    },
    enabled: true, // Always enabled, will use appropriate endpoint
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      if (isConnected && connection) {
        const response = await fetch(`${connection.url}/api/reports/${reportId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${connection.token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to delete report');
        return response.json();
      } else {
        const response = await fetch(`/api/v1/tests?action=deleteReport&reportId=${reportId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete report');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testReports'] });
    },
  });

  return {
    reports: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    deleteReport: deleteReportMutation.mutate,
    isDeleting: deleteReportMutation.isPending,
  };
}

