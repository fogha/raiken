"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { TestScriptEditor } from './TestScriptEditor';
import { cn } from "@/lib/utils";
import { useTestStore } from '@/store/testStore';
import { useBrowserStore } from '@/store/browserStore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface TestBuilderProps {
  selectedNode: DOMNode | null;
  url?: string;
  onTestGenerated?: (script: string) => void;
}

export function TestBuilder({ selectedNode: propSelectedNode, url, onTestGenerated }: TestBuilderProps) {
  const {
    generatedTests,
    jsonTestScript,
    isGenerating,
    generationError,
    setJsonTestScript,
    generateTest
  } = useTestStore();

  const { setStatus } = useBrowserStore();

  // Local UI state
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update URL in prompt when it changes - but only on first mount
  useEffect(() => {
    if (url && typeof url === 'string') {
      console.log('[Arten] Setting initial JSON test script from URL');
      setJsonTestScript(url);
    }
  }, []); // Empty dependency array to ensure it only runs once on mount

  // Function to validate the JSON test script
  const validateTestScript = (script: string): boolean => {
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
      setValidationError('Invalid JSON format');
      return false;
    }
  };

  // Function to handle changes in the JSON test script editor
  const handleJsonTestScriptChange = (newScript: string) => {
    console.log('[Arten] JSON test script updated');
    setJsonTestScript(newScript);
    validateTestScript(newScript);
  };

  // Generate a test script using the JSON test script
  const handleSubmitTest = async () => {
    // Validate the test script before generating
    if (!validateTestScript(jsonTestScript)) {
      return;
    }

    setStatus('GENERATING_TEST', 'Generating test script...', 'loading');
    
    try {
      await generateTest();
      
      // Notify parent component that test was generated (for adding to tabbed editor)
      if (onTestGenerated && generatedTests.length > 0) {
        console.log('[Arten] Adding generated test to tabbed editor');
        const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
        let testName = `Generated Test ${timestamp}`;
        
        // Parse the JSON test script to get any custom name
        try {
          const testSpec = JSON.parse(jsonTestScript);
          if (testSpec.name) {
            testName = `${testSpec.name} ${timestamp}`;
          }
        } catch (e) {
          console.warn('[Arten] Could not parse JSON test script for name:', e);
        }
        
        // Use the most recently generated test
        onTestGenerated(generatedTests[generatedTests.length - 1]);
        
        // Switch to the Tests tab
        const testsTabTrigger = document.querySelector('[data-state="inactive"][value="tests"]') as HTMLButtonElement;
        if (testsTabTrigger) {
          testsTabTrigger.click();
        }
      }

      setStatus('TEST_GENERATED', 'Test script generated successfully', 'success');
    } catch (error) {
      setStatus('TEST_ERROR', `Test generation failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  return (
    <div className="max-w-full overflow-x-hidden">
      {/* Validation Error Alert */}
      {validationError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Generation Error Alert */}
      {generationError && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Generation Error</AlertTitle>
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}

      {/* Test Script Editor */}
      <div className="flex mt-4 gap-4 flex-col w-full">
        <TestScriptEditor
          value={jsonTestScript}
          onChange={handleJsonTestScriptChange}
          error={validationError !== null}
        />

        {/* Test Generation Controls */}
        <div className="flex gap-2 mt-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  onClick={handleSubmitTest}
                  disabled={isGenerating || validationError !== null}
                  className={cn(
                    "relative",
                    isGenerating && "cursor-not-allowed opacity-50"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Test'
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate a Playwright test from the JSON specification</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
