"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Trash2, Clock, ChevronDown, ChevronRight, Camera, Video, FileText, Bug, AlertTriangle, Brain, Lightbulb, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocalBridge } from "@/hooks/useLocalBridge";


export function TestReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const { isConnected, connection } = useLocalBridge();

  // Helper function to get artifact URL based on bridge connection
  const getArtifactUrl = (artifact: any) => {
    if (isConnected && connection && artifact.url) {
      // Use bridge URL for artifacts when connected
      return `${connection.url}${artifact.url}`;
    } else if (artifact.relativePath) {
      // Use Raiken server URL for artifacts when not connected
      return `/api/artifacts/${artifact.relativePath}`;
    } else {
      // Fallback
      return artifact.url || `/api/artifacts/${artifact.relativePath}`;
    }
  };

  // Fetch reports
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isConnected && connection) {
        // Project-focused: Only fetch from local bridge when connected
        console.log('[TestReports] Fetching reports from project...');
        const response = await fetch(`${connection.url}/api/reports`, {
          headers: {
            'Authorization': `Bearer ${connection.token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const reports = data.reports || [];
          console.log(`[TestReports] Found ${reports.length} reports from project`);
          setReports(Array.isArray(reports) ? reports : []);
        } else {
          throw new Error(`Failed to fetch project reports: ${response.status} ${response.statusText}`);
        }
      } else {
        // No project connected - show empty state
        console.log('[TestReports] No project connected');
        setReports([]);
      }
    } catch (err) {
      console.error('Error fetching project reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch project reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete report
  const deleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    setDeleteLoading(id);
    try {
      if (isConnected && connection) {
        console.log('[TestReports] Deleting report from project...');
        const response = await fetch(`${connection.url}/api/reports/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${connection.token}`
          }
        });
        
        if (response.ok) {
          setReports(prev => prev.filter(report => report.id !== id));
        } else {
          throw new Error(`Failed to delete project report: ${response.status} ${response.statusText}`);
        }
      } else {
        throw new Error('No project connected - cannot delete report');
      }
    } catch (err) {
      console.error('Error deleting project report:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete report');
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

  useEffect(() => {
    fetchReports();
  }, [isConnected, connection]); // Refresh when bridge connection changes

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
            {isConnected ? (
              <>
                <h3 className="text-lg font-medium mb-2">No test reports in this project</h3>
                <p className="text-sm text-center">
                  Run some tests in your project to see detailed reports with screenshots, videos, and error analysis.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No project connected</h3>
                <p className="text-sm text-center">
                  Connect to a project by running <code className="bg-muted px-1 rounded">raiken remote</code> in your project directory to see test reports.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {!loading && reports.length > 0 && (
        <div className="space-y-6">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <Collapsible
                open={expandedReports.has(report.id)}
                onOpenChange={() => toggleExpanded(report.id)}
              >
                {/* Report Header */}
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 hover:bg-muted/30 rounded-lg -m-3 transition-colors">
                        {expandedReports.has(report.id) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 min-w-0">
                            <CardTitle className="text-xl font-semibold flex-1 min-w-0 truncate text-foreground">
                              {report.testName}
                            </CardTitle>
                            <Badge
                              variant={getStatusBadgeVariant(report.status)}
                              className="text-xs font-medium px-2 py-1 flex-shrink-0"
                            >
                              {report.success ? 'Passed' : 'Failed'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{formatDuration(report.duration)}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span>📅</span>
                              <span>{format(new Date(report.timestamp), 'MMM d, yyyy HH:mm:ss')}</span>
                            </span>
                            <span className="flex items-center gap-2 truncate max-w-xs" title={report.testPath}>
                              <span>📁</span>
                              <span>{report.testPath}</span>
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
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors p-2 rounded-md"
                    >
                      {deleteLoading === report.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {/* Report Details */}
                <CollapsibleContent>
                  <CardContent className="space-y-8 pt-0 pb-6 px-4">

                    {/* AI Analysis */}
                    {report.summary && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-blue-900 flex items-center gap-3 text-lg">
                            <Brain className="h-5 w-5" />
                            AI Analysis
                          </h4>
                          {report.aiConfidence && (
                            <Badge variant="outline" className="text-xs font-medium px-3 py-1 bg-blue-100 text-blue-800 border-blue-300">
                              {report.aiConfidence}% confidence
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                            <p className="text-sm text-blue-900 leading-relaxed">{report.summary}</p>
                          </div>

                          {report.rootCause && (
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Root Cause
                              </p>
                              <p className="text-sm text-orange-800 leading-relaxed">{report.rootCause}</p>
                            </div>
                          )}

                          {report.suggestions && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" />
                                Suggestions
                              </p>
                              <p className="text-sm text-green-800 leading-relaxed">{report.suggestions}</p>
                            </div>
                          )}

                          {report.fixRecommendations && Array.isArray(report.fixRecommendations) && (
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                <span>🔧</span>
                                Fix Recommendations
                              </p>
                              <ul className="text-sm text-purple-800 space-y-2">
                                {report.fixRecommendations.map((rec: string, index: number) => (
                                  <li key={index} className="flex items-start gap-3 p-2 bg-white/50 rounded border border-purple-100">
                                    <span className="text-purple-600 font-bold text-xs bg-purple-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      {index + 1}
                                    </span>
                                    <span className="leading-relaxed">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Screenshots */}
                    {report.screenshots && report.screenshots.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 shadow-sm">
                        <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-3 text-lg">
                          <Camera className="h-5 w-5" />
                          Screenshots ({report.screenshots.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {report.screenshots.map((screenshot: any, index: number) => (
                            <div key={index} className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden border border-gray-200">
                                <img
                                  src={getArtifactUrl(screenshot)}
                                  alt={screenshot.name}
                                  className="w-full h-full object-contain hover:scale-105 transition-transform cursor-pointer"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><div class="text-center"><svg class="h-12 w-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><p class="text-sm">Image not available</p></div></div>';
                                    }
                                  }}
                                  onClick={() => window.open(getArtifactUrl(screenshot), '_blank')}
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-purple-800 truncate" title={screenshot.name}>
                                  {screenshot.name}
                                </p>
                                <p className="text-xs text-purple-600 flex items-center gap-1">
                                  <span>🔍</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Videos */}
                    {report.videos && report.videos.length > 0 && (
                      <div className="shadow-sm">
                        <h4 className="font-semibold text-indigo-900 mb-4 flex items-center gap-3 text-lg">
                          <Video className="h-5 w-5" />
                          Videos ({report.videos.length})
                        </h4>
                        <div className="space-y-4">
                          {report.videos.map((video: any, index: number) => (
                            <div key={index} className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm">
                              <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden border border-gray-200">
                                <video
                                  src={getArtifactUrl(video)}
                                  controls
                                  className="w-full h-full rounded-lg"
                                  preload="metadata"
                                  onError={(e) => {
                                    const target = e.target as HTMLVideoElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><div class="text-center"><svg class="h-12 w-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><p class="text-sm">Video not available</p></div></div>';
                                    }
                                  }}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-indigo-800 truncate" title={video.name}>
                                  {video.name}
                                </p>
                                <p className="text-xs text-indigo-600 flex items-center gap-1">
                                  <span>🎬</span>
                                  Test execution recording
                                </p>
                              </div>
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
                            <div key={index} className={`text-xs p-2 rounded ${log.level === 'error' ? 'bg-red-100 text-red-800' :
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