"use client"
import { useState, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2, Layout, TestTube, Share2 } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import SideBar from './SideBar';
import { TestBuilder } from '@/core/testing/ui/TestBuilder';
import { FlowStudio } from '@/core/testing/ui/FlowStudio';
import { PlaywrightBrowser } from '@/core/browser/ui/PlaywrightBrowser';
import { TopBar } from './TopBar';

// Import DOMNode interface and helper functions
import type { DOMNode } from '@/types/dom';
import { elementToDOMNode } from '@/types/dom';
import { isDOMNode, isDOMElement } from '@/core/dom/domUtils';

const ProjectViewer = () => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<DOMNode | null>(null);

  const handleLoadProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadError(null);
    setSelectedNode(null); // Reset selected node

    try {
      // Prepare URL - handle all variations of localhost URLs
      let targetUrl = url;
      if (url.startsWith('localhost') || url.match(/^127\.0\.0\.1/) || url.match(/^(localhost|127\.0\.0\.1):\d+/)) {
        targetUrl = url.startsWith('http') ? url : `http://${url}`;
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
      // Dispatch a custom event for other components (like SideBar) to listen to
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

  // State to store the generated test script to pass between components
  const [generatedTestScript, setGeneratedTestScript] = useState<string>('');

  // Handle when a test is generated in TestBuilder
  const handleTestGenerated = (script: string) => {
    console.log('[Arten] Test script generated in TestBuilder:', script.substring(0, 100) + '...');
    setGeneratedTestScript(script);
    
    // Dispatch a custom event to notify PlaywrightBrowser that a test script is available
    window.dispatchEvent(new CustomEvent('arten:test-script-generated', { 
      detail: { script } 
    }));
  };

  // Handle when a test should be run
  const handleRunTest = async (test: string) => {
    console.log('[Arten] Running test script:', test.substring(0, 100) + '...');
    // This gets called from TestBuilder when the Run Test button is clicked
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SideBar onNodeSelect={(node) => {
          // Handle both Element and DOMNode types
          if (isDOMElement(node)) {
            // It's a DOM Element, convert it to DOMNode
            setSelectedNode(elementToDOMNode(node));
          } else if (isDOMNode(node)) {
            // It's already a DOMNode
            setSelectedNode(node);
          }
        }} />
      <div className="flex flex-col flex-1">
        <TopBar isLoading={isLoading} />
        <div className="flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <PlaywrightBrowser 
                initialUrl={url} 
                height="100%" 
                width="100%"
                onDOMTreeUpdate={handleDOMTreeUpdate}
                onNodeSelect={(node) => {
                  // Handle node selection from browser component
                  console.log('[Arten] Node selected in browser:', node);
                  setSelectedNode(node);
                }}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-hidden">
                <Tabs defaultValue="test" className="h-full flex flex-col">
                  <div className="border-b px-4 py-2">
                    <TabsList>
                      <TabsTrigger value="test" className="gap-2">
                        <TestTube className="h-4 w-4" />
                        Test Builder
                      </TabsTrigger>
                      <TabsTrigger value="flow" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Flow Studio
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    <TabsContent value="test" className="absolute inset-0 overflow-auto m-0 p-0 data-[state=active]:flex flex-col">
                      <div className="flex-1 overflow-auto p-4">
                        <TestBuilder
                          selectedNode={selectedNode}
                          onRunTest={handleRunTest}
                          // New prop to handle when a test is generated
                          onTestGenerated={handleTestGenerated}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="flow" className="absolute inset-0 overflow-auto m-0 p-0 data-[state=active]:flex flex-col">
                      <div className="flex-1 overflow-auto p-4">
                        <FlowStudio
                          selectedNode={selectedNode}
                          onRunFlow={async (flow) => {
                            // Convert TestFlow to string or handle appropriately
                            console.log('[Arten] Flow execution requested:', flow);
                            // Return a promise to satisfy the type requirement
                            return Promise.resolve();
                          }}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

export default ProjectViewer;
