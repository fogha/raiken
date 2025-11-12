"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, MessageSquare, AlertTriangle } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { JsonTestSpec } from '@/types/test-generation';
import { TestScriptEditor } from './TestScriptEditor';
import { cn } from "@/lib/utils";
import { useProjectStore } from '@/store/projectStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useEditorStore } from '@/store/editorStore';
import { useLocalBridge } from '@/hooks/useLocalBridge';

interface TestBuilderProps {
  selectedNode: DOMNode | null;
  url?: string;
  onTestGenerated?: (script: string) => void;
  editorMode?: 'json' | 'chat';
}

export function TestBuilder({ selectedNode: propSelectedNode, url, onTestGenerated, editorMode: propEditorMode = 'json' }: TestBuilderProps) {
  const router = useRouter();
  const { addNotification, removeNotification } = useNotificationStore();
  const { addEditorTab } = useEditorStore();
  const { isConnected } = useLocalBridge();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [jsonTestScript, setJsonTestScript] = useState<string>('');
  const [loadingNotificationId, setLoadingNotificationId] = useState<string | null>(null);
  const editorMode = propEditorMode;
  const getTestNameFromScript = (script: string): string => {
    const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
    
    try {
      const testSpec: JsonTestSpec = JSON.parse(script);
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

  const generateTestMutation = useMutation({
    mutationFn: async (testSpec: JsonTestSpec) => {
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
        const errorMessage = result.error?.message || result.error || 'Failed to generate test';
        const errorCode = result.error?.code || 'GENERATION_ERROR';
        
        throw new Error(`[${errorCode}] ${errorMessage}`);
      }
      
      if (!result.success || !result.testScript) {
        throw new Error('No test script returned from server');
      }

      return {
        testScript: result.testScript,
        requestId: result.requestId,
        metadata: result.metadata
      };
    },
    onMutate: () => {
      const notificationId = addNotification({
        type: 'info',
        title: 'Generating Test...',
        message: 'Please wait while we generate your test script',
        duration: 0,
        dismissible: false
      });
      setLoadingNotificationId(notificationId);
    },
    onSuccess: (result) => {
      if (loadingNotificationId) {
        removeNotification(loadingNotificationId);
      }

      const testName = getTestNameFromScript(jsonTestScript);
      navigateToEditorWithTest(result.testScript, testName);

      if (onTestGenerated) {
        onTestGenerated(result.testScript);
      }
      const generationTime = result.metadata?.generationTime ? `${result.metadata.generationTime}ms` : '';
      const scriptSize = result.metadata?.scriptLength || 0;
      
      addNotification({
        type: 'success',
        title: 'Test Generated Successfully',
        message: `Opening test in editor... ${generationTime ? `Generated in ${generationTime}` : ''} (${scriptSize} chars)`
      });
    },
    onError: (error: Error) => {
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

  useEffect(() => {
    if (url && typeof url === 'string') {
      console.log('[Raiken] Setting initial JSON test script from URL');
      setJsonTestScript(url);
    }
  }, [url, setJsonTestScript]); 

  const validateTestScript = (script: string): boolean => {
    if (!script.trim()) {
      setValidationError('Test script cannot be empty');
      return false;
    }

    try {
      const parsed = JSON.parse(script);

      if (Object.keys(parsed).length === 0) {
        setValidationError('Test script cannot be empty');
        return false;
      }

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

  const handleJsonTestScriptChange = (newScript: string) => {
    console.log('[Raiken] JSON test script updated');
    setJsonTestScript(newScript);
    // Clear validation error when user is typing, but don't validate yet
    if (validationError) {
      setValidationError(null);
    }
  };


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
    let testSpec: JsonTestSpec;
    try {
      testSpec = JSON.parse(jsonTestScript) as JsonTestSpec;
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
    <div className="w-full h-full flex flex-col">
      {/* Editor Mode Toggle - placed in parent header via export */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden py-4">
          {!isConnected ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-300 items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bridge Disconnected</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start the bridge to generate tests</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-300">
              {editorMode === 'json' ? (
                <TestScriptEditor
                  value={jsonTestScript}
                  onChange={handleJsonTestScriptChange}
                  error={validationError !== null}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium mb-1">Chat Interface</p>
                    <p className="text-xs opacity-70">Coming soon...</p>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Test Generation Controls - Fixed at bottom */}
      {editorMode === 'json' && (
      <div className="flex gap-2 p-4 pb-4 flex-shrink-0">
        <Button
          onClick={handleSubmitTest}
          disabled={generateTestMutation.isPending || validationError !== null || !isConnected}
          className={cn(
            "w-full bg-green-600 hover:bg-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all h-9 text-sm",
            (generateTestMutation.isPending || !isConnected) && "cursor-not-allowed opacity-50"
          )}
          size="sm"
        >
          {generateTestMutation.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : !isConnected ? (
            <>
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              Disconnected
            </>
          ) : (
            <>
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Generate
            </>
          )}
        </Button>
      </div>
      )}
    </div>
  );
}

export function TestBuilderHeader({ editorMode, onModeChange }: { editorMode: 'json' | 'chat'; onModeChange: (mode: 'json' | 'chat') => void }) {
  return (
    <div className="flex items-center bg-none gap-1.5 rounded-lg p-1">
      <button
        onClick={() => onModeChange('json')}
        className={cn(
          "px-3 py-1.5 text-xs font-semibold rounded transition-all duration-200 tracking-tight",
          editorMode === 'json'
            ? 'dark:bg-slate-800 shadow-sm'
            : 'bg-none dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
        )}
      >
        JSON
      </button>
      <button
        onClick={() => onModeChange('chat')}
        className={cn(
          "px-3 py-1.5 text-xs font-semibold rounded transition-all duration-200 flex items-center gap-1.5 tracking-tight",
          editorMode === 'chat'
            ? 'shadow-sm dark:bg-slate-800'
            : 'bg-none dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
        )}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Chat
      </button>
    </div>
  );
}