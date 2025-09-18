"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useBrowserStore } from '@/store/browserStore';
import { useTestStore } from '@/store/testStore';
import { useLocalBridge } from '@/hooks/useLocalBridge';
import { TestScriptConfig, TestTab as TypesTestTab } from '@/types/test';
import { TestScriptEditor } from './TestScriptEditor';
import { Play, Save, Loader2, Plus, FileText, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Define our own TestTab that uses the browserStore TestResult type
interface TestTab extends TypesTestTab {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'json';
  config: TestScriptConfig;
  isRunning?: boolean;
  error?: string;
}

export function TabbedTestEditor() {
  const {
    editorTabs,
    activeTabId,
    addEditorTab,
    updateEditorTab,
    removeEditorTab,
    setActiveTab,
  } = useBrowserStore();

  const { runTest, isTestRunning, loadTestFiles } = useTestStore();
  const { isConnected, saveTest } = useLocalBridge();
  const [savingTabs, setSavingTabs] = useState<Set<string>>(new Set());

  // Get the active tab data - safely handle null case
  const activeTab = activeTabId ? editorTabs.find(tab => tab.id === activeTabId) : null;

  // Handle tab operations
  const handleAddTab = () => {
    const _uuid = uuidv4();
    const newTab: TestTab = {
      id: _uuid,
      name: `New Test ${editorTabs.length + 1}`,
      content: '',
      language: 'typescript',
      config: {
        headless: true,
        browserType: 'chromium'
      }
    };
    addEditorTab(newTab);
  };

  // Handle saving a test
  const handleSaveTest = async (tab: TestTab) => {
    setSavingTabs(prev => new Set(prev).add(tab.id));
    
    try {
      // Try local bridge first if connected
      if (isConnected) {
        console.log('💾 Saving test via local bridge...');
        const result = await saveTest(tab.content, tab.name);

        if (result.success) {
          console.log('✅ Test saved successfully to:', result.path);
          // Refresh test files to show the new file
          await loadTestFiles();
          return;
        } else {
          console.warn('⚠️ Local bridge save failed, falling back to Raiken API:', result.error);
        }
      }
      
      // Fallback to Raiken API
      console.log('💾 Saving test via Raiken API...');
      const response = await fetch('/api/v1/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          filename: tab.name,
          content: tab.content,
          tabId: tab.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save test:', error.error);
      } else {
        const result = await response.json();
        console.log('Test saved successfully to:', result.filePath);
      }
    } catch (error) {
      console.error('Error saving test:', error);
    } finally {
      setSavingTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete(tab.id);
        return newSet;
      });
    }
  };

  // Helper function to get test path for a tab
  const getTestPath = (tab: TestTab): string => {
    // Preserve the original test name, just sanitize for filesystem
    const safeFileName = tab.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return isConnected 
      ? `${safeFileName}.spec.ts`  // Use original name without tab ID
      : `generated-tests/${safeFileName}.spec.ts`; // Full path for Raiken execution
  };

  // Handle running a test
  const handleRunTest = async (tab: TestTab) => {
    // First save the test, then run it
    await handleSaveTest(tab);
    
    const testPath = getTestPath(tab);
    
    console.log(`[Raiken] Running specific test: ${tab.name} (ID: ${tab.id})`);
    console.log(`[Raiken] Test file path: ${testPath} (bridge: ${isConnected ? 'connected' : 'disconnected'})`);
    await runTest(testPath);
  };

  // Show empty state when no tabs
  if (editorTabs.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with Save/Run buttons (disabled) */}
        <div className="flex items-center justify-between gap-2 p-2 bg-muted/30">
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAddTab}
                className="border h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={true}
              variant="outline"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button
              disabled={true}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Test
            </Button>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No tests open</h3>
              <p className="text-sm text-muted-foreground">Create your first test to get started</p>
            </div>
            <Button onClick={handleAddTab} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create First Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Permanent Save and Run buttons at the top */}
      <div className="flex items-center justify-between gap-2 p-2 bg-muted/30">
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-muted rounded-md p-1">
            {editorTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors
                  ${activeTabId === tab.id 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                  }
                `}
              >
                {tab.name}
                <span
                  className="ml-1 hover:bg-destructive/20 hover:text-destructive rounded-sm px-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEditorTab(tab.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </span>
              </button>
            ))}
            
            {/* + button right after the tabs */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddTab}
              className="ml-2 h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
        <Button
          onClick={() => activeTab && handleSaveTest(activeTab)}
          disabled={!activeTab || (activeTab && savingTabs.has(activeTab.id))}
          variant="outline"
          size="sm"
        >
          {activeTab && savingTabs.has(activeTab.id) ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
        <Button
          onClick={() => activeTab && handleRunTest(activeTab)}
          disabled={!activeTab || (activeTab && (savingTabs.has(activeTab.id) || isTestRunning(getTestPath(activeTab))))}
          size="sm"
        >
          {activeTab && isTestRunning(getTestPath(activeTab)) ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Test
        </Button>
        </div>
      </div>

      {/* Tab content area */}
      <div className="flex-1 overflow-hidden">
        {editorTabs.map(tab => (
          <div 
            key={tab.id} 
            className={`h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
          >
            <TestScriptEditor
              value={tab.content}
              onChange={(newContent) => updateEditorTab(tab.id, { content: newContent })}
              language={tab.language}
              hideHeader={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
