"use client"
import { useEffect } from 'react';
import { Button } from '../ui/button';
import { TestTube, Code2, BookOpen, Github, Settings, FileText, Share2 } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import SideBar from './SideBar';
import { TestBuilder } from '@/core/testing/ui/TestBuilder';
import { FlowEditor } from '../FlowEditor';
import { PlaywrightBrowser } from '@/core/browser/ui/PlaywrightBrowser';
import { ThemeToggle } from "../ui/theme-toggle";
import { ModelSelector } from "../ui/model-selector";

// Import DOMNode interface and helper functions
import type { DOMNode } from '@/types/dom';
import { elementToDOMNode } from '@/types/dom';
import { isDOMNode, isDOMElement } from '@/core/dom/domUtils';

import { useProjectStore } from '@/store/projectStore';
import { useBrowserStore, type StatusType } from '@/store/browserStore';
import { useTestStore } from '../../store/testStore';

const ProjectViewer = () => {
  const {
    url,
    loadError,
    selectedNode,
    activeTab,
    setSelectedNode,
    setActiveTab,
    setDomTree,
    loadProject
  } = useProjectStore();

  const { status, setStatus } = useBrowserStore();
  const { addGeneratedTest, addTestScript } = useTestStore();

  // Get status indicator color based on status type
  const getStatusColor = (type: StatusType): string => {
    switch (type) {
      case 'success':
        return 'bg-green-400';
      case 'error':
        return 'bg-red-400';
      case 'loading':
        return 'bg-yellow-400 animate-pulse';
      default:
        return 'bg-slate-400';
    }
  };

  // Handle DOM tree updates from the browser component
  const handleDOMTreeUpdate = (newDomTree: DOMNode | null) => {
    console.log('[Arten] DOM tree received in ProjectViewer');
    setDomTree(newDomTree);
  };

  // Handle when a test is generated in TestBuilder
  const handleTestGenerated = (testScript: string) => {
    addTestScript(testScript);
    addGeneratedTest(testScript);
    setStatus('TEST_GENERATED', 'Test script generated successfully', 'success');
  };

  // Handle when a test should be run
  const handleRunTest = async (test: string) => {
    console.log('[Arten] Running test script:', test.substring(0, 100) + '...');
    setStatus('RUNNING_TEST', 'Executing test script...', 'loading');
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
                      onTestResultUpdate={(result) => {
                        console.log('[Arten] Test execution result:', result);
                      }}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="mx-0 bg-border hover:bg-primary/50 transition-colors" />

                {/* Right panel with tabs */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                  <div className="h-full flex flex-col bg-background">
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
                    {/* Tab navigation */}
                    <div className="bg-muted border-b border-border h-10 flex items-center px-3">
                      <div className="flex gap-2 h-full">
                        <button
                          onClick={() => setActiveTab('test')}
                          className={`px-3 h-full text-sm flex items-center border-b-2 ${activeTab === 'test' ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'
                            }`}
                        >
                          <TestTube className="h-4 w-4 mr-1.5" />
                          <span>Test Builder</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('flow')}
                          className={`px-3 h-full text-sm flex items-center border-b-2 ${activeTab === 'flow' ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'
                            }`}
                        >
                          <Share2 className="h-4 w-4 mr-1.5" />
                          <span>Flow Studio</span>
                        </button>
                      </div>
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-hidden">
                      {activeTab === 'test' && (
                        <div className="h-full overflow-auto px-2 pt-4 bg-background">
                          <TestBuilder
                            selectedNode={selectedNode}
                            onTestGenerated={handleTestGenerated}
                          />
                        </div>
                      )}
                      {activeTab === 'flow' && (
                        <div className="h-full overflow-auto bg-background">
                          <FlowEditor />
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
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status.type)}`} />
                  <span>{status.message}</span>
                </div>
                {url && (
                  <>
                    <span>•</span>
                    <span>URL: {url}</span>
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
