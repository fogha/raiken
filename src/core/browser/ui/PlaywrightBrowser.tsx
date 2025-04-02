"use client";

import React, { useState, useEffect, useRef } from 'react';
import { JSONTree } from 'react-json-tree';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, Code2, Settings } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { TabbedTestEditor } from '@/core/testing/ui/TabbedTestEditor';
// Using local state only for browser, DOM, and testing functionality

interface PlaywrightBrowserProps {
  initialUrl?: string;
  height?: string | number;
  width?: string | number;
  onDOMTreeUpdate?: (domTree: DOMNode | null) => void;
  onNodeSelect?: (node: DOMNode) => void;
  onTestResultUpdate?: (result: any) => void;
  generatedTest?: string; // Add this prop to receive the generated test script
}

/**
 * A browser component that uses Playwright via API to capture and interact with web pages.
 * 
 * Features:
 * - DOM tree extraction and visualization
 * - Element highlighting in the browser
 * - Web page iframe preview
 * - Test script editor and execution
 * 
 * This component is used in the main Arten application to provide DOM exploration and testing capabilities.
 */
export const PlaywrightBrowser: React.FC<PlaywrightBrowserProps> = ({
  initialUrl = '',
  height = '100%',
  width = '100%',
  onDOMTreeUpdate,
  onNodeSelect,
  onTestResultUpdate,
  generatedTest: initialGeneratedTest = '' // Rename parameter to avoid collision
}) => {
  // Local React state instead of Zustand store
  // Browser state
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBrowserLaunched, setIsBrowserLaunched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // DOM state
  const [domTree, setDOMTree] = useState<DOMNode | null>(null);
  const [selectedElement, setSelectedElement] = useState<DOMNode | null>(null);
  
  // Testing state
  const [generatedTest, setGeneratedTest] = useState<string>(initialGeneratedTest || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any[]>([]);
  
  // Settings state
  const [globalConfig, setGlobalConfig] = useState<{
    headless: boolean;
    browserType: 'chromium' | 'firefox' | 'webkit';
  }>({
    headless: true,
    browserType: 'chromium'
  });
  
  // Helper function to reset browser state
  const resetBrowser = () => {
    setStoreUrl(null);
    setIsLoading(false);
    setIsBrowserLaunched(false);
    setError(null);
  };
  
  // Local state that doesn't need to be in the global store
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [showTestEditor, setShowTestEditor] = useState<boolean>(false);
  
  // Set URL from props initially if provided - only on first mount, not on re-renders
  useEffect(() => {
    if (initialUrl && initialUrl !== '') {
      // Important: Only set the store URL if it's not already set
      // This prevents circular updates between the store and component
      setStoreUrl(initialUrl);
      setInputUrl(initialUrl);
    }
  }, []); // Empty dependency array = only run on mount
  
  // Use the store URL or fallback to the initialUrl prop
  const url = storeUrl || initialUrl;

  // Add iframeRef for browser display
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle browser launch and cleanup
  // Listen for test script generation events
  useEffect(() => {
    const handleTestScriptGenerated = (event: CustomEvent) => {
      if (event.detail?.script) {
        console.log('[Arten] PlaywrightBrowser received test script event');
        setGeneratedTest(event.detail.script);
      }
    };
    
    // Add event listener for test script generation
    window.addEventListener('arten:test-script-generated', handleTestScriptGenerated as EventListener);
    
    return () => {
      // Clean up event listener
      window.removeEventListener('arten:test-script-generated', handleTestScriptGenerated as EventListener);
    };
  }, []);

  // Update local state when the prop changes - but only on first mount, not on re-renders
  useEffect(() => {
    if (initialGeneratedTest && initialGeneratedTest !== '') {
      console.log('[Arten] PlaywrightBrowser received initial test script via props');
      setGeneratedTest(initialGeneratedTest);
    }
  }, []); // Empty dependency array = only run on mount

  useEffect(() => {
    // Attempt to initialize browser on component mount, but only if not already launched
    const initBrowser = async () => {
      // Prevent multiple initializations
      if (isBrowserLaunched) {
        console.log('[Arten] Browser already launched, skipping initialization');
        return;
      }

      try {
        console.log('[Arten] Initializing browser on component mount...');
        const response = await fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize' })
        });
        
        const data = await response.json();
        if (data.success) {
          console.log('[Arten] Browser initialized successfully on mount');
          setIsBrowserLaunched(true);
        } else {
          console.error('[Arten] Browser initialization failed:', data.error);
        }
      } catch (error) {
        console.error('[Arten] Error initializing browser:', error);
      }
    };
    
    // Initialize browser on mount - with a small delay to prevent race conditions
    const timer = setTimeout(() => {
      initBrowser();
    }, 100);
    
    return () => clearTimeout(timer);
    
    // Clean up when component unmounts
    return () => {
      console.log('Component unmounting, closing browser...');
      if (isBrowserLaunched) {
        fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close' })
        })
        .then(() => console.log('Browser closed successfully'))
        .catch(error => console.error('Error closing browser:', error));
      }
    };
  }, []);

  // Launch browser and navigate to URL
  const handleLoadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    console.log('Loading URL:', inputUrl);
    
    try {
      // Browser initialization - always ensure it's ready
      console.log('Ensuring browser is initialized...');
      const initResponse = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });
      
      const initData = await initResponse.json();
      console.log('Initialize response:', initData);
      
      if (!initData.success) {
        console.error('Browser initialization failed:', initData.error);
        throw new Error(initData.error || 'Failed to initialize browser');
      }
      
      setIsBrowserLaunched(true);
      console.log('Browser initialized successfully');
      
      // Navigate to URL
      console.log('Navigating to URL:', inputUrl);
      const navResponse = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', url: inputUrl })
      });
      
      const navData = await navResponse.json();
      console.log('Navigation response:', navData);
      
      if (!navData.success) {
        console.error('Navigation failed:', navData.error);
        throw new Error(navData.error || 'Failed to navigate');
      }
      
      console.log('Navigation successful');
      setStoreUrl(inputUrl);
      
      // Extract DOM tree
      console.log('Extracting DOM tree...');
      await handleExtractDOM();
      
    } catch (err: any) {
      console.error('Error loading URL:', err);
      setError(err?.message || 'Failed to load URL');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Extract DOM from the current page
  const handleExtractDOM = async () => {
    // Browser will auto-initialize if not launched
    // So we don't need to prevent the action if not launched
    console.log('Extracting DOM, browser state:', isBrowserLaunched ? 'launched' : 'not launched');
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extractDOM' })
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract DOM');
      }
      
      setDOMTree(data.domTree);
      
      if (onDOMTreeUpdate) {
        onDOMTreeUpdate(data.domTree);
      }
      
      // Make the DOM available to the main project sidebar
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('arten:dom-updated', { detail: { domTree: data.domTree } }));
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error extracting DOM:', err);
      setError(err?.message || 'Failed to extract DOM');
    } finally {
      setIsLoading(false);
    }
  };

  // We now use the highlighting in the main project's sidebar
  // Just set the selected element locally for reference
  const handleNodeSelect = (node: DOMNode) => {
    console.log('Element selected:', node);
    setSelectedElement(node);
    
    // Pass the selected node to the parent component if needed
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };

  /**
   * Close a browser instance associated with a specific test script tab
   * @param tabId - The ID of the tab/script whose browser should be closed
   */
  const handleCloseTab = async (tabId: string) => {
    try {
      console.log(`[Arten] Closing browser for script ${tabId}`);
      // Send request to close the specific browser instance
      await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'close',
          scriptId: tabId
        })
      });
    } catch (error) {
      console.error(`[Arten] Error closing browser for script ${tabId}:`, error);
    }
  };

  /**
   * Execute a Playwright test script with a specific configuration
   * 
   * @param scriptContent - The content of the script to run
   * @param scriptId - Unique identifier for this script's browser instance
   * @param config - Browser configuration (headless mode, browser type)
   */
  const handleRunTest = async (
    scriptContent: string, 
    scriptId: string, 
    config: { headless: boolean; browserType: 'chromium' | 'firefox' | 'webkit' }
  ) => {
    console.log(`[Arten] Starting test execution for script ${scriptId}...`);
    
    // Validate test script exists
    if (!scriptContent || scriptContent.trim() === '') {
      console.log('[Arten] Error: No test script to run');
      setError('Please generate or input a Playwright test first');
      return;
    }

    // IMPORTANT: Create local variables to track state during execution
    // This ensures we only update state once at the end of the process
    const localIsRunning = true;
    const localTestResults: any[] = [];
    
    // Update UI state just once at the beginning
    setIsTestRunning(localIsRunning);
    setTestResult(localTestResults);
    setError(null);
    
    try {
      console.log(`[Arten] Sending test script to /api/browser endpoint for execution with config:`, config);
      
      // Send test script to API for execution with configuration
      const response = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'runTest', 
          script: scriptContent,
          scriptId: scriptId,
          config: {
            headless: config.headless,
            browserType: config.browserType
          }
        })
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
      }
      
      // Process API response
      const data = await response.json();
      
      // Handle API-level errors
      if (!data.success) {
        console.log('[Arten] Test execution failed:', data.error);
        throw new Error(data.error || 'Failed to run test');
      }
      
      // Handle successful test execution
      console.log('[Arten] Test execution successful, updating UI with results');
      // Store result in local variable first to avoid multiple store updates
      const finalResults = data.result;
      
      // Update state with final test results
      setTestResult(finalResults);
      
      // Notify parent component if callback provided
      if (onTestResultUpdate) {
        onTestResultUpdate(finalResults);
      }
    } catch (err: any) {
      // Handle and display errors
      console.error('[Arten] Error running test:', err);
      setError(err?.message || 'Failed to run test');
      // Set test result as an array with a single error result
      setTestResult([{ 
        success: false, 
        error: err?.message,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      // Always reset loading state when done
      setIsTestRunning(false);
    }
  };

  const toggleTestEditor = () => {
    setShowTestEditor(!showTestEditor);
  };

  // Generate Playwright test from DOM and selected element
  const handleGenerateTest = async () => {
    console.log('[Arten] Starting Playwright test generation from DOM...');
    console.log('[Arten] Current URL:', url);
    console.log('[Arten] Selected element:', selectedElement);
    
    // Use local variables to track state changes during function execution
    // This helps prevent excessive re-renders
    const isRunning = true;
    
    // Only update state once at the beginning
    setIsTestRunning(isRunning);
    setError(null);
    
    try {
      // Create a descriptive prompt for the page
      const pageName = url ? new URL(url).hostname : 'Current Page';
      console.log('[Arten] Generating test for page:', pageName);
      
      const prompt = {
        description: `Generate a test for ${pageName}`,
        target: url || 'https://example.com',
        additionalContext: 'Generate a complete, standalone Playwright test that can be executed without manual modifications.'
      };

      // Include the selected DOM node if available
      const node = selectedElement ? {
        selector: selectedElement.selector,
        attributes: selectedElement.attributes,
        innerText: selectedElement.innerText?.substring(0, 100) // Limit text length
      } : null;
      
      // Get any config options (like API keys) that might be needed
      const config = {
        api: {
          openaiKey: process.env.OPENAI_API_KEY // This will be overridden by server-side env if set
        },
        playwright: {
          timeout: 30000 // Default timeout
        }
      };
      
      console.log('Generating Playwright test with:', { prompt, hasNode: !!node });
      
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          node,
          domTree,
          config
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test script');
      }
      
      const playwrightScript = await response.text();
      setGeneratedTest(playwrightScript);
    } catch (error) {
      console.error('Test generation failed:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Card className="w-full h-full overflow-hidden rounded-none border-none flex flex-col" style={{ height, width }}>
        <CardContent className="flex-1 p-0 relative">
          {/* URL input and controls */}
          <div className="h-12">
            <form onSubmit={handleLoadUrl} className="flex gap-2 py-2 px-4">
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter URL (e.g., http://localhost:8000)"
                className="flex-1 h-8"
              />
              <Button type="submit" disabled={isLoading} className="whitespace-nowrap h-8">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Load URL'
                )}
              </Button>
            </form>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 flex" style={{ height: 'calc(100% - 73px)' }}>
            {error ? (
              <div className="p-4 text-destructive">{error}</div>
            ) : !isBrowserLaunched ? (
              <div className="flex items-center justify-center w-full p-4 text-center text-muted-foreground">
                Enter a URL to begin
              </div>
            ) : (
              <div className="w-full h-full">
                <Tabs defaultValue="browser" className="w-full h-full flex flex-col">
                  {/* Tab header */}
                  <div className="bg-muted h-10 flex items-center px-3 relative">
                    <TabsList className="flex gap-2 h-full border-0 bg-transparent p-0">
                      <TabsTrigger value="browser" className="shadow-none px-3 h-full text-sm flex items-center rounded-none border-b-0 data-[state=active]:border-b-[3px] data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=inactive]:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none hover:ring-0 data-[state=active]:bg-transparent relative z-10">
                        Web Page View
                      </TabsTrigger>
                      <TabsTrigger value="tests" className="shadow-none px-3 h-full text-sm flex items-center rounded-none border-b-0 data-[state=active]:border-b-[3px] data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=inactive]:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none hover:ring-0 data-[state=active]:bg-transparent relative z-10">
                        Test Scripts
                      </TabsTrigger>
                    </TabsList>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border"></div>
                  </div>

                  {/* Tab content panels */}
                  <TabsContent value="browser" className="flex-1 overflow-auto p-0">
                    {url ? (
                      <iframe 
                        ref={iframeRef} 
                        title="Playwright Browser" 
                        className="w-full h-full"
                        src={url}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        onLoad={() => {
                          console.log('Iframe loaded');
                          // Extract DOM after iframe loads to ensure we have the latest state
                          handleExtractDOM();
                        }}
                      />
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        Enter a URL in the field above to begin
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="tests" className="flex-1 overflow-auto p-6">
                    {/* TabbedTestEditor for multiple test scripts */}
                    <TabbedTestEditor
                      onRunTest={handleRunTest}
                      onCloseTab={handleCloseTab}
                      initialScript={generatedTest}
                      globalConfig={globalConfig}
                    />
                    
                    {testResult && testResult.length > 0 && (
                      <div className="h-64 border-t p-4 overflow-auto mt-6">
                        <h4 className="font-medium mb-2">Test Results</h4>
                        {testResult.map((result, index) => (
                          <div key={index} className={`p-3 rounded my-1 ${result.success ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'}`}>
                            {result.success ? (
                              <p>Test passed successfully!</p>
                            ) : (
                              <p>Test failed: {result.error || 'Unknown error'}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                
                {/* Test Configuration Panel removed - now on separate settings page */}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
