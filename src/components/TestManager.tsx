"use client"

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/store/editorStore';
import { useLocalBridge } from '@/hooks/useLocalBridge';
import { useTestFiles } from '@/hooks/useTestFiles';
import { useExecuteTest } from '@/hooks/useExecuteTest';
import { Loader2, Play, RefreshCw, Edit, Trash2, CheckCircle, WifiOff } from 'lucide-react';

interface TestFile {
  name: string;
  path: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
}

export function TestManager() {
  const { addEditorTab } = useEditorStore();
  const { isConnected } = useLocalBridge();
  const { testFiles, isLoading, refetch, deleteTest } = useTestFiles();
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
  }, [addEditorTab]);

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Test Files</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
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
          <div className="text-center py-8 text-muted-foreground">
            <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Project Connected</p>
            <p className="text-sm">
              Run <code className="bg-muted px-2 py-1 rounded">raiken remote</code> in your project directory to connect
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading test files...</span>
          </div>
        ) : testFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Test Files</p>
            <p className="text-sm">Generate your first test to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {testFiles.map((file) => (
              <TestFileItem key={file.path} file={file} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}