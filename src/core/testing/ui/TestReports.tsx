"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronRight, ArrowLeft, Trash2, Clock, Search, BarChart, FileText, Code, Play, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TestReport } from '../reports.service';
import { TestResult } from '../test-executor';

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
      
    // Find the most recent report for highlighting
    const latestReport = reports.length > 0 
      ? reports.reduce((latest, current) => 
          new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest, reports[0])
      : null;

    return { total, successful, failed, partial, avgDuration, latestReport };
  }, [reports]);

  // Fetch reports on component mount and when refresh event is triggered
  useEffect(() => {
    fetchReports();
    
    // Listen for refresh events from the PlaywrightBrowser component
    const handleRefresh = () => {
      console.log('[TestReports] Refresh event received, fetching latest reports');
      fetchReports();
    };
    
    window.addEventListener('test-reports-refresh', handleRefresh);
    
    // Clean up event listener on unmount
    return () => {
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
      // Remove the deleted report from state
      setReports(reports.filter(report => report.id !== id));
      // If the deleted report is currently selected, clear the selection
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
      // Filter by tab
      const matchesTab = activeTab === 'all' || report.status === activeTab;

      // Filter by search query
      const matchesSearch = searchQuery === '' ||
        report.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.testScript.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [reports, activeTab, searchQuery]);

  // Get status icon based on report status
  const getStatusIcon = (status: string, size: number = 4) => {
    switch (status) {
      case 'success':
        return <CheckCircle className={`h-${size} w-${size} text-green-500`} />;
      case 'failure':
        return <XCircle className={`h-${size} w-${size} text-red-500`} />;
      case 'partial':
        return <AlertTriangle className={`h-${size} w-${size} text-yellow-500`} />;
      default:
        return null;
    }
  };

  // Get status color based on report status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failure': return 'bg-red-500';
      case 'partial': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Format test results for display
  const formatTestResults = () => {
    if (!selectedReport) return null;

    const results = selectedReport.results || [];

    if (results.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm">No test results available for this report.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={`${selectedReport.id}-result-${index}`}
            className={`overflow-hidden rounded-lg border ${
              result.success
                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <h3 className="text-sm font-medium">
                      {result.success ? 'Test Passed' : 'Test Failed'}
                    </h3>
                    {result.durationMs && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Duration: {(result.durationMs / 1000).toFixed(2)}s
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={result.success ? 'success' : 'destructive'}
                  className="text-xs"
                >
                  Step {index + 1}
                </Badge>
              </div>

              {/* Message */}
              {result.message && (
                <div className="mt-3">
                  <p className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                    {result.message}
                  </p>
                </div>
              )}

              {/* Error Details */}
              {!result.success && result.error && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mb-2">
                    <Code2 className="h-3.5 w-3.5" />
                    <span className="font-medium">Error Details</span>
                  </div>
                  <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded-md overflow-x-auto">
                    <code>{result.error}</code>
                  </pre>
                </div>
              )}

              {/* Timestamp */}
              {result.timestamp && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(result.timestamp, 'PPpp')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string, formatStr: string = 'MMM d, yyyy'): string => {
    try {
      // First try to parse as ISO string
      const date = parseISO(dateString);
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Helper function to safely format relative time
  const formatRelativeTime = (dateString: string | undefined): string => {
    if (!dateString) return 'Unknown time';
    try {
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return 'Unknown time';
    }
  };

  // If a report is selected, show its details
  if (selectedReport) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedReport(null)}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Reports</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(selectedReport.testScript);
            }}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Copy Script
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant={selectedReport.status === 'success' ? 'success' :
                    selectedReport.status === 'failure' ? 'destructive' : 'warning'}
                  className="px-2 h-6"
                >
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(selectedReport.status, 3)}
                    <span>
                      {selectedReport.status === 'success' ? 'Passed' :
                        selectedReport.status === 'failure' ? 'Failed' : 'Partial'}
                    </span>
                  </div>
                </Badge>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{(selectedReport.durationMs / 1000).toFixed(2)}s</span>
                  </div>
                  <span>{formatRelativeTime(selectedReport.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedReport.summary && (
            <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-medium mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {selectedReport.summary}
              </p>
            </div>
          )}

          {/* Test Results */}
          <div className="p-6">
            <h3 className="text-sm font-medium mb-4">Test Results</h3>
            <div className="space-y-4">
              {selectedReport.results?.map((result, index) => (
                <div
                  key={`${selectedReport.id}-result-${index}`}
                  className={`rounded-lg border ${
                    result.success
                      ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20'
                      : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          Step {index + 1}: {result.success ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      {result.durationMs && (
                        <span className="text-xs text-muted-foreground">
                          {(result.durationMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                    
                    {/* Message */}
                    {result.message && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground font-mono">
                          {result.message}
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {!result.success && result.error && (
                      <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mb-2">
                          <Code2 className="h-3.5 w-3.5" />
                          <span className="font-medium">Error Details</span>
                        </div>
                        <pre className="text-xs bg-red-100/50 dark:bg-red-900/20 p-3 rounded-md overflow-x-auto">
                          <code className="text-red-600 dark:text-red-400">{result.error}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(!selectedReport.results || selectedReport.results.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm">No test results available.</p>
                </div>
              )}
            </div>
          </div>

          {/* Test Script */}
          <div className="border-t">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Test Script</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedReport.testScript);
                  }}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </Button>
              </div>
              <div className="relative rounded-lg border bg-muted">
                <pre className="overflow-x-auto p-4 text-sm">
                  <code className="text-muted-foreground">
                    {selectedReport.testScript.trim()}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
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

  // Otherwise, show the list of reports
  return (
    <div className="space-y-6 h-full">
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
          className="h-9 px-3 text-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Reports
        </Button>
      </div>

      {/* Dashboard stats */}
      {reports.length > 0 &&
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
      }

      {/* Search and filter */}
      <div className="flex items-center gap-3 pt-4 mb-6">
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

        <div className="flex items-center gap-2 border p-1 rounded-lg">
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className="text-xs m-1"
          >
            All ({reports.length})
          </Button>
          <Button
            variant={activeTab === 'success' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('success')}
            className="text-xs"
          >
            Passed ({stats.successful})
          </Button>
          <Button
            variant={activeTab === 'failure' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('failure')}
            className="text-xs"
          >
            Failed ({stats.failed})
          </Button>
        </div>

        <div className="flex gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <BarChart className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {reports.length === 0 && (
        <div style={{ marginTop: '40px'}} className="items-center text-center bg-slate-50 pt-[30px] dark:bg-slate-900">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="text-lg font-medium mb-4">No test reports available</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Run some tests to generate reports and view them here.
          </p>
        </div>
      )}

      {reports.length > 0 && (
        <>
          {/* Display latest test result if available */}
          {stats.latestReport && new Date().getTime() - new Date(stats.latestReport.timestamp).getTime() < 60000 && (
            <div className={`mb-6 p-4 border rounded-lg ${
              stats.latestReport.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 
              'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {stats.latestReport.status === 'success' ? 
                  <CheckCircle className="h-5 w-5 text-green-500" /> : 
                  <XCircle className="h-5 w-5 text-red-500" />
                }
                <h3 className="font-medium">
                  {stats.latestReport.status === 'success' ? 'Test Passed Successfully!' : 'Test Failed'}
                </h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatRelativeTime(stats.latestReport.timestamp)}
                </span>
              </div>
              <p className="text-sm">
                {stats.latestReport.status === 'success' 
                  ? `Test completed in ${(stats.latestReport.durationMs / 1000).toFixed(2)} seconds.` 
                  : stats.latestReport.summary || 'Check the report details for more information.'
                }
              </p>
              <div className="mt-3 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setSelectedReport(stats.latestReport)}
                >
                  View Details
                </Button>
              </div>
            </div>
          )}
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 h-auto lg:grid-cols-3 pt-4 gap-4">
              {filteredReports.map(report => (
                <div key={report.id}>
                  {renderReportCard(report)}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReports.map(report => (
                <div key={report.id}>
                  {renderReportListItem(report)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Helper function to render a report card
  function renderReportCard(report: TestReport) {
    return (
      <Card
        key={report.id}
        className="bg-white dark:bg-slate-900 overflow-hidden border hover:border-primary/50 transition-colors duration-200 cursor-pointer group px-4 py-2"
        onClick={() => setSelectedReport(report)}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Badge
              variant={report.status === 'success' ? 'success' :
                report.status === 'failure' ? 'destructive' : 'warning'}
              className="px-2.5 h-6"
            >
              <div className="flex items-center gap-1.5">
                {getStatusIcon(report.status, 3)}
                <span>
                  {report.status === 'success' ? 'Passed' :
                    report.status === 'failure' ? 'Failed' : 'Partial'}
                </span>
              </div>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              disabled={deleteLoading === report.id}
              className={`h-7 w-7 p-0 ${deleteLoading === report.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-muted-foreground hover:text-destructive`}
              onClick={(e) => {
                e.stopPropagation();
                deleteReport(report.id);
              }}
            >
              {deleteLoading === report.id ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {report.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {report.summary}
            </p>
          )}

          <div className="flex items-center justify-between text-xs border-t pt-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{(report.durationMs / 1000).toFixed(2)}s</span>
              </div>
              <span>{formatRelativeTime(report.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
              <span className="font-medium">Details</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to render a report list item
  function renderReportListItem(report: TestReport) {
    return (
      <div
        key={report.id}
        className="bg-white dark:bg-slate-900 border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors duration-200 group"
        onClick={() => setSelectedReport(report)}
      >
        <div className="flex items-center p-4 gap-4">
          <Badge
            variant={report.status === 'success' ? 'success' :
              report.status === 'failure' ? 'destructive' : 'warning'}
            className="px-2.5 h-6 shrink-0"
          >
            <div className="flex items-center gap-1.5">
              {getStatusIcon(report.status, 3)}
              <span>
                {report.status === 'success' ? 'Passed' :
                  report.status === 'failure' ? 'Failed' : 'Partial'}
              </span>
            </div>
          </Badge>
          
          <div className="flex-1 min-w-0">
            {report.summary && (
              <p className="text-sm truncate text-muted-foreground">
                {report.summary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 pl-4 shrink-0">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{(report.durationMs / 1000).toFixed(2)}s</span>
              </div>
              <span>{formatRelativeTime(report.timestamp)}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled={deleteLoading === report.id}
              className={`h-7 w-7 p-0 ${deleteLoading === report.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-muted-foreground hover:text-destructive`}
              onClick={(e) => {
                e.stopPropagation();
                deleteReport(report.id);
              }}
            >
              {deleteLoading === report.id ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }
}
