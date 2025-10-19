"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { TestScriptEditor } from './TestScriptEditor';
import { cn } from "@/lib/utils";
import { useProjectStore } from '@/store/projectStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useEditorStore } from '@/store/editorStore';

interface TestBuilderProps {
  selectedNode: DOMNode | null;
  url?: string;
  onTestGenerated?: (script: string) => void;
}

export function TestBuilder({ selectedNode: propSelectedNode, url, onTestGenerated }: TestBuilderProps) {
  const router = useRouter();
  const { addNotification, removeNotification } = useNotificationStore();
  const { addEditorTab } = useEditorStore();

  // Local UI state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [jsonTestScript, setJsonTestScript] = useState<string>('');
  const [loadingNotificationId, setLoadingNotificationId] = useState<string | null>(null);

  // Helper functions (defined before mutation)
  const getTestNameFromScript = (script: string): string => {
    const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
    
    try {
      const testSpec = JSON.parse(script);
      return testSpec.name || `Generated Test ${timestamp}`;
    } catch (e) {
      console.warn('[Raiken] Could not parse JSON test script for name:', e);
      return `Generated Test ${timestamp}`;
    }
  };

  const navigateToEditorWithTest = (testScript: string, testName: string) => {
    const newTab = {
      id: `test_${Date.now()}`,
      name: testName,
      content: testScript,
      language: 'typescript' as const,
      config: {
        headless: true,
        browserType: 'chromium' as const,
      },
    };
    addEditorTab(newTab);
    router.push('/tests/editor');
  };

  const handleGenerationError = (error: unknown): { title: string; message: string } => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isJsonError = ['json', 'parse', 'syntax'].some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );

    return isJsonError
      ? {
          title: 'Invalid JSON Configuration',
          message: 'The test configuration contains invalid JSON. Please check the syntax and try again.'
        }
      : {
          title: 'Test Generation Failed',
          message: errorMessage
        };
  };

  // TanStack Query mutation for test generation
  const generateTestMutation = useMutation({
    mutationFn: async (testSpec: any) => {
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

      if (!response.ok || result.error) {
        throw new Error(result.error || result.message || 'Failed to generate test');
      }
      
      if (!result.testScript) {
        throw new Error('No test script returned from server');
      }

      return result.testScript;
    },
    onMutate: () => {
      // Show loading notification when mutation starts
      const notificationId = addNotification({
        type: 'info',
        title: 'Generating Test...',
        message: 'Please wait while we generate your test script',
        duration: 0,
        dismissible: false
      });
      setLoadingNotificationId(notificationId);
    },
    onSuccess: (generatedScript) => {
      // Remove loading notification
      if (loadingNotificationId) {
        removeNotification(loadingNotificationId);
      }

      // Get test name from spec
      const testName = getTestNameFromScript(jsonTestScript);

      // Navigate to editor and create new tab
      navigateToEditorWithTest(generatedScript, testName);

      // Notify parent component if callback provided
      if (onTestGenerated) {
        onTestGenerated(generatedScript);
      }

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Test Generated Successfully',
        message: 'Opening test in editor...'
      });
    },
    onError: (error: Error) => {
      // Remove loading notification
      if (loadingNotificationId) {
        removeNotification(loadingNotificationId);
      }

      const { title, message } = handleGenerationError(error);
      
      addNotification({
        type: 'error',
        title,
        message
      });
    },
  });

  // Update URL in prompt when it changes - but only on first mount
  useEffect(() => {
    if (url && typeof url === 'string') {
      console.log('[Raiken] Setting initial JSON test script from URL');
      setJsonTestScript(url);
    }
  }, [url, setJsonTestScript]); 

  // Function to validate the JSON test script
  const validateTestScript = (script: string): boolean => {
    if (!script.trim()) {
      setValidationError('Test script cannot be empty');
      return false;
    }

    try {
      const parsed = JSON.parse(script);

      // Only validate if the script is not empty
      if (Object.keys(parsed).length === 0) {
        setValidationError('Test script cannot be empty');
        return false;
      }

      // Clear any previous validation errors if we have valid JSON
      setValidationError(null);
      return true;
    } catch (error) {
      // Provide more specific JSON error messages
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      let friendlyMessage = 'Invalid JSON format';
      
      if (errorMessage.includes('Unexpected token')) {
        friendlyMessage = 'Invalid JSON syntax - check for missing quotes, commas, or brackets';
      } else if (errorMessage.includes('Unexpected end of JSON input')) {
        friendlyMessage = 'Incomplete JSON - missing closing brackets or quotes';
      } else if (errorMessage.includes('Expected property name')) {
        friendlyMessage = 'Invalid property name - property names must be in quotes';
      }
      
      setValidationError(friendlyMessage);
      return false;
    }
  };

  // Function to handle changes in the JSON test script editor
  const handleJsonTestScriptChange = (newScript: string) => {
    console.log('[Raiken] JSON test script updated');
    setJsonTestScript(newScript);
    // Clear validation error when user is typing, but don't validate yet
    if (validationError) {
      setValidationError(null);
    }
  };


  // Generate a test script using the JSON test script
  const handleSubmitTest = () => {
    // Validate the test script before generating
    if (!validateTestScript(jsonTestScript)) {
      addNotification({
        type: 'error',
        title: 'Invalid Test Configuration',
        message: validationError || 'Please fix the configuration and try again.'
      });
      return;
    }

    // Parse the test spec
    let testSpec;
    try {
      testSpec = JSON.parse(jsonTestScript);
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Invalid JSON',
        message: 'Could not parse test configuration. Please check your JSON syntax.'
      });
      return;
    }

    generateTestMutation.mutate(testSpec);
  };

  return (
    <div className="max-w-full overflow-x-hidden h-full flex flex-col">
      {/* Test Script Editor */}
      <div className="flex-1 flex flex-col gap-4 w-full min-h-0" >
        <div className="flex-1 flex min-h-0" style={{ height: "80vh" }}>
          <TestScriptEditor
            value={jsonTestScript}
            onChange={handleJsonTestScriptChange}
            error={validationError !== null}
          />
        </div>

        {/* Test Generation Controls - Fixed at bottom */}
        <div className="flex gap-3 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200/50 dark:border-slate-700/50 rounded-lg">
          <Button
            onClick={handleSubmitTest}
            disabled={generateTestMutation.isPending || validationError !== null}
            className={cn(
              "flex-1 bg-gradient-to-r cursor-pointer from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all h-12",
              generateTestMutation.isPending && "cursor-not-allowed opacity-50"
            )}
          >
            {generateTestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Generate Test
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}