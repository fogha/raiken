"use client"

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestScriptEditor } from "./TestScriptEditor";
import { Plus, X, Play, MonitorPlay } from 'lucide-react';
// All test configuration has been moved to the settings page


// Configuration for each test script tab
interface TestScriptConfig {
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
}

// Test script tab data structure
interface TestTab {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'json';
  config: TestScriptConfig;
  isRunning?: boolean;
}

interface TabbedTestEditorProps {
  onRunTest: (scriptContent: string, scriptId: string, config: TestScriptConfig) => Promise<void>;
  onCloseTab?: (tabId: string) => Promise<void>;
  initialScript?: string;
  globalConfig: TestScriptConfig; // Configuration is now managed in the settings page
}

export function TabbedTestEditor({ onRunTest, onCloseTab, initialScript = '', globalConfig }: TabbedTestEditorProps) {
  const [tabs, setTabs] = useState<TestTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');

  
  // Initialize with a default tab if none exist
  useEffect(() => {
    if (tabs.length === 0) {
      const defaultTab: TestTab = {
        id: `tab_${Date.now()}`,
        name: 'Test Script 1',
        content: initialScript,
        language: 'typescript',
        config: globalConfig // Use the global configuration
      };
      
      setTabs([defaultTab]);
      setActiveTab(defaultTab.id);
    }
  }, [initialScript, tabs, globalConfig]);
  
  // Create a new empty tab
  const addNewTab = () => {
    const newTabNumber = tabs.length + 1;
    const newTab: TestTab = {
      id: `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `Test Script ${newTabNumber}`,
      content: '',
      language: 'typescript',
      config: globalConfig
    };
    
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
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
    
    // Remove the tab from state
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // If we're closing the active tab, activate another tab
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
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
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;
    
    // Mark the tab as running
    setTabs(tabs.map(tab => 
      tab.id === activeTab ? { ...tab, isRunning: true } : tab
    ));
    
    try {
      // Always use the global configuration instead of per-tab config
      await onRunTest(currentTab.content, currentTab.id, globalConfig);
    } catch (error) {
      console.error('Error running test:', error);
    } finally {
      // Mark the tab as no longer running
      setTabs(tabs.map(tab => 
        tab.id === activeTab ? { ...tab, isRunning: false } : tab
      ));
    }
  };
  
  // Get the active tab data
  const activeTabData = tabs.find(tab => tab.id === activeTab);
  
  return (
    <Card className="p-4 space-y-2 h-[calc(100vh-12rem)] flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <TabsList className="h-9 overflow-x-auto max-w-[calc(100%-120px)]">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-1 pr-1"
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
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={addNewTab}
              title="Add new test script"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
            
            {activeTabData && (
              <Button 
                onClick={runActiveTest} 
                size="sm"
                disabled={!activeTabData || activeTabData.isRunning}
                title="Run test script"
              >
                {globalConfig.headless ? (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Run Test
                  </>
                ) : (
                  <>
                    <MonitorPlay className="h-4 w-4 mr-1" />
                    Run Visual Test
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Tab content panels */}
        {tabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id} className="flex-1 mt-0">
            <TestScriptEditor
              value={tab.content}
              onChange={(newContent) => handleContentChange(tab.id, newContent)}
              language={tab.language}
            />
          </TabsContent>
        ))}
      </Tabs>

    </Card>
  );
}
