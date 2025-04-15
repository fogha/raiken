"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestScriptEditor } from "./TestScriptEditor";
import { Plus, X, Play, MonitorPlay, EyeOff, Eye, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useBrowserStore } from '@/store/browserStore';
import { TestScriptConfig, TestResult, TestTab, TabbedTestEditorProps } from '@/types/test';


export function TabbedTestEditor({ onRunTest, onCloseTab, initialScript = '', globalConfig, onRef }: TabbedTestEditorProps) {
  // Use browser store for state management
  const {
    editorTabs: tabs,
    activeTabId,
    setEditorTabs,
    setActiveTabId,
    addEditorTab,
    updateEditorTab,
    removeEditorTab
  } = useBrowserStore();

  const [showResults, setShowResults] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  // Use the provided global config directly
  const effectiveGlobalConfig = globalConfig;
  
  // Use a ref to track whether we've initialized tabs - this must be at the top level
  const hasInitializedRef = useRef(false);
  
  // Initialize with a default tab if none exist - only run once on mount
  useEffect(() => {
    // Create a local initialization function to avoid race conditions
    function initializeDefaultTab() {
      // Only proceed if we haven't initialized yet and there are no tabs
      if (tabs.length === 0 && !hasInitializedRef.current) {
        console.log('[Arten] Creating default tab in TabbedTestEditor');
        hasInitializedRef.current = true;
        
        // Create the tab
        const defaultTab: TestTab = {
          id: `tab_${Date.now()}`,
          name: 'Test Script 1',
          content: '',
          language: 'typescript',
          config: {
            headless: effectiveGlobalConfig?.headless ?? true,
            browserType: effectiveGlobalConfig?.browserType ?? 'chromium'
          }
        };
        
        // Add the tab to the store
        addEditorTab(defaultTab);
      }
    }
    
    // Call the initialization function
    initializeDefaultTab();
  }, [effectiveGlobalConfig, tabs, addEditorTab]);

  useEffect(() => {
    // Skip if no initialScript or if we're still initializing
    if (!initialScript || !hasInitializedRef.current) return;
    
    // Check if the last tab is empty
    const lastTab = tabs[tabs.length - 1];
    const isLastTabEmpty = lastTab && (!lastTab.content || lastTab.content.trim() === '');
    
    if (isLastTabEmpty) {
      // If the last tab is empty, update it with the initialScript
      console.log('[Arten] Updating empty last tab with initialScript');
      updateEditorTab(lastTab.id, { content: initialScript });
      // Set this tab as active
      setActiveTabId(lastTab.id);
    } 
    // If the last tab is not empty and we don't already have this content, create a new tab
    else if (!tabs.some(tab => tab.content === initialScript)) {
      console.log('[Arten] Adding new tab with initialScript');
      addNewTab(initialScript, 'Generated Test');
    }
  }, [initialScript, tabs, setActiveTabId, updateEditorTab, hasInitializedRef.current]);
  
  // Register the addNewTab method with the parent component
  useEffect(() => {
    if (onRef) {
      onRef({
        addNewTab: (content: string, name: string) => addNewTab(content, name)
      });
    }
  }, [onRef]);
  
  // Create a new empty tab
  const addNewTab = (content: string = '', name: string = '') => {
    const newTabNumber = tabs.length + 1;
    const tabName = name || `Test Script ${newTabNumber}`;
    
    const newTab: TestTab = {
      id: `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: tabName,
      content: content,
      language: 'typescript',
      config: {
        ...effectiveGlobalConfig,
        headless: effectiveGlobalConfig?.headless ?? true
      },
      results: []
    };
    
    // Add the tab to the store
    addEditorTab(newTab);
    
    return newTab.id;
  };
  
  // Toggle headless mode for a specific tab
  const toggleHeadlessMode = (tabId: string) => {
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
      updateEditorTab(tabId, {
        config: {
          ...tab.config,
          headless: !tab.config.headless
        }
      });
    }
  };
  
  // Close a tab and its associated browser
  const closeTab = async (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Don't allow closing the last tab
    if (tabs.length <= 1) return;
    
    // Call the onCloseTab callback to clean up browser resources
    if (onCloseTab) {
      await onCloseTab(tabId);
    }
    
    // Remove the tab from the store
    removeEditorTab(tabId);
  };

  // Update tab content when editor changes
  const handleContentChange = (tabId: string, newContent: string) => {
    updateEditorTab(tabId, { content: newContent });
  };
  
  // Run the active test script
  const runTest = async () => {
    if (!activeTabId || isRunning) return;
    
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;
    
    try {
      setIsRunning(true);
      
      // Mark the tab as running and clear previous results
      updateEditorTab(activeTabId, {
        isRunning: true,
        results: [],
        error: undefined
      });
      
      // Show results panel if it's not already visible
      setShowResults(true);
      
      // Run the test
      if (onRunTest) {
        await onRunTest(activeTab.content, activeTab.id, activeTab.config);
        
        // Update the tab with test results from the store
        updateEditorTab(activeTabId, {
          isRunning: false,
          results: [],  // Results will be updated by the parent component through the store
          error: undefined
        });
      }
    } catch (error) {
      console.error('Error running test:', error);
      
      // Update the tab with the error
      updateEditorTab(activeTabId, {
        isRunning: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsRunning(false);
    }
  };
  
  // Get the active tab data - safely handle null case
  const activeTabData = activeTabId ? tabs.find(tab => tab.id === activeTabId) : undefined;
  
  // Format test duration to a readable string
  const formatDuration = (ms?: number): string => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  // Format timestamp to a readable string
  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return '--';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '--';
      return date.toLocaleTimeString();
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return '--';
    }
  };
  
  return (
    <TooltipProvider>
      <Card className="space-y-2 border-transparent h-[calc(100vh-12rem)] flex flex-col">
        <Tabs value={activeTabId || ''} onValueChange={setActiveTabId} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <TabsList className="h-9 overflow-x-auto max-w-[calc(100%-180px)] bg-transparent p-0 ml-2 mb-2">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-1 pr-1 mb-2 rounded-t-md mr-1 py-1 px-3 data-[state=active]:bg-sky-600 data-[state=active]:text-white border border-border data-[state=inactive]:bg-gray-50 data-[state=inactive]:dark:bg-gray-900 shadow-none"
              >
                <span className="truncate max-w-[150px]">{tab.name}</span>
                {tabs.length > 1 && (
                  <X 
                    className="h-3.5 w-3.5 ml-1 p-0.5 rounded-full hover:bg-muted" 
                    onClick={(e) => closeTab(tab.id, e)}
                  />
                )}
                {tab.isRunning && <span className="ml-1 animate-pulse">•</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="flex gap-2 items-center">
            {/* Headless Mode Toggle */}
            {activeTabData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => activeTabId && toggleHeadlessMode(activeTabId)}
                    className="h-8 w-8"
                  >
                    {activeTabData.config.headless ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {activeTabData.config.headless ? "Headless Mode (On)" : "Visual Mode (Headless Off)"}
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => addNewTab()}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Add new test script
              </TooltipContent>
            </Tooltip>
            
            {activeTabData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={runTest} 
                    variant="default"
                    size="icon"
                    disabled={!activeTabData || activeTabData.isRunning}
                    className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {activeTabData.isRunning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : activeTabData.config.headless ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <MonitorPlay className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {activeTabData.isRunning ? "Running..." : 
                   activeTabData.config.headless ? "Run Headless Test" : "Run Visual Test"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        {/* Tab content panels */}
        {tabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id} className="flex-1 mt-0 flex flex-col">
            {/* Test script editor */}
            <div className={`flex-1 overflow-hidden ${showResults && (tab.results?.length || tab.error) ? 'h-[60%]' : 'h-full'}`}>
              <TestScriptEditor
                value={tab.content}
                onChange={(newContent) => handleContentChange(tab.id, newContent)}
                language={tab.language}
              />
            </div>

            {/* Test Results Panel */}
            {showResults && (tab.results?.length || tab.error) && (
              <div className="border-t mt-2 pt-2 h-[40%] overflow-auto">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-sm">Test Results</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResults(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {tab.error && (
                  <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Error running test</p>
                        <p className="text-sm mt-1">{tab.error}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {tab.results && tab.results.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {tab.results.map((result, index) => (
                      <div 
                        key={index} 
                        className={`mb-2 p-3 border rounded-md ${
                          result.success 
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )}
                            <span className="font-medium">{result.success ? 'Success' : 'Failed'}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.timestamp && `Timestamp: ${formatTimestamp(result.timestamp)}`}
                          </div>
                        </div>
                        <p className="text-sm mt-1">{result.error || result.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
    </TooltipProvider>
  );
}
