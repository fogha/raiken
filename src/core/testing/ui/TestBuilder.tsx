"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { TestScriptEditor } from './TestScriptEditor';
import { cn } from "@/core/common/utils";
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { convertToRunnableScript } from '@/core/testing/test-script-utils';
// Removed Zustand store imports in favor of local state

interface TestBuilderProps {
  selectedNode: DOMNode | null;
  url?: string;
  onRunTest?: (script: string) => void;
  onTestGenerated?: (script: string) => void; // Add prop for notifying when a test is generated
  onAddTestTab?: (testScript: string, testName: string) => void; // Add new method to create a test tab
}

export function TestBuilder({ selectedNode: propSelectedNode, url, onRunTest, onTestGenerated, onAddTestTab }: TestBuilderProps) {
  // Use props directly instead of Zustand store
  const selectedNode = propSelectedNode;

  // Testing state as local React state instead of Zustand
  const [testScript, setTestScript] = useState<string>('');
  const [jsonTestScript, setJsonTestScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<any[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Function to add a new tab (replaces the Zustand store's addTab action)
  const addTab = (tab: any) => {
    // If parent component provides the onAddTestTab callback, use it
    if (onAddTestTab) {
      onAddTestTab(tab.content, tab.name);
    }
  };
  
  // Local UI state
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  // Update URL in prompt when it changes - but only on first mount
  useEffect(() => {
    if (url && typeof url === 'string') {
      console.log('[Arten] Setting initial JSON test script from URL');
      setJsonTestScript(url);
    }
  }, []); // Empty dependency array to ensure it only runs once on mount

  // Function to handle changes in the JSON test script editor
  const handleJsonTestScriptChange = (newScript: string) => {
    console.log('[Arten] JSON test script updated:', newScript);
    setJsonTestScript(newScript);
  };

  // Generate a test script using the JSON test script
  const handleSubmitTest = async () => {
    console.log('[Arten] Starting test generation process...');
    console.log('[Arten] JSON test script:', jsonTestScript);

    setIsGenerating(true);
    setGenerationError(null);

    try {
      console.log('[Arten] Sending request to /api/generate-test endpoint');
      // Make a fetch call to the API route for OpenAI test generation
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: jsonTestScript
        }),
      });

      console.log('[Arten] API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('[Arten] API error response:', errorData);
        throw new Error(errorData.error || 'Failed to generate test script');
      }

      // Get the generated script
      const generatedScript = await response.text();
      console.log('[Arten] Generated script received, length:', generatedScript.length);
      console.log('[Arten] Generated script preview:', generatedScript.substring(0, 100) + '...');

      setTestScript(generatedScript);

      // Generate a runnable test script from the JSON specification
      try {
        // Parse the JSON test script to get details like test name
        const testSpec = JSON.parse(jsonTestScript);
        const testName = testSpec.name || 'Arten Test';

        // Convert to a runnable Playwright script
        const runnableScript = convertToRunnableScript(testSpec);
        console.log('[Arten] Generated runnable script for test tabs');

        // Add the runnable script to the test tabs using Zustand store
        console.log('[Arten] Adding test script to test tabs with name:', testName);
        
        // Use the store's addTab function to add the new test tab
        addTab({
          id: `tab_${Date.now()}`,
          name: testName,
          content: runnableScript,
          language: 'typescript',
          config: {
            headless: true,
            browserType: 'chromium'
          }
        });
        
        // Also use legacy callback if provided (for backward compatibility)
        if (onAddTestTab) {
          onAddTestTab(runnableScript, testName);
        }
      } catch (scriptError) {
        console.error('[Arten] Error creating runnable script:', scriptError);
        // Continue with the process even if creating the runnable script fails
      }

      // Notify parent component that test was generated (for PlaywrightBrowser)
      if (onTestGenerated) {
        console.log('[Arten] Notifying parent that test was generated');
        onTestGenerated(generatedScript);
      }

      // Call onRunTest callback to send test script to parent component
      if (onRunTest) {
        console.log('[Arten] Passing generated script to parent component');
        onRunTest(generatedScript);
      }
    } catch (error) {
      console.error('[Arten] Test generation failed:', error);
      console.log('[Arten] Error details:', error instanceof Error ? error.stack : 'No stack trace available');
      setGenerationError(error instanceof Error ? error.message : String(error));
    } finally {
      console.log('[Arten] Test generation process completed');
      setIsGenerating(false);
    }
  };

  const handleRunTest = async () => {
    setIsRunning(true);
    try {
      // Make a fetch call to the API route that has access to server-side env variables
      const response = await fetch('/api/execute-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: testScript,  // Use the JSON test script
          config
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute test');
      }

      const { results: testResults, error } = await response.json();
      setResults(testResults);

      // Call the onRunTest callback if provided
      if (onRunTest) {
        onRunTest(testScript);
      }

      if (error) throw error;
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-full overflow-x-hidden">
      {/* Test Script Editor */}
      <div className="flex mt-4 gap-4 flex-col w-full">
        <TestScriptEditor
          value={jsonTestScript}
          onChange={(value) => {
            handleJsonTestScriptChange(value);
          }}
        />
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setJsonTestScript('');
            }}
          >
            Clear
          </Button>
          <Button
            onClick={handleSubmitTest}
            disabled={!jsonTestScript || isGenerating}
            size="sm"
            className="h-7 text-xs"
          >
            {isGenerating ? 'Generating...' : 'Generate Test'}
          </Button>
        </div>
      </div>
      {results.length > 0 && (
        <div className="mt-6">
          <div className="mb-2">
            <h3 className="text-sm font-medium">Test Results</h3>
          </div>
          <div className="bg-muted/20 p-3 rounded-sm">
            {/* Results display */}
          </div>
        </div>
      )}
    </div>
  );
}
