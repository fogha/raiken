import { useMutation } from '@tanstack/react-query';
import { DOMNode } from '@/types/dom';

interface NavigateParams {
  url: string;
}

interface ExtractDOMResponse {
  success: boolean;
  domTree: DOMNode;
  error?: string;
}

interface NavigateResponse {
  success: boolean;
  error?: string;
}

/**
 * Hook for browser operations (navigate, extract DOM, etc.)
 * Uses TanStack Query for proper state management
 */
export function useBrowser() {
  // Mutation to navigate to a URL
  const navigateMutation = useMutation({
    mutationFn: async ({ url }: NavigateParams) => {
      const response = await fetch('/api/v1/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', url }),
      });

      const data: NavigateResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to navigate to URL');
      }

      return data;
    },
  });

  // Mutation to extract DOM from current page
  const extractDOMMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract-dom' }),
      });

      const data: ExtractDOMResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract DOM');
      }

      return data.domTree;
    },
  });

  // Combined mutation to navigate and extract DOM
  const navigateAndExtractMutation = useMutation({
    mutationFn: async ({ url }: NavigateParams) => {
      // First navigate
      await navigateMutation.mutateAsync({ url });
      
      // Then extract DOM
      const domTree = await extractDOMMutation.mutateAsync();
      
      return domTree;
    },
  });

  return {
    // Navigate
    navigate: navigateMutation.mutateAsync,
    isNavigating: navigateMutation.isPending,
    navigateError: navigateMutation.error,

    // Extract DOM
    extractDOM: extractDOMMutation.mutateAsync,
    isExtractingDOM: extractDOMMutation.isPending,
    extractDOMError: extractDOMMutation.error,

    // Navigate and extract (combined)
    navigateAndExtract: navigateAndExtractMutation.mutateAsync,
    isNavigatingAndExtracting: navigateAndExtractMutation.isPending,
    navigateAndExtractError: navigateAndExtractMutation.error,
  };
}

