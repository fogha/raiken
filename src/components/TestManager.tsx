"use client"

import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTestStore, type TestFile } from '@/store/testStore';
import { useBrowserStore } from '@/store/browserStore';
import { useLocalBridge } from '@/hooks/useLocalBridge';
import { Loader2, Play, RefreshCw, Edit, Trash2, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

export function TestManager() {
  const testStore = useTestStore();
  const { addEditorTab } = useBrowserStore();
  const { isConnected, connection } = useLocalBridge();

  useEffect(() => {
    testStore.loadTestFiles();
  }, [isConnected]);

  const handleRunTest = useCallback(async (testPath: string) => {
    await testStore.runTest(testPath);
  }, [testStore]);

  const handleDeleteTest = useCallback(async (testPath: string) => {
    if (confirm(`Are you sure you want to delete ${testPath}?`)) {
      await testStore.deleteTestFile(testPath);
    }
  }, [testStore]);

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

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-700 dark:text-green-300">
            Connected to {connection?.projectInfo?.project?.name || 'Project'}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-700 dark:text-red-300">
            No project connected
          </span>
        </>
      )}
    </div>
  );

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
          disabled={testStore.isTestRunning(file.path)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRunTest(file.path)}
          disabled={testStore.isTestRunning(file.path) || !isConnected}
        >
          {testStore.isTestRunning(file.path) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDeleteTest(file.path)}
          disabled={testStore.isTestRunning(file.path) || !isConnected}
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
            <ConnectionStatus />
            <Button
              variant="outline"
              size="sm"
              onClick={() => testStore.loadTestFiles()}
              disabled={testStore.isLoadingFiles}
            >
              {testStore.isLoadingFiles ? (
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
        ) : testStore.isLoadingFiles ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading test files...</span>
          </div>
        ) : testStore.testFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Test Files</p>
            <p className="text-sm">Generate your first test to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {testStore.testFiles.map((file) => (
              <TestFileItem key={file.path} file={file} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}