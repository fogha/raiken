"use client"
import { Button } from '../ui/button';
import { TestTube, BookOpen, Github, Settings } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { TestBuilder } from '@/core/testing/ui/TestBuilder';
import { PlaywrightBrowser } from '@/core/browser/ui/PlaywrightBrowser';
import { ThemeToggle } from "../ui/theme-toggle";
import { LocalBridgeStatus } from '../LocalBridgeStatus';
import { NotificationContainer } from '../NotificationContainer';

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

  // Determine if status bar should be shown
  const shouldShowStatus = (status: { action: SystemAction; message: string; type: StatusType }) => {
    // Hide status bar for idle states with empty or generic messages
    if (status.type === 'idle' && (
      status.message === '' || 
      status.message === 'Ready' || 
      status.action === 'IDLE'
    )) {
      return false;
    }
    
    // Hide for browser closed states unless there's an error
    if (status.action === 'BROWSER_CLOSED' && status.type !== 'error') {
      return false;
    }
    
    // Show for all other statuses (loading, success, error, info, meaningful idle)
    return true;
  };

  // Handle DOM tree updates from the browser component
  const handleDOMTreeUpdate = (newDomTree: DOMNode | null) => {
    console.log('[Raiken] DOM tree received in ProjectViewer');
    setDomTree(newDomTree);
  };

  // Handle when a test is generated in TestBuilder
  const handleTestGenerated = (testScript: string) => {
    addTestScript(testScript);
    addGeneratedTest(testScript);
    setStatus('TEST_GENERATED', 'Test script generated successfully', 'success');
    // Clear status after showing success briefly
    setTimeout(() => {
      const { clearStatus } = useBrowserStore.getState();
      clearStatus();
    }, 3000);
  };

  // Handle when a test should be run
  const handleRunTest = async (test: string) => {
    console.log('[Raiken] Running test script:', test.substring(0, 100) + '...');
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
                    console.log('[Raiken] Node selected in browser:', node);
                    setSelectedNode(node);
                  }}
                  onTestResultUpdate={(result) => {
                    console.log('[Raiken] Test execution result:', result);
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
                <div className="bg-muted border-b border-border h-10 flex items-center px-3 mt-[1px]">
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

        {/* Status bar - thin line for system status - only show when there's meaningful status */}
        {shouldShowStatus(status) && (
          <div className="h-[24px] border-t border-border bg-slate-800 text-[11px] text-slate-300 flex items-center px-3">
            <div className="flex items-center gap-3 w-full overflow-hidden">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(status.type)}`} />
                <span className="truncate font-mono">{status.message}</span>
              </div>
              {url && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 truncate max-w-xs font-mono text-[10px]" title={url}>{url}</span>
                </>
              )}
              <span className="ml-auto text-slate-500 font-medium text-[10px]">Raiken</span>
            </div>
          </div>
        )}
        
        {/* Local Bridge Status Manager - updates the status bar */}
        <LocalBridgeStatus />
        <NotificationContainer />
      </div>
    </div>
  );
};

export default ProjectViewer;
