"use client"
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { TestTube, Code2, BookOpen, Github, Settings } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import SideBar from './SideBar';
import { TestBuilder } from '@/core/testing/ui/TestBuilder';
import { FlowStudio } from '@/core/testing/ui/FlowStudio';
import { PlaywrightBrowser } from '@/core/browser/ui/PlaywrightBrowser';
import { ThemeToggle } from "../ui/theme-toggle";

// Import DOMNode interface and helper functions
import type { DOMNode } from '@/types/dom';
import { elementToDOMNode } from '@/types/dom';
import { isDOMNode, isDOMElement } from '@/core/dom/domUtils';

// Removed Zustand store imports in favor of local state

const ProjectViewer = () => {
  // Use local React state instead of Zustand store
  // Browser state
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // DOM state
  const [selectedNode, setSelectedNode] = useState<DOMNode | null>(null);
  
  // Local state for active tab
  const [activeTab, setActiveTab] = useState<string>('test'); // Start with Test Builder as active tab

  // Testing state
  const [generatedTestScript, setGeneratedTestScript] = useState<string>('');
  const [jsonTestScript, setJsonTestScript] = useState<string>('');

  const handleLoadProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadError(null);
    setSelectedNode(null); // Reset selected node

    try {
      // Prepare URL - handle all variations of localhost URLs
      const inputUrl = url || ''; // Handle null case
      let targetUrl = inputUrl;
      if (inputUrl.startsWith('localhost') || inputUrl.match(/^127\.0\.0\.1/) || inputUrl.match(/^(localhost|127\.0\.0\.1):\d+/)) {
        targetUrl = inputUrl.startsWith('http') ? inputUrl : `http://${inputUrl}`;
      }

      // Simply update the URL - SimpleBrowser will handle loading and script injection
      console.log('[Arten] Loading project:', targetUrl);
      setUrl(targetUrl);
      
      // The SimpleBrowser component will handle DOM analysis and update the DOM tree
    } catch (error) {
      console.error('Failed to load project:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle DOM tree updates from the browser component
  const handleDOMTreeUpdate = (domTree: DOMNode | null) => {
    console.log('[Arten] DOM tree received in ProjectViewer');
    setIsLoading(false);
    
    // When DOM is updated, make it available to the SideBar
    if (domTree) {
      // We'll still keep the event for backward compatibility
      // Eventually all components should read from the Zustand store
      window.dispatchEvent(new CustomEvent('arten:dom-tree-update', { detail: domTree }));
    }
  };

  // Listen for DOM tree updates from the browser component via custom events
  useEffect(() => {
    const handleDOMUpdatedEvent = (event: CustomEvent) => {
      console.log('[Arten] DOM updated event received in ProjectViewer', event.detail);
      if (event.detail?.domTree) {
        // Dispatch to SideBar if needed
        window.dispatchEvent(new CustomEvent('arten:dom-tree-update', { detail: event.detail.domTree }));
      }
    };

    // Add event listener for custom DOM updated event
    window.addEventListener('arten:dom-updated', handleDOMUpdatedEvent as EventListener);
    
    return () => {
      // Clean up event listener
      window.removeEventListener('arten:dom-updated', handleDOMUpdatedEvent as EventListener);
    };
  }, []);

  // Former local state, now managed in Zustand store:
  // const [generatedTestScript, setGeneratedTestScript] = useState<string>('');
  // const [browserTestScript, setBrowserTestScript] = useState<string>('');

  // Handle when a test is generated in TestBuilder
  const handleTestGenerated = (script: string) => {
    console.log('[Arten] Test script generated in TestBuilder:', script.substring(0, 100) + '...');
    
    // Update the test script in the Zustand store
    setGeneratedTestScript(script);
    
    // Dispatch a custom event to notify PlaywrightBrowser that a test script is available
    // Note: We can eventually remove this in favor of direct Zustand store access
    window.dispatchEvent(new CustomEvent('arten:test-script-generated', { 
      detail: { script } 
    }));
  };

  // Handle when a test should be run
  const handleRunTest = async (test: string) => {
    console.log('[Arten] Running test script:', test.substring(0, 100) + '...');
    // This gets called from TestBuilder when the Run Test button is clicked
  };

  // Handler for URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Error toast for URL loading errors */}
      {loadError && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-destructive/20 border border-destructive/30 text-destructive text-xs px-3 py-1.5 rounded-sm shadow-sm flex items-center gap-1.5">
            <span className="text-xs font-medium">Error:</span>
            <p>{loadError}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full">
        <div className="flex flex-1">
          {/* Left sidebar */}
          <div className="w-64 bg-muted/50 flex-shrink-0 overflow-hidden flex flex-col border-r border-border">
            
            <div className="flex-1 overflow-auto p-1">
              <SideBar onNodeSelect={(node) => {
                if (isDOMElement(node)) {
                  setSelectedNode(elementToDOMNode(node));
                } else if (isDOMNode(node)) {
                  setSelectedNode(node);
                }
              }} />
            </div>
          </div>
          
          {/* Main editor area */}
          <div className="flex flex-col flex-1 bg-background">
            
            {/* Main content with browser and panels */}
            <div className="flex-1">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Main browser panel */}
                <ResizablePanel defaultSize={70} minSize={50}>
                  <div className="h-full bg-background relative">
                    <PlaywrightBrowser 
                      initialUrl={url || ''} 
                      height="100%" 
                      width="100%"
                      onDOMTreeUpdate={handleDOMTreeUpdate}
                      onNodeSelect={(node) => {
                        console.log('[Arten] Node selected in browser:', node);
                        setSelectedNode(node);
                      }}
                      generatedTest={generatedTestScript}
                      onTestResultUpdate={(result) => {
                        console.log('[Arten] Test execution result:', result);
                      }}
                    />
                  </div>
                </ResizablePanel>
              
                <ResizableHandle withHandle className="mx-0 bg-border hover:bg-primary/50 transition-colors" />
              
                {/* Right panel with tabs */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                <nav className="flex items-center justify-end h-12 gap-1.5">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <BookOpen className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">Docs</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <Github className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">GitHub</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => window.location.href = '/settings'}
                    size="sm" 
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">Settings</span>
                  </Button>
                  <ThemeToggle />
                </nav>
                  <div className="h-full flex flex-col bg-background">
                    {/* Tab navigation */}
                    <div className="bg-muted border-b border-border h-10 flex items-center px-3">
                      <div className="flex gap-2 h-full">
                        <button 
                          onClick={() => setActiveTab('test')}
                          className={`px-3 h-full text-sm flex items-center border-b-2 ${
                            activeTab === 'test' ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'
                          }`}
                        >
                          <TestTube className="h-4 w-4 mr-1.5" />
                          <span>Test Builder</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('flow')}
                          className={`px-3 h-full text-sm flex items-center border-b-2 ${
                            activeTab === 'flow' ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'
                          }`}
                        >
                          <Code2 className="h-4 w-4 mr-1.5" />
                          <span>Flow Studio</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Tab content */}
                    <div className="flex-1 overflow-hidden relative">
                      {activeTab === 'test' && (
                        <div className="h-full overflow-auto px-2 pt-4 bg-background">
                          <TestBuilder
                            selectedNode={selectedNode}
                            onRunTest={handleRunTest}
                            onTestGenerated={handleTestGenerated}
                          />
                        </div>
                      )}
                      
                      {activeTab === 'flow' && (
                        <div className="h-full overflow-auto bg-background">
                          <div className="p-3 text-sm text-foreground font-mono">
                            <div className="text-green-500/80">[Flow Studio] Ready</div>
                            <div className="mt-2">
                              <FlowStudio
                                selectedNode={selectedNode}
                                onRunFlow={async (flow) => {
                                  console.log('[Arten] Flow execution requested:', flow);
                                  return Promise.resolve();
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
            
            {/* Status bar */}
            <div className="h-[22px] border-t border-border bg-primary text-[11px] text-primary-foreground flex items-center px-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  <span>Ready</span>
                </div>
                {url && (
                  <>
                    <span>•</span>
                    <span>Testing: {url}</span>
                  </>
                )}
                <span className="ml-auto">Arten</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectViewer;
