"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, MinusCircle, RefreshCw, Trash2, Clock, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UITestReport } from "@/types/test";

/**
 * TestReports Component
 * 
 * Displays test execution reports with:
 * - Raw Playwright output for all tests (success/failure)
 * - Clickable video recordings (when enabled in settings)
 * - Clickable screenshots
 * - AI analysis and suggestions
 * - Collapsible detailed views
 */
export function TestReports() {
  const [reports, setReports] = useState<UITestReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  // Fetch reports
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-reports');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  // Delete report
  const deleteReport = async (id: string) => {
    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/test-reports?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      setReports(reports.filter(r => r.id !== id));
      setExpandedReports(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Error deleting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Toggle report expansion
  const toggleExpanded = (id: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Load reports on mount and listen for test completion
  useEffect(() => {
    fetchReports();

    const handleTestComplete = () => {
      fetchReports();
    };

    window.addEventListener('test-execution-complete', handleTestComplete);
    return () => window.removeEventListener('test-execution-complete', handleTestComplete);
  }, []);

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'skipped':
        return <MinusCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'skipped':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Extract error from Playwright output
  const extractPlaywrightError = (rawOutput: string) => {
    try {
      const outputData = JSON.parse(rawOutput);
      let errorMessage = '';
      
      if (outputData.suites) {
        outputData.suites.forEach((suite: any) => {
          suite.specs?.forEach((spec: any) => {
            spec.tests?.forEach((test: any) => {
              test.results?.forEach((result: any) => {
                if (result.status === 'failed' && result.error) {
                  errorMessage = result.error.message || result.error.toString();
                }
              });
            });
          });
        });
      }
      
      return errorMessage;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Test Reports</h2>
          <p className="text-sm text-muted-foreground">
            {reports.length > 0 && `${reports.length} report${reports.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <Button
          onClick={fetchReports}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">Loading reports...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && reports.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No test reports found. Run a test to generate reports.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {!loading && reports.length > 0 && (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <Collapsible
                open={expandedReports.has(report.id)}
                onOpenChange={() => toggleExpanded(report.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer flex-1">
                        {getStatusIcon(report.status)}
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{report.testName}</CardTitle>
                              {expandedReports.has(report.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(report.status)}>
                                {report.status}
                              </Badge>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteReport(report.id);
                                }}
                                disabled={deleteLoading === report.id}
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-4 items-center text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(report.duration)}
                            </span>
                            <span>
                              {format(new Date(report.timestamp), 'MMM d, yyyy HH:mm:ss')}
                            </span>
                            <span className="truncate max-w-xs" title={report.testPath}>
                              📁 {report.testPath}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Playwright Error - For failed tests */}
                    {(report as any).rawPlaywrightOutput && report.status === 'failed' && (() => {
                      const errorMessage = extractPlaywrightError((report as any).rawPlaywrightOutput);
                      if (errorMessage) {
                        return (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              Playwright Error
                            </h4>
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                              <div className="space-y-1">
                                <p className="text-xs text-red-700 font-medium">Error Message:</p>
                                <div className="bg-gray-900 text-gray-100 rounded px-3 py-2 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                                  <div className="whitespace-pre-wrap break-all">
                                    {errorMessage}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Raw Playwright Error - For failed tests */}
                    {(report as any).rawPlaywrightError && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Raw Playwright Error
                        </h4>
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                          <div className="space-y-1">
                            <p className="text-xs text-red-700 font-medium">Stack Trace:</p>
                            <div className="bg-gray-900 text-gray-100 rounded px-3 py-2 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                              <div className="whitespace-pre-wrap break-all">
                                {(report as any).rawPlaywrightError}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Recording - Show if available */}
                    {(() => {
                      try {
                        const playWrightOutput = (report as any).rawPlaywrightOutput;
                        if (playWrightOutput) {
                          const outputData = JSON.parse(playWrightOutput);
                          const videos = [];
                          
                          // Extract video paths from Playwright output
                          if (outputData.suites) {
                            outputData.suites.forEach((suite: any) => {
                              suite.specs?.forEach((spec: any) => {
                                spec.tests?.forEach((test: any) => {
                                  test.results?.forEach((result: any) => {
                                    result.attachments?.forEach((attachment: any) => {
                                      if (attachment.contentType === 'video/webm' || attachment.name === 'video') {
                                        videos.push({
                                          name: attachment.name || 'video',
                                          path: attachment.path,
                                          contentType: attachment.contentType
                                        });
                                      }
                                    });
                                  });
                                });
                              });
                            });
                          }
                          
                          if (videos.length > 0) {
                            return (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  🎥 Video Recording{videos.length > 1 ? 's' : ''}
                                </h4>
                                <div className="space-y-2">
                                   {videos.map((video, index) => {
                                     const fileName = video.path.split('/').pop() || 'video.webm';
                                     return (
                                       <div key={index} className="bg-blue-50 w-full border border-blue-200 rounded-md p-4">
                                         <Button
                                           variant="outline"
                                           size="sm"
                                           onClick={() => window.open(`file://${video.path}`, '_blank')}
                                           className="text-blue-700 hover:text-blue-900"
                                         >
                                           🎥 {fileName}
                                           <ExternalLink className="h-3 w-3 ml-1" />
                                         </Button>
                                       </div>
                                     );
                                   })}
                                </div>
                              </div>
                            );
                          }
                        }
                        return null;
                      } catch (e) {
                        return null;
                      }
                    })()}

                    {/* Screenshot Attachments - Show if available */}
                    {(() => {
                      try {
                        const playWrightOutput = (report as any).rawPlaywrightOutput;
                        if (playWrightOutput) {
                          const outputData = JSON.parse(playWrightOutput);
                          const screenshots = [];
                          
                          // Extract screenshot paths from Playwright output
                          if (outputData.suites) {
                            outputData.suites.forEach((suite: any) => {
                              suite.specs?.forEach((spec: any) => {
                                spec.tests?.forEach((test: any) => {
                                  test.results?.forEach((result: any) => {
                                    result.attachments?.forEach((attachment: any) => {
                                      if (attachment.contentType === 'image/png' || attachment.name === 'screenshot') {
                                        screenshots.push({
                                          name: attachment.name || 'screenshot',
                                          path: attachment.path,
                                          contentType: attachment.contentType
                                        });
                                      }
                                    });
                                  });
                                });
                              });
                            });
                          }
                          
                          if (screenshots.length > 0) {
                            return (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  📸 Screenshot{screenshots.length > 1 ? 's' : ''}
                                </h4>
                                <div className="space-y-2">
                                  {screenshots.map((screenshot, index) => {
                                    const fileName = screenshot.path.split('/').pop() || 'screenshot.png';
                                    return (
                                      <div key={index} className="bg-purple-50 w-full border border-purple-200 rounded-md p-4">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(`file://${screenshot.path}`, '_blank')}
                                          className="text-purple-700 hover:text-purple-900"
                                        >
                                          📷 {fileName}
                                          <ExternalLink className="h-3 w-3 ml-1" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                        }
                        return null;
                      } catch (e) {
                        return null;
                      }
                    })()}

                    {/* Processed Errors */}
                    {report.errors && report.errors.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Processed Error Details ({report.errors.length})
                        </h4>
                        <div className="space-y-3">
                          {report.errors.map((error, index) => (
                            <div key={index} className="bg-red-50 border border-red-200 rounded-md p-4">
                              <div className="flex items-start gap-3">
                                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <p className="text-sm text-red-800 font-medium leading-relaxed">
                                    {error.message}
                                  </p>
                                  
                                  {/* Show full Playwright error stack if available */}
                                  {(error as any).stack && (
                                    <div className="space-y-1">
                                      <p className="text-xs text-red-700 font-medium">Stack Trace:</p>
                                      <div className="bg-gray-900 text-gray-100 rounded px-3 py-2 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                                        <div className="whitespace-pre-wrap break-all">
                                          {(error as any).stack}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {error.location && (
                                    <div className="bg-red-100 rounded px-2 py-1">
                                      <p className="text-xs text-red-700 font-mono">
                                        📍 {error.location.file}:{error.location.line}:{error.location.column}
                                      </p>
                                    </div>
                                  )}
                                  {/* Extract and display Playwright-specific error patterns */}
                                  {error.message.includes('strict mode violation') && (
                                    <div className="bg-yellow-100 border border-yellow-300 rounded px-3 py-2">
                                      <p className="text-xs text-yellow-800 font-medium">
                                        🎯 Selector Issue: Multiple elements found
                                      </p>
                                      <p className="text-xs text-yellow-700 mt-1">
                                        This selector matches more than one element. Use a more specific selector.
                                      </p>
                                    </div>
                                  )}
                                  {error.message.includes('Timeout') && (
                                    <div className="bg-orange-100 border border-orange-300 rounded px-3 py-2">
                                      <p className="text-xs text-orange-800 font-medium">
                                        ⏱️ Timeout Error: Element not found or action did not complete
                                      </p>
                                      <p className="text-xs text-orange-700 mt-1">
                                        The element may not exist, be hidden, or need more time to load.
                                      </p>
                                    </div>
                                  )}
                                  {error.message.includes('toBeVisible') && (
                                    <div className="bg-blue-100 border border-blue-300 rounded px-3 py-2">
                                      <p className="text-xs text-blue-800 font-medium">
                                        👁️ Visibility Assertion: Element not visible
                                      </p>
                                      <p className="text-xs text-blue-700 mt-1">
                                        The element exists but is not visible on the page.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Analysis Summary - What Happened */}
                    {report.summary && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          🤖 AI Analysis: Root Cause
                        </h4>
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                          <p className="text-sm text-slate-800 leading-relaxed">
                            {report.summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* AI Suggestions - How to Fix */}
                    {report.suggestions && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          💡 Recommended Solutions
                        </h4>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-emerald-800 leading-relaxed">
                              {report.suggestions}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show message if no analysis available */}
                    {!report.errors && !report.summary && !report.suggestions && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-600">No detailed analysis available for this test report.</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
