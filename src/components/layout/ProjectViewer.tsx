"use client"
import { Button } from '../ui/button';
import { TestTube, BookOpen, Github, Settings } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { TestBuilder } from '@/core/testing/ui/TestBuilder';
import { PlaywrightBrowser } from '@/core/browser/ui/PlaywrightBrowser';
import { ThemeToggle } from "../ui/theme-toggle";

// Import DOMNode interface
import type { DOMNode } from '@/types/dom';

import { useProjectStore } from '@/store/projectStore';
import { useBrowserStore, type StatusType } from '@/store/browserStore';
import { useTestStore } from '../../store/testStore';

const ProjectViewer = () => {
  const {
    url,
    loadError,
    selectedNode,
    setSelectedNode,
    setDomTree,
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
                {/* Tab navigation - removed Flow Studio tab */}
                <div className="bg-muted border-b border-border h-10 flex items-center px-3">
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
                  <div className="h-full overflow-auto px-2 pt-4 bg-background">
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

        {/* Status bar */}
        <div className="min-h-[28px] max-h-[120px] border-t border-border bg-primary text-[12px] text-primary-foreground flex items-center px-3 py-1">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(status.type)}`} />
              <span className="break-words leading-relaxed">{status.message}</span>
            </div>
            {url && (
              <>
                <span className="text-primary-foreground/60">•</span>
                <span className="text-primary-foreground/80 truncate max-w-xs" title={url}>URL: {url}</span>
              </>
            )}
            <span className="ml-auto text-primary-foreground/60 font-medium">Arten</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectViewer;
