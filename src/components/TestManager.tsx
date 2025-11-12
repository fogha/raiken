"use client"

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/store/editorStore';
import { useLocalBridge } from '@/hooks/useLocalBridge';
import { useTestFiles } from '@/hooks/useTestFiles';
import { useExecuteTest } from '@/hooks/useExecuteTest';
import { Loader2, Play, RefreshCw, Edit, Trash2, CheckCircle, WifiOff, AlertTriangle } from 'lucide-react';

interface TestFile {
  name: string;
  path: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
}

export function TestManager() {
  const router = useRouter();
  const { addEditorTab, editorTabs, setActiveTab } = useEditorStore();
  const { isConnected, connection } = useLocalBridge();
  const { testFiles, isLoading, error, refetch, deleteTest } = useTestFiles();
  const { executeTest, isExecuting } = useExecuteTest();
  const [executingTests, setExecutingTests] = useState<Set<string>>(new Set());

  const handleRunTest = useCallback(async (testPath: string) => {
    setExecutingTests(prev => new Set(prev).add(testPath));
    executeTest({ testPath }, {
      onSettled: () => {
        setExecutingTests(prev => {
          const newSet = new Set(prev);
          newSet.delete(testPath);
          return newSet;
        });
      }
    });
  }, [executeTest]);

  const handleDeleteTest = useCallback(async (testPath: string) => {
    if (confirm(`Are you sure you want to delete ${testPath}?`)) {
      deleteTest(testPath);
    }
  }, [deleteTest]);

  const handleOpenTest = useCallback((file: TestFile) => {
    // Check if file is already open
    const existingTab = editorTabs.find(tab => tab.name === file.name && tab.content === file.content);
    
    if (existingTab) {
      // File already open, just switch to it
      setActiveTab(existingTab.id);
    } else {
      // File not open, create new tab
      const newTab = {
        id: `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: file.name,
        content: file.content,
        language: 'typescript' as const,
        config: {
          headless: true,
          browserType: 'chromium' as const
        }
      };
      addEditorTab(newTab);
    }
    
    router.push('/tests/editor');
  }, [addEditorTab, setActiveTab, editorTabs, router]);

  const TestFileItem = ({ file }: { file: TestFile }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{file.name}</h4>
          <Badge variant="outline" className="text-xs">
            {file.path}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Modified: {new Date(file.modifiedAt).toLocaleDateString()}
        </p>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenTest(file)}
          disabled={executingTests.has(file.path)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRunTest(file.path)}
          disabled={executingTests.has(file.path) || !isConnected}
        >
          {executingTests.has(file.path) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDeleteTest(file.path)}
          disabled={executingTests.has(file.path) || !isConnected}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Test Files</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || !isConnected}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <WifiOff className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Project Connected</p>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Start the Raiken bridge server in your project directory to connect and manage test files.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-3 font-mono">
                raiken remote
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading test files...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Error Loading Files</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error?.message || 'Failed to load test files'}</p>
              <Button
                onClick={() => refetch()}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : testFiles.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Test Files Yet</p>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Generate your first test using the Test Builder to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {testFiles.map((file) => (
              <TestFileItem key={file.path} file={file} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}