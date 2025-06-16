"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, Code2, Settings, FileText } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { TabbedTestEditor } from '@/core/testing/ui/TabbedTestEditor';
import { TestReports } from '@/core/testing/ui/TestReports';
import { TestManager } from '@/components/TestManager';
import { SystemAction, useBrowserStore, type StatusType } from '@/store/browserStore';

interface PlaywrightBrowserProps {
  initialUrl?: string;
  height?: string | number;
  width?: string | number;
  onDOMTreeUpdate?: (domTree: DOMNode | null) => void;
  onNodeSelect?: (node: DOMNode) => void;
  onTestResultUpdate?: (result: any) => void;
  generatedTest?: string;
}

export const PlaywrightBrowser: React.FC<PlaywrightBrowserProps> = ({
  initialUrl = '',
  height = '100%',
  width = '100%',
  onDOMTreeUpdate,
  onNodeSelect,
  onTestResultUpdate,
  generatedTest: initialGeneratedTest = ''
}) => {
  // Use browser store instead of local state
  const {
    url: storeUrl,
    isLoading,
    setUrl,
    setLoading,
    isLaunched,
    setLaunched,
    status,
    editorTabs,
    activeTabId,
    addEditorTab,
    updateEditorTab,
    setStatus
  } = useBrowserStore();

  // Local state for UI-only concerns
  const [inputUrl, setInputUrl] = React.useState<string>(initialUrl);
  const [error, setError] = React.useState<string | null>(null);
  const [generatedTest, setGeneratedTest] = React.useState<string>(initialGeneratedTest);
  const [selectedElement, setSelectedElement] = React.useState<DOMNode | null>(null);
  const [domTree, setDomTree] = React.useState<DOMNode | null>(null);
  const [editorRef, setEditorRef] = React.useState<{ addNewTab: (content: string, name: string) => string } | null>(null);

  // Use the store URL or fallback to the initialUrl prop
  const currentUrl = storeUrl || initialUrl;

  // Add iframeRef for browser display
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Effect to handle changes to generatedTest prop
  useEffect(() => {
    if (initialGeneratedTest && activeTabId) {
      // If we have an active tab, update its content instead of creating a new one
      updateEditorTab(activeTabId, { content: initialGeneratedTest });
      return;
    }

    if (initialGeneratedTest && (!editorTabs.some(tab => tab.content === initialGeneratedTest))) {
      console.log('[Arten] Adding new tab with generated test');
      const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
      const testName = `Generated Test ${timestamp}`;
      
      // Add new tab with the generated test
      const newTab = {
        id: `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: testName,
        content: initialGeneratedTest,
        language: 'typescript' as const,
        config: {
          headless: true,
          browserType: 'chromium' as const
        }
      };
      
      addEditorTab(newTab);
      console.log('[Arten] Created new tab:', newTab.id);

      // Switch to the Tests tab and wait for it to be available
      setTimeout(() => {
        const testsTabTrigger = document.querySelector('[data-state="inactive"][value="tests"]') as HTMLButtonElement;
        if (testsTabTrigger) {
          console.log('[Arten] Switching to Tests tab');
          testsTabTrigger.click();
        }
      }, 100);
    }
  }, [editorTabs, addEditorTab]);

  // Handle browser launch and cleanup
  useEffect(() => {
    // Attempt to initialize browser on component mount, but only if not already launched
    const initBrowser = async () => {
      if (isLaunched) {
        console.log('[Arten] Browser already launched, skipping initialization');
        return;
      }

      try {
        console.log('[Arten] Initializing browser on component mount...');
        setStatus('BROWSER_INITIALIZING' as SystemAction, 'Initializing browser...');
        const response = await fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize' })
        });
        
        const data = await response.json();
        if (data.success) {
          console.log('[Arten] Browser initialized successfully on mount');
          setLaunched(true);
          setStatus('BROWSER_READY' as SystemAction, 'Browser ready', 'success');
        } else {
          console.error('[Arten] Browser initialization failed:', data.error);
          setStatus('BROWSER_ERROR' as SystemAction, `Browser initialization failed: ${data.error}`, 'error');
        }
      } catch (error) {
        console.error('[Arten] Browser initialization error:', error);
        setStatus('BROWSER_ERROR' as SystemAction, `Browser initialization error: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    };

    initBrowser();

    // Cleanup function to close browser when component unmounts
    return () => {
      if (isLaunched) {
        console.log('[Arten] Closing browser on component unmount...');
        setStatus('BROWSER_CLOSING' as SystemAction, 'Closing browser...');
        fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close' })
        }).then(() => {
          setLaunched(false);
          setStatus('BROWSER_CLOSED' as SystemAction, 'Browser closed', 'success');
        }).catch(error => {
          console.error('Error closing browser:', error);
          setStatus('BROWSER_ERROR' as SystemAction, 'Failed to close browser', 'error');
        });
      }
    };
  }, []);

  // Launch browser and navigate to URL
  const handleLoadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    console.log('Loading URL:', inputUrl);
    
    try {
      // Browser initialization - always ensure it's ready
      console.log('Ensuring browser is initialized...');
      setStatus('BROWSER_INITIALIZING' as SystemAction, 'Initializing browser...');
      const initResponse = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });
      
      const initData = await initResponse.json();
      console.log('Initialize response:', initData);
      
      if (!initData.success) {
        console.error('Browser initialization failed:', initData.error);
        setStatus('BROWSER_ERROR' as SystemAction, `Browser initialization failed: ${initData.error}`, 'error');
        throw new Error(initData.error || 'Failed to initialize browser');
      }
      
      setLaunched(true);
      setStatus('BROWSER_READY' as SystemAction, 'Browser ready', 'success');
      console.log('Browser initialized successfully');
      
      // Navigate to URL
      console.log('Navigating to URL:', inputUrl);
      setStatus('NAVIGATING' as SystemAction, `Navigating to ${inputUrl}...`);
      const navResponse = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', url: inputUrl })
      });
      
      const navData = await navResponse.json();
      console.log('Navigation response:', navData);
      
      if (!navData.success) {
        console.error('Navigation failed:', navData.error);
        setStatus('NAVIGATION_ERROR' as SystemAction, `Navigation failed: ${navData.error}`, 'error');
        throw new Error(navData.error || 'Failed to navigate to URL');
      }
      
      setUrl(inputUrl);
      setStatus('NAVIGATION_SUCCESS' as SystemAction, `Navigated to ${inputUrl}`, 'success');
      console.log('Navigation successful');
    } catch (error) {
      console.error('Error during URL load:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      setStatus('BROWSER_ERROR' as SystemAction, `Error: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Extract DOM from the current page
  const handleExtractDOM = async () => {
    console.log('Extracting DOM, browser state:', isLaunched ? 'launched' : 'not launched');
    setLoading(true);
    setStatus('EXTRACTING_DOM' as SystemAction, 'Extracting DOM tree...');
    
    try {
      const response = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extractDOM' })
      });
      
      const data = await response.json();
      if (!data.success) {
        setStatus('DOM_ERROR' as SystemAction, 'Failed to extract DOM', 'error');
        throw new Error(data.error || 'Failed to extract DOM');
      }
      
      setDomTree(data.domTree);
      setStatus('DOM_UPDATED' as SystemAction, 'DOM tree updated', 'success');
      
      if (onDOMTreeUpdate) {
        onDOMTreeUpdate(data.domTree);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error extracting DOM:', err);
      setError(err?.message || 'Failed to extract DOM');
      setStatus('DOM_ERROR' as SystemAction, `Failed to extract DOM: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle node selection
  const handleNodeSelect = (node: DOMNode) => {
    console.log('Element selected:', node);
    setSelectedElement(node);
    setStatus('ELEMENT_SELECTED' as SystemAction, `Selected element: ${node.tagName}`, 'success');
    
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };

  // Handle browser actions
  const handleBrowserAction = async (action: string) => {
    // ... existing browser action handling ...
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
            ) : !isLaunched ? (
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
                        Test Editor
                      </TabsTrigger>
                      <TabsTrigger value="manager" className="shadow-none px-3 h-full text-sm flex items-center rounded-none border-b-0 data-[state=active]:border-b-[3px] data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=inactive]:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none hover:ring-0 data-[state=active]:bg-transparent relative z-10">
                        Test Manager
                      </TabsTrigger>
                      <TabsTrigger value="reports" className="shadow-none px-3 h-full text-sm flex items-center rounded-none border-b-0 data-[state=active]:border-b-[3px] data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=inactive]:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none hover:ring-0 data-[state=active]:bg-transparent relative z-10">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Test Reports
                      </TabsTrigger>
                    </TabsList>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border"></div>
                  </div>

                  {/* Tab content panels */}
                  <TabsContent value="browser" className="flex-1 overflow-auto p-0">
                    {currentUrl ? (
                      <iframe 
                        ref={iframeRef} 
                        title="Playwright Browser" 
                        className="w-full h-full"
                        src={currentUrl}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        onLoad={() => {
                          console.log('Iframe loaded');
                          handleExtractDOM();
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="w-16 h-16 mb-6 text-muted-foreground/30">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-10 h-10"
                          >
                            <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                            <path d="M7 7h.01" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium mb-2">No URL Entered</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-4">
                          Enter a URL in the field above to start browsing and testing your web application.
                        </p>
                        <div className="text-xs text-muted-foreground/60">
                          Example: http://localhost:3000
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="tests" className="flex-1 overflow-auto p-6">
                    <TabbedTestEditor />
                  </TabsContent>

                  <TabsContent value="manager" className="flex-1 overflow-auto p-6">
                    <TestManager />
                  </TabsContent>

                  <TabsContent value="reports" className="flex-1 overflow-auto p-6">
                    <TestReports />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaywrightBrowser;
