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


// Configuration for each test script tab
interface TestScriptConfig {
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
}

// Test result structure
interface TestResult {
  success: boolean;
  message: string;
  durationMs?: number;
  timestamp: string;
}

// Test script tab data structure
interface TestTab {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'json';
  config: TestScriptConfig;
  isRunning?: boolean;
  results?: TestResult[];
  error?: string;
}

interface TabbedTestEditorProps {
  onRunTest: (scriptContent: string, scriptId: string, config: TestScriptConfig) => Promise<void>;
  onCloseTab?: (tabId: string) => Promise<void>;
  initialScript?: string;
  globalConfig: TestScriptConfig; // Configuration is now managed in the settings page
  onRef?: (ref: { addNewTab: (content: string, name: string) => string }) => void; // Function to expose methods to parent
}

export function TabbedTestEditor({ onRunTest, onCloseTab, initialScript = '', globalConfig, onRef }: TabbedTestEditorProps) {
  // Local state instead of Zustand store
  const [tabs, setTabs] = useState<TestTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
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
        
        // Create the tab locally first
        const defaultTab: TestTab = {
          id: `tab_${Date.now()}`,
          name: 'Test Script 1',
          content: initialScript || '',
          language: 'typescript',
          config: {
            headless: effectiveGlobalConfig?.headless ?? true,
            browserType: effectiveGlobalConfig?.browserType ?? 'chromium'
          }
        };
        
        // Set the tabs and active tab ID locally, no store needed
        setTabs([defaultTab]);
        setActiveTabId(defaultTab.id);
      }
    }
    
    // Call the initialization function
    initializeDefaultTab();
  }, [initialScript, effectiveGlobalConfig, tabs]); // Dependencies that won't cause infinite loops
  
  // Register the addNewTab method with the parent component - only run when onRef changes
  useEffect(() => {
    if (onRef) {
      onRef({
        addNewTab: (content: string, name: string) => addNewTab(content, name)
      });
    }
    // We intentionally exclude addNewTab from dependencies to prevent infinite updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Initialize with global config but allow per-tab override
      config: {
        ...effectiveGlobalConfig,
        headless: effectiveGlobalConfig?.headless ?? true
      },
      results: []
    };
    
    // Update local state instead of using Zustand
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    
    return newTab.id; // Return the ID of the new tab
  };
  
  // Toggle headless mode for a specific tab
  const toggleHeadlessMode = (tabId: string) => {
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
      // Update the tabs array with the modified tab
      setTabs(tabs.map(t => 
        t.id === tabId ? {
          ...t,
          config: {
            ...t.config,
            headless: !t.config.headless
          }
        } : t
      ));
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
    
    // Remove the tab from local state
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // If we're closing the active tab, activate another tab
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };
  


  // Update tab content when editor changes
  const handleContentChange = (tabId: string, newContent: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, content: newContent } : tab
    ));
  };
  
  // All configuration is now handled in the settings page
  

  
  // Run the active test script
  const runActiveTest = async () => {
    if (!activeTabId) return; // Return early if no active tab
    
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab) return;
    
    // Mark the tab as running and clear previous results
    setTabs(tabs.map(tab => 
      tab.id === activeTabId ? {
        ...tab,
        isRunning: true,
        results: [],
        error: undefined
      } : tab
    ));
    
    // Show results panel if it's not already visible
    setShowResults(true);
    setIsRunning(true);
    
    try {
      // Use the per-tab configuration (each tab can have its own headless setting)
      await onRunTest(currentTab.content, currentTab.id, currentTab.config);
      
      // Fetch results from the API
      const response = await fetch('/api/results?testId=' + currentTab.id);
      if (response.ok) {
        const data = await response.json();
        
        // Update the tab with test results using local state
        setTabs(tabs.map(tab => 
          tab.id === activeTabId ? {
            ...tab,
            isRunning: false,
            results: data.results || [],
            error: data.error
          } : tab
        ));
        setIsRunning(false);
      } else {
        throw new Error('Failed to fetch test results');
      }
    } catch (error) {
      console.error('Error running test:', error);
      
      // Update the tab with the error
      setTabs(tabs.map(tab => 
        tab.id === activeTabId ? {
          ...tab,
          isRunning: false,
          error: error instanceof Error ? error.message : String(error)
        } : tab
      ));
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
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };
  
  return (
    <TooltipProvider>
      <Card className="space-y-2 border-transparent h-[calc(100vh-12rem)] flex flex-col">
        <Tabs value={activeTabId || ''} onValueChange={setActiveTabId} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <TabsList className="h-9 overflow-x-auto max-w-[calc(100%-180px)] bg-transparent p-0 ml-2 mt-2" style={{ marginBottom: '-1px' }}>
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-1 pr-1 rounded-t-md mr-1 py-1 px-3 data-[state=active]:bg-sky-600 data-[state=active]:text-white border border-border data-[state=inactive]:bg-gray-50 data-[state=inactive]:dark:bg-gray-900 shadow-none"
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
                    onClick={runActiveTest} 
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
                
                {tab.results && tab.results.map((result, index) => (
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
                        Duration: {formatDuration(result.durationMs)} • {formatTimestamp(result.timestamp)}
                      </div>
                    </div>
                    <p className="text-sm mt-1">{result.message}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
    </TooltipProvider>
  );
}
