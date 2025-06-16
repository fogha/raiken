"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronRight, ArrowLeft, Trash2, Clock, Search, BarChart, FileText, Code2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TestReport } from '../services/reports.service';

export function TestReports() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Stats for the dashboard
  const stats = useMemo(() => {
    const total = reports.length;
    const successful = reports.filter(r => r.status === 'success').length;
    const failed = reports.filter(r => r.status === 'failure').length;
    const partial = reports.filter(r => r.status === 'partial').length;

    const avgDuration = reports.length > 0
      ? reports.reduce((sum, r) => sum + r.durationMs, 0) / reports.length / 1000
      : 0;

    return { total, successful, failed, partial, avgDuration };
  }, [reports]);

  // Fetch reports on component mount and when refresh event is triggered
  useEffect(() => {
    fetchReports();
    
    const handleTestComplete = (event: CustomEvent) => {
      console.log('[TestReports] Test execution complete event received:', event.detail);
      fetchReports();
    };
    
    const handleRefresh = () => {
      console.log('[TestReports] Refresh event received, fetching latest reports');
      fetchReports();
    };
    
    window.addEventListener('test-execution-complete', handleTestComplete as EventListener);
    window.addEventListener('test-reports-refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('test-execution-complete', handleTestComplete as EventListener);
      window.removeEventListener('test-reports-refresh', handleRefresh);
    };
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-reports');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch reports');
      }
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/test-reports?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete report');
      }
      setReports(reports.filter(report => report.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete report');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Filter reports based on active tab and search query
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesTab = activeTab === 'all' || report.status === activeTab;
      const matchesSearch = searchQuery === '' ||
        report.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.testScript?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [reports, activeTab, searchQuery]);

  // Get status icon based on report status
  const getStatusIcon = (status: string, size: number = 4) => {
    switch (status) {
      case 'success':
        return <CheckCircle className={`h-${size} w-${size} text-emerald-500`} />;
      case 'failure':
        return <XCircle className={`h-${size} w-${size} text-red-500`} />;
      case 'partial':
        return <AlertTriangle className={`h-${size} w-${size} text-amber-500`} />;
      default:
        return null;
    }
  };

  // Enhanced error parsing for Playwright errors
  const parsePlaywrightError = (error: string) => {
    if (!error) return null;

    const errorPatterns = [
      {
        pattern: /strict mode violation.*resolved to (\d+) elements/i,
        type: 'Selector Ambiguity',
        explanation: 'The selector matched multiple elements. Use a more specific selector.',
        solution: 'Try using a unique ID, data-testid, or more specific CSS selector.'
      },
      {
        pattern: /locator\.(\w+): Error: (.*)/i,
        type: 'Locator Action Failed',
        explanation: 'A Playwright action failed to execute.',
        solution: 'Check if the element exists and is interactable.'
      },
      {
        pattern: /Timeout.*exceeded.*waiting for (.*)/i,
        type: 'Timeout Error',
        explanation: 'The operation took longer than expected.',
        solution: 'Increase timeout or check if the element/condition appears.'
      },
      {
        pattern: /Element is not visible/i,
        type: 'Visibility Error',
        explanation: 'The element exists but is not visible.',
        solution: 'Ensure the element is visible or scroll it into view.'
      },
      {
        pattern: /Element is not enabled/i,
        type: 'Interaction Error',
        explanation: 'The element is disabled.',
        solution: 'Wait for the element to be enabled.'
      },
      {
        pattern: /Navigation failed/i,
        type: 'Navigation Error',
        explanation: 'Failed to navigate to the specified URL.',
        solution: 'Check if the URL is correct and accessible.'
      },
      {
        pattern: /No such element.*Unable to locate element/i,
        type: 'Element Not Found',
        explanation: 'The specified element could not be found.',
        solution: 'Verify the selector is correct and the element exists.'
      },
      {
        pattern: /page\.goto: (.*) net::(.*)/i,
        type: 'Network Error',
        explanation: 'Network connection failed.',
        solution: 'Check your internet connection and verify the URL.'
      },
      {
        pattern: /expect.*received.*expected/i,
        type: 'Assertion Failed',
        explanation: 'A test assertion failed.',
        solution: 'Review the assertion logic and check page state.'
      },
    ];

    for (const { pattern, type, explanation, solution } of errorPatterns) {
      if (pattern.test(error)) {
        return { type, explanation, solution, originalError: error };
      }
    }

    return { 
      type: 'Unknown Error', 
      explanation: 'An unexpected error occurred during test execution.',
      solution: 'Check the full error message and stack trace for more details.',
      originalError: error 
    };
  };

  // Enhanced error display component
  const ErrorDisplay = ({ error }: { error: string }) => {
    const parsedError = parsePlaywrightError(error);
    
    if (!parsedError) {
      return (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap font-mono">
            {error}
          </pre>
        </div>
      );
    }

          return (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3 w-full overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2 min-w-0">
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">{parsedError.type}</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{parsedError.explanation}</p>
            </div>
            
            <div className="bg-red-100 dark:bg-red-900/30 rounded-md p-3">
              <h5 className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">💡 Solution:</h5>
              <p className="text-xs text-red-700 dark:text-red-300">{parsedError.solution}</p>
            </div>
            
                          <div className="text-xs">
              <h5 className="text-xs font-medium text-red-800 dark:text-red-200 mb-2">Original Error:</h5>
              <div className="max-h-48 overflow-auto bg-red-100 dark:bg-red-900/30 rounded p-2">
                <pre className="text-red-800 dark:text-red-200 whitespace-pre-wrap font-mono text-xs break-words overflow-wrap-anywhere">
                  {parsedError.originalError}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Format test results for display
  const formatTestResults = () => {
    if (!selectedReport?.results) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No test results available</p>
        </div>
      );
    }

    let results: any[] = [];
    
    if (Array.isArray(selectedReport.results)) {
      results = selectedReport.results;
    } else if (selectedReport.results && typeof selectedReport.results === 'object') {
      const resultObj = selectedReport.results as any;
      
      if (resultObj.suites && Array.isArray(resultObj.suites)) {
        const stats = resultObj.stats || {};
        const testDetails: any[] = [];
        
        resultObj.suites.forEach((suite: any) => {
          suite.specs?.forEach((spec: any) => {
            spec.tests?.forEach((test: any) => {
              test.results?.forEach((result: any, index: number) => {
                testDetails.push({
                  success: result.status === 'passed',
                  message: `${spec.title}: ${result.status}`,
                  duration: result.duration,
                  error: result.errors?.[0]?.message || result.error,
                  testName: spec.title,
                  status: result.status,
                  retry: index
                });
              });
            });
          });
        });

        if (testDetails.length > 0) {
          results = testDetails;
        } else {
          results = [{
            success: stats.failed === 0 && stats.passed > 0,
            message: `Test suite: ${stats.passed || 0} passed, ${stats.failed || 0} failed`,
            duration: selectedReport.durationMs,
            error: null,
            stats: stats
          }];
        }
      } else {
        const hasError = resultObj.error || resultObj.stderr;
        const actualSuccess = !hasError && selectedReport.status === 'success';
        
        results = [{
          success: actualSuccess,
          message: resultObj.error || resultObj.message || (actualSuccess ? 'Test completed successfully' : 'Test failed'),
          error: resultObj.error || resultObj.stderr || null,
          duration: selectedReport.durationMs
        }];
      }
    }

    if (results.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No test results available for this report.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {results.map((result: any, index) => (
          <div
            key={`${selectedReport.id}-result-${index}`}
            className={`rounded-lg border p-4 ${
              result.success
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <h3 className="text-sm font-medium">
                    {result.testName || (result.success ? 'Test Passed' : 'Test Failed')}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {result.duration && (
                      <span>Duration: {(result.duration / 1000).toFixed(2)}s</span>
                    )}
                    {result.retry > 0 && (
                      <span>• Retry: {result.retry}</span>
                    )}
                    {result.status && (
                      <span>• Status: {result.status}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {result.message && !result.error && (
              <div className="mb-3">
                <p className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                  {result.message}
                </p>
              </div>
            )}

            {result.error && (
              <div style={{ marginTop: "2rem", maxWidth: "56vw"}}>
                <ErrorDisplay error={result.error} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string, formatStr: string = 'MMM d, yyyy'): string => {
    try {
      const date = parseISO(dateString);
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string | undefined): string => {
    if (!dateString) return 'Unknown time';
    
    try {
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return dateString;
    }
  };

  // Show detailed report view
  if (selectedReport) {
    return (
      <div className="space-y-6 h-full overflow-auto">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedReport(null)}
            className="h-9 px-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedReport.testScript) {
                navigator.clipboard.writeText(selectedReport.testScript);
              }
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Copy Script
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge
                  variant={selectedReport.status === 'success' ? 'default' :
                    selectedReport.status === 'failure' ? 'destructive' : 'secondary'}
                  className="px-3 py-1"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedReport.status, 4)}
                    <span className="font-medium">
                      {selectedReport.status === 'success' ? 'Test Passed' :
                        selectedReport.status === 'failure' ? 'Test Failed' : 'Partial Success'}
                    </span>
                  </div>
                </Badge>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{(selectedReport.durationMs / 1000).toFixed(2)}s</span>
                  </div>
                  <span>{formatRelativeTime(selectedReport.timestamp)}</span>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteReport(selectedReport.id)}
                disabled={deleteLoading === selectedReport.id}
                className="text-destructive hover:text-destructive"
              >
                {deleteLoading === selectedReport.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {selectedReport.summary && (
              <div className="bg-slate-50 dark:bg-slate-800/50 py-4">
                <h3 className="font-medium mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {selectedReport.summary}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-4">Test Results</h3>
              {formatTestResults()}
            </div>

            {selectedReport.testScript && (
              <div>
                <h3 className="font-medium mb-4">Test Script</h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border overflow-hidden">
                  <pre className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                    <code>{selectedReport.testScript.trim()}</code>
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render loading state
  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading test reports...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center max-w-md">
          <XCircle className="h-8 w-8 text-destructive/50 mx-auto mb-4" />
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              fetchReports();
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Main reports list view
  return (
    <div className="space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Test Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your test execution history
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReports}
          disabled={loading}
          className="h-9 px-4"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Dashboard stats */}
      {reports.length > 0 && (
        <div className="flex gap-4 mt-2 items-center">
          <Card className="bg-white dark:bg-slate-900 shadow-sm flex-1">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
                </div>
                <div className="bg-primary/10 p-2 rounded-full">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 shadow-sm flex-1">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Successful</p>
                  <h3 className="text-2xl font-bold mt-1 text-green-500">{stats.successful}</h3>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 shadow-sm flex-1">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <h3 className="text-2xl font-bold mt-1 text-red-500">{stats.failed}</h3>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 shadow-sm flex-1">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Duration</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.avgDuration.toFixed(2)}s</h3>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex items-center gap-3 pt-4 mb-4">
        <div className="relative flex items-center gap-2 flex-1">
          <div className="flex items-center px-4 border flex-1 rounded-lg">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              className="border-0 border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={activeTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('all')}
              className="text-xs px-3"
            >
              All ({reports.length})
            </Button>
            <Button
              variant={activeTab === 'success' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('success')}
              className="text-xs px-3"
            >
              Passed ({stats.successful})
            </Button>
            <Button
              variant={activeTab === 'failure' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('failure')}
              className="text-xs px-3"
            >
              Failed ({stats.failed})
            </Button>
          </div>

          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <BarChart className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="text-lg font-medium mb-2">No test reports available</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Run some tests to generate reports and view them here.
          </p>
        </div>
      )}

      {/* Reports grid/list */}
      {filteredReports.length > 0 && (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 gap-4 mt-4" 
          : "space-y-3"
        }>
          {filteredReports.map(report => (
            <Card 
              key={report.id} 
              className="cursor-pointer hover:shadow-md transition-all duration-200 group"
              onClick={() => setSelectedReport(report)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    variant={report.status === 'success' ? 'default' :
                      report.status === 'failure' ? 'destructive' : 'secondary'}
                      className="px-2.5 h-6"
                    >
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(report.status, 3)}
                      <span className="text-xs font-medium">
                        {report.status === 'success' ? 'Passed' :
                          report.status === 'failure' ? 'Failed' : 'Partial'}
                      </span>
                    </div>
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteLoading === report.id}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteReport(report.id);
                    }}
                  >
                    {deleteLoading === report.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {report.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {report.summary}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(report.durationMs / 1000).toFixed(2)}s
                    </div>
                    <span>{formatRelativeTime(report.timestamp)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No filtered results */}
      {reports.length > 0 && filteredReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-medium mb-2">No reports found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search query or filters.
          </p>
        </div>
      )}
    </div>
  );
}
