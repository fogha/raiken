"use client"

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTestStore } from '@/store/testStore';
import { useBrowserStore } from '@/store/browserStore';
import { Loader2, Play, RefreshCw, Edit } from 'lucide-react';

export function TestManager() {
  const {
    testFiles,
    isLoadingFiles,
    isRunning,
    results,
    loadTestFiles,
    runTest
  } = useTestStore();

  const { addEditorTab } = useBrowserStore();

  // Load test files on component mount
  useEffect(() => {
    loadTestFiles();
  }, [loadTestFiles]);

  const handleRunTest = async (testPath: string) => {
    await runTest(testPath);
  };

  const handleRefresh = () => {
    loadTestFiles();
  };

  const handleOpenTest = (file: any) => {
    // Add test to editor tabs
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
    
    // Switch to Tests tab
    setTimeout(() => {
      const testsTabTrigger = document.querySelector('[data-state="inactive"][value="tests"]') as HTMLButtonElement;
      if (testsTabTrigger) {
        testsTabTrigger.click();
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Manager</h2>
        <Button 
          onClick={handleRefresh} 
          disabled={isLoadingFiles}
          variant="outline"
          size="sm"
        >
          {isLoadingFiles ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Test Files List */}
      <div className="grid gap-4">
        {testFiles.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                {isLoadingFiles ? 'Loading test files...' : 'No test files found. Generate a test first.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          testFiles.map((file) => (
            <Card key={file.path}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{file.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </Badge>
                    <Button
                      onClick={() => handleOpenTest(file)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    <Button
                      onClick={() => handleRunTest(file.path)}
                      disabled={isRunning}
                      size="sm"
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Test
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Path: {file.path}</p>
                  <p>Modified: {new Date(file.modifiedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Test Results */}
      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 