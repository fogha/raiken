"use client";

import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, TestTube, BookOpen, Github, Settings } from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { useProjectStore } from '@/store/projectStore';
import { useTestStore } from '@/store/testStore';
import { TestBuilder } from '@/core/testing/ui/TestBuilder';
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import Link from 'next/link';

interface TestsPageProps {
  children?: React.ReactNode;
}

const TestsPage: React.FC<TestsPageProps> = ({ children }) => {
  const {
    url,
    loadError,
    selectedNode,
    setSelectedNode,
    setDomTree,
  } = useProjectStore();

  const { addGeneratedTest, addTestScript } = useTestStore();

  // Local state for UI-only concerns
  const [inputUrl, setInputUrl] = React.useState<string>(url || '');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Handle DOM tree updates
  const handleDOMTreeUpdate = (newDomTree: DOMNode | null) => {
    console.log('[Raiken] DOM tree received in TestsPage');
    setDomTree(newDomTree);
  };

  // Handle when a test is generated in TestBuilder
  const handleTestGenerated = (testScript: string) => {
    addTestScript(testScript);
    addGeneratedTest(testScript);
  };

  // Extract DOM from the current page
  const handleExtractDOM = async () => {
    console.log('Extracting DOM...');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/v1/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract-dom' })
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract DOM');
      }
      
      handleDOMTreeUpdate(data.domTree);
      setError(null);
    } catch (err: any) {
      console.error('Error extracting DOM:', err);
      setError(err?.message || 'Failed to extract DOM');
    } finally {
      setIsLoading(false);
    }
  };

  // Load URL and extract DOM
  const handleLoadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    console.log('Loading URL:', inputUrl);
    
    try {
      // Navigate to URL
      console.log('Navigating to URL:', inputUrl);
      const navResponse = await fetch('/api/v1/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', url: inputUrl })
      });
      
      const navData = await navResponse.json();
      console.log('Navigation response:', navData);
      
      if (!navData.success) {
        throw new Error(navData.error || 'Failed to navigate to URL');
      }
      
      console.log('Navigation successful');

      // Extract DOM after navigation
      await handleExtractDOM();
      
    } catch (error) {
      console.error('Error during URL load:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Error toast for URL loading errors */}
      {loadError && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-destructive/20 border border-destructive/30 text-destructive text-xs px-3 py-1.5 rounded-sm shadow-sm flex items-center gap-1.5">
            <span className="text-xs font-medium">Error:</span>
            <p>{loadError}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full bg-background">
        {/* Main content with browser and panels */}
        <div className="flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Main browser panel */}
            <ResizablePanel defaultSize={70} minSize={50}>
              <div className="h-full bg-background relative">
                <Card className="w-full h-full overflow-hidden rounded-none border-none flex flex-col">
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
                        <Button type="submit" disabled={isLoading || !inputUrl.trim()} className="whitespace-nowrap h-8">
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
                      ) : (
                        <div className="w-full h-full">
                          <div className="w-full h-full flex flex-col">
                            {/* Tab header */}
                            <div className="bg-muted h-[64px] flex items-center px-3 relative">
                              <div className="flex gap-2 h-full border-0 bg-transparent p-0">
                                <Link href='/tests/editor' className="shadow-none px-3 h-full text-sm flex items-center rounded-none border-b-0 data-[state=active]:border-b-[3px] data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=inactive]:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none hover:ring-0 data-[state=active]:bg-transparent relative z-10">
                                  Test Editor
                                </Link>
                                <Link href='/tests/manager' className="shadow-none px-3 h-full text-sm flex items-center rounded-none border-b-0 data-[state=active]:border-b-[3px] data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=inactive]:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none hover:ring-0 data-[state=active]:bg-transparent relative z-10">
                                  Test Manager
                                </Link>
                                <Link href='/tests/reports' className="shadow-none px-3 h-full text-sm flex items-center rounded-none border-b-0 data-[state=active]:border-b-[3px] data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=inactive]:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none hover:ring-0 data-[state=active]:bg-transparent relative z-10">
                                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                                  Test Reports
                                </Link>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border"></div>
                            </div>

                            <div className="flex-1">
                              {children}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="mx-0 bg-border hover:bg-primary/50 transition-colors" />

            {/* Right panel with Test Builder */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
              <div className="h-full flex flex-col bg-background">
                <nav className="flex items-center justify-end h-12 gap-1.5">
                  <Link href="https://raiken-docs.vercel.app/" className="h-7 flex items-center px-2 text-muted-foreground hover:text-foreground">
                    <BookOpen className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">Docs</span>
                  </Link>
                  <Link href="https://github.com/fogha/raiken" className="h-7 px-2 flex items-center text-muted-foreground hover:text-foreground">
                    <Github className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">GitHub</span>
                  </Link>
                  <Link href="/settings" className="h-7 flex items-center px-2 text-muted-foreground hover:text-foreground">
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">Settings</span>
                  </Link>
                  <ThemeToggle />
                </nav>
                {/* Tab navigation */}
                <div className="bg-muted border-b border-border h-[64px] flex items-center px-3 mt-[1px]">
                  <div className="flex gap-2 h-full">
                    <button
                      className="px-3 h-full text-sm flex items-center border-b-2 border-primary font-medium"
                    >
                      <TestTube className="h-4 w-4 mr-1.5" />
                      <span>Test Builder</span>
                    </button>
                  </div>
                </div>

                {/* Tab content - only Test Builder */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-auto px-2 pt-4 bg-background space-y-4">
                    <TestBuilder
                      selectedNode={selectedNode}
                      onTestGenerated={handleTestGenerated}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

export default TestsPage;