"use client"

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTestStore, type TestFile } from '@/store/testStore';
import { useBrowserStore } from '@/store/browserStore';
import { Loader2, Play, RefreshCw, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

export function TestManager() {
  const {
    testFiles,
    isLoadingFiles,
    results,
    loadTestFiles,
    runTest,
    deleteTestFile,
    isTestRunning
  } = useTestStore();

  const { addEditorTab } = useBrowserStore();

  // Load test files on component mount
  useEffect(() => {
    loadTestFiles();
  }, [loadTestFiles]);

  const handleRunTest = async (testPath: string) => {
    await runTest(testPath);
  };

  const handleDeleteTest = async (testPath: string) => {
    if (confirm(`Are you sure you want to delete ${testPath}?`)) {
      await deleteTestFile(testPath);
    }
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
        {!Array.isArray(testFiles) || testFiles.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                {isLoadingFiles ? 'Loading test files...' : 'No test files found. Generate a test first.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          testFiles.map((file: TestFile) => (
            <Card key={file.path}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{file.name}</CardTitle>
                  <div className="flex items-center gap-2">
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
                      disabled={isTestRunning(file.path)}
                      size="sm"
                    >
                      {isTestRunning(file.path) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Test
                    </Button>
                    <Button
                      onClick={() => handleDeleteTest(file.path)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
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
          <CardContent className="space-y-4">
            {results.map((result: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  {result.success ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Passed
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Duration: {result.duration ? `${result.duration}ms` : 'Unknown'}
                  </span>
                </div>

                {/* Error Information for Failed Tests */}
                {!result.success && (
                  <div className="space-y-3">
                    {/* AI Summary if available */}
                    {result.summary && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-blue-800 mb-2">AI Analysis</h4>
                        <p className="text-sm text-blue-700">{result.summary}</p>
                      </div>
                    )}

                    {/* AI Suggestions if available */}
                    {result.suggestions && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-amber-800 mb-2">Suggestions</h4>
                        <p className="text-sm text-amber-700">{result.suggestions}</p>
                      </div>
                    )}

                    {/* Detailed Error Information */}
                    {result.detailedErrors && result.detailedErrors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-red-800 mb-3 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Detailed Error Analysis ({result.detailedErrors.length} error{result.detailedErrors.length > 1 ? 's' : ''})
                        </h4>
                        <div className="space-y-3">
                          {result.detailedErrors.map((error: any, errorIndex: number) => (
                            <div key={errorIndex} className="bg-white border border-red-200 rounded p-3">
                              {/* Error Message */}
                              <div className="mb-2">
                                <p className="text-sm font-medium text-red-800">{error.message}</p>
                                {error.testName && (
                                  <p className="text-xs text-red-600 mt-1">Test: {error.testName}</p>
                                )}
                              </div>

                              {/* Location Information */}
                              {error.location && (
                                <div className="mb-2 p-2 bg-red-100 rounded text-xs">
                                  <span className="font-medium text-red-700">Location: </span>
                                  <span className="text-red-600 font-mono">
                                    {error.location.file}:{error.location.line}:{error.location.column}
                                  </span>
                                </div>
                              )}

                              {/* Test Step */}
                              {error.step && (
                                <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
                                  <span className="font-medium text-gray-700">Step: </span>
                                  <span className="text-gray-600 font-mono">{error.step}</span>
                                </div>
                              )}

                              {/* Stack Trace */}
                              {error.stack && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs font-medium text-red-700 hover:text-red-800">
                                    View Stack Trace
                                  </summary>
                                  <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-32">
                                    {error.stack}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback Error Details */}
                    {result.error && (!result.detailedErrors || result.detailedErrors.length === 0) && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-red-800 mb-2">Error Details</h4>
                        <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                          {result.error}
                        </pre>
                      </div>
                    )}

                    {/* Screenshots */}
                    {result.screenshots && result.screenshots.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-purple-800 mb-3 flex items-center gap-2">
                          📸 Screenshots ({result.screenshots.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {result.screenshots.map((screenshot: any, index: number) => (
                            <div key={index} className="bg-white border border-purple-200 rounded p-2">
                              <p className="text-xs font-medium text-purple-700 mb-1">{screenshot.name}</p>
                              <p className="text-xs text-purple-600">
                                {new Date(screenshot.timestamp).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-1" title={screenshot.path}>
                                {screenshot.path.split('/').pop()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Videos */}
                    {result.videos && result.videos.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-indigo-800 mb-3 flex items-center gap-2">
                          🎥 Videos ({result.videos.length})
                        </h4>
                        <div className="space-y-2">
                          {result.videos.map((video: any, index: number) => (
                            <div key={index} className="bg-white border border-indigo-200 rounded p-2">
                              <p className="text-xs font-medium text-indigo-700 mb-1">{video.name}</p>
                              <p className="text-xs text-indigo-600">
                                {new Date(video.timestamp).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-1" title={video.path}>
                                {video.path.split('/').pop()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Browser Console Logs */}
                    {result.browserLogs && result.browserLogs.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-orange-800 mb-3 flex items-center gap-2">
                          🖥️ Browser Console Logs ({result.browserLogs.length})
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {result.browserLogs.map((log: any, index: number) => (
                            <div key={index} className={`text-xs p-2 rounded ${
                              log.level === 'error' ? 'bg-red-100 text-red-800' :
                              log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              <span className="font-medium">[{log.level.toUpperCase()}]</span> {log.message}
                              <span className="text-gray-500 ml-2">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Network Logs */}
                    {result.networkLogs && result.networkLogs.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <h4 className="font-medium text-sm text-green-800 mb-3 flex items-center gap-2">
                          🌐 Network Requests ({result.networkLogs.length})
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {result.networkLogs.map((request: any, index: number) => (
                            <div key={index} className="text-xs p-2 bg-white border border-green-200 rounded">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium px-1 rounded ${
                                  request.status >= 200 && request.status < 300 ? 'bg-green-100 text-green-800' :
                                  request.status >= 400 ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {request.method}
                                </span>
                                <span className={`font-mono ${
                                  request.status >= 200 && request.status < 300 ? 'text-green-700' :
                                  request.status >= 400 ? 'text-red-700' :
                                  'text-gray-600'
                                }`}>
                                  {request.status}
                                </span>
                                <span className="text-gray-600 truncate flex-1" title={request.url}>
                                  {request.url}
                                </span>
                              </div>
                              <span className="text-gray-500">
                                {new Date(request.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raw Output for Advanced Users */}
                    {(result.results?.rawOutput || result.results?.rawError) && (
                      <details className="border rounded-md">
                        <summary className="cursor-pointer p-3 text-sm font-medium hover:bg-gray-50">
                          Raw Playwright Output (Advanced)
                        </summary>
                        <div className="border-t p-3 space-y-2">
                          {result.results?.rawOutput && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-1">STDOUT:</h5>
                              <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-48">
                                {result.results.rawOutput}
                              </pre>
                            </div>
                          )}
                          {result.results?.rawError && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-1">STDERR:</h5>
                              <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-48">
                                {result.results.rawError}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    {/* Link to Full Report if available */}
                    {result.reportId && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Switch to Reports tab - you may need to implement this navigation
                            console.log('Navigate to report:', result.reportId);
                          }}
                        >
                          View Full Report
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Information */}
                {result.success && result.summary && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-700">{result.summary}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 