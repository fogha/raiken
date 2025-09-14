"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, RefreshCw, Trash2, Clock, ChevronDown, ChevronRight, Camera, Video, FileText, Bug, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * Simple, effective test reporting component
 */
export function TestReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  // Fetch reports
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/tests?action=reports');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setReports(data.success && Array.isArray(data.reports) ? data.reports : []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  // Delete report
  const deleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/v1/tests?action=delete-report&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setReports(prev => prev.filter(report => report.id !== id));
      } else {
        throw new Error('Failed to delete report');
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed':
        return 'default' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  // Load reports on mount
  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Test Reports</h2>
        <Button onClick={fetchReports} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading reports...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="flex items-center justify-center py-8 text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Error: {error}</span>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && reports.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No test reports yet</h3>
            <p className="text-sm text-center">
              Run some tests to see detailed reports with screenshots, videos, and error analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {!loading && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <Collapsible
                open={expandedReports.has(report.id)}
                onOpenChange={() => toggleExpanded(report.id)}
              >
                {/* Report Header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer flex-1 hover:bg-muted/50 p-2 rounded-md -m-2">
                        {getStatusIcon(report.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg font-semibold">{report.testName}</CardTitle>
                            <Badge variant={getStatusBadgeVariant(report.status)} className="text-xs">
                              {report.status}
                            </Badge>
                            {expandedReports.has(report.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                            )}
                          </div>
                          <div className="flex gap-4 items-center text-sm text-muted-foreground">
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
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(report.id);
                      }}
                      disabled={deleteLoading === report.id}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {/* Report Details */}
                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    
                    {/* AI Analysis */}
                    {report.summary && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                          <Bug className="h-4 w-4" />
                          AI Analysis
                        </h4>
                        <p className="text-sm text-blue-800 mb-3">{report.summary}</p>
                        {report.suggestions && (
                          <div className="bg-blue-100 rounded p-3">
                            <p className="text-xs font-medium text-blue-900 mb-1">Suggestions:</p>
                            <p className="text-xs text-blue-800">{report.suggestions}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Screenshots */}
                    {report.screenshots && report.screenshots.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Screenshots ({report.screenshots.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {report.screenshots.map((screenshot: any, index: number) => (
                            <div key={index} className="bg-white border border-purple-200 rounded-lg p-3">
                              <div className="aspect-video bg-gray-100 rounded mb-2 overflow-hidden">
                                <img
                                  src={`/api/artifacts/${screenshot.relativePath}`}
                                  alt={screenshot.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="flex items-center justify-center h-full"><svg class="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>';
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-xs font-medium text-purple-800">{screenshot.name}</p>
                              <p className="text-xs text-purple-600 mt-1">
                                Path: {screenshot.relativePath}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Videos */}
                    {report.videos && report.videos.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Videos ({report.videos.length})
                        </h4>
                        <div className="space-y-3">
                          {report.videos.map((video: any, index: number) => (
                            <div key={index} className="bg-white border border-indigo-200 rounded-lg p-3">
                              <div className="aspect-video bg-gray-100 rounded mb-2 overflow-hidden">
                                <video
                                  src={`/api/artifacts/${video.relativePath}`}
                                  controls
                                  className="w-full h-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLVideoElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><svg class="h-8 w-8 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Video unavailable</div>';
                                    }
                                  }}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                              <p className="text-xs font-medium text-indigo-800">{video.name}</p>
                              <p className="text-xs text-indigo-600 mt-1">
                                Path: {video.relativePath}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {report.errors && report.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Errors ({report.errors.length})
                        </h4>
                        <div className="space-y-3">
                          {report.errors.map((error: any, index: number) => (
                            <div key={index} className="bg-white border border-red-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-red-800 mb-2">{error.message}</p>
                              {error.location && (
                                <p className="text-xs text-red-600 mb-2">
                                  Location: {error.location.file}:{error.location.line}:{error.location.column}
                                </p>
                              )}
                              {error.stack && (
                                <details className="mt-2">
                                  <summary className="text-xs font-medium text-red-700 cursor-pointer">
                                    Stack Trace
                                  </summary>
                                  <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-auto max-h-32">
                                    {error.stack}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Browser Logs */}
                    {report.browserLogs && report.browserLogs.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                          <Bug className="h-4 w-4" />
                          Browser Logs ({report.browserLogs.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {report.browserLogs.map((log: any, index: number) => (
                            <div key={index} className={`text-xs p-2 rounded ${
                              log.level === 'error' ? 'bg-red-100 text-red-800' :
                              log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              <span className="font-medium">[{log.level.toUpperCase()}]</span> {log.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raw Output (Collapsible) */}
                    {(report.rawOutput || report.rawError) && (
                      <details className="bg-gray-50 border border-gray-200 rounded-lg">
                        <summary className="cursor-pointer p-4 font-medium text-gray-700 hover:bg-gray-100">
                          Raw Playwright Output
                        </summary>
                        <div className="border-t p-4 space-y-3">
                          {report.rawOutput && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-2">STDOUT:</h5>
                              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-48">
                                {report.rawOutput}
                              </pre>
                            </div>
                          )}
                          {report.rawError && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-2">STDERR:</h5>
                              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-48">
                                {report.rawError}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
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