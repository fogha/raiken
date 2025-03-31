"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { TestScriptEditor } from './TestScriptEditor';
import { cn } from "@/core/common/utils";
import { ConfigurationPanel } from '@/components/ConfigurationPanel';

interface TestBuilderProps {
  selectedNode: DOMNode | null;
  url?: string;
  onRunTest?: (script: string) => void;
  onTestGenerated?: (script: string) => void; // Add prop for notifying when a test is generated
}

export function TestBuilder({ selectedNode, url, onRunTest, onTestGenerated }: TestBuilderProps) {
  const [testScript, setTestScript] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [jsonTestScript, setJsonTestScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Update URL in prompt when it changes
  useEffect(() => {
    if (url) {
      setJsonTestScript(url);
    }
  }, [url]);

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
          jsonTestScript
        }),
      });
      
      console.log('[Arten] API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('[Arten] API error response:', errorData);
        throw new Error(errorData.error || 'Failed to generate test script');
      }
      
      const generatedScript = await response.text();
      console.log('[Arten] Generated script received, length:', generatedScript.length);
      console.log('[Arten] Generated script preview:', generatedScript.substring(0, 100) + '...');
      
      setTestScript(generatedScript);
      
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
      <Card className="mb-4 border-none w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className=''>Generate Test Script</CardTitle>
          <Button
            onClick={handleSubmitTest}
            disabled={isGenerating || !jsonTestScript}
            title="Generate test script"
          >
            {isGenerating ? 'Generating...' : 'Generate Test'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[calc(100vh-250px)] bg-muted/50 rounded-md overflow-auto">
            <TestScriptEditor
              value={jsonTestScript}
              onChange={(value) => {
                handleJsonTestScriptChange(value);
              }}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setJsonTestScript('');
              }}
            >
              Clear
            </Button>
            <Button
              onClick={handleSubmitTest}
              disabled={!jsonTestScript || isGenerating}
              title="Generate test script"
            >
              {isGenerating ? 'Generating...' : 'Generate Test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Results display */}
          </CardContent>
        </Card>
      )}


    </div>
  );
}
