"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Trash2, Clock, ChevronDown, ChevronRight, Camera, Video, FileText, Bug, AlertTriangle, Brain, Lightbulb, Target, CheckCircle, XCircle, Pause, Zap, Eye, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useLocalBridge } from "@/hooks/useLocalBridge";

interface TestReport {
  id: string;
  testPath: string;
  timestamp: string;
  success: boolean;
  output: string;
  error?: string;
  config: any;
  results?: any;
  artifacts?: Array<{
    name: string;
    contentType: string;
    path: string;
    relativePath: string;
    url: string;
  }>;
  aiAnalysis?: {
    summary: string;
    rootCause: string;
    suggestions: string;
    recommendations: string[];
    confidence: number;
  };
  summary?: {
    duration: number;
  };
}

export function TestReports() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const { isConnected, getReports, connection, deleteReport: deleteReportFromBridge } = useLocalBridge();

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
      let result;
      
      if (isConnected) {
        result = await getReports();
      } else {
        const response = await fetch('/api/v1/tests?action=reports');
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        result = await response.json();
      }
      
      if (result?.success) {
        const reports = result.reports || [];
        console.log(`[TestReports] Processing ${reports.length} reports`);
        
        // Validate reports structure
        const validReports = reports.filter((report: any) => {
          const isValid = report && typeof report === 'object' && report.id && report.testPath;
          if (!isValid) {
            console.warn('[TestReports] Invalid report structure:', report);
          }
          return isValid;
        });
        
        setReports(validReports);
      } else {
        const errorMsg = result?.error || 'Unknown error occurred';
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('[TestReports] Error fetching reports:', err);
      setError(err.message || 'Failed to fetch reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    setDeleteLoading(reportId);
    setError(null);
    
    try {
      let result;
      
      if (isConnected) {
        result = await deleteReportFromBridge(reportId);
      } else {
        const response = await fetch(`/api/v1/tests`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete-report',
            id: reportId
          })
        });
        
        if (!response.ok) {
          throw new Error(`Delete request failed: ${response.status} ${response.statusText}`);
        }
        
        result = await response.json();
      }
      
      if (result?.success) {
        // Remove from local state
        setReports(prev => prev.filter(report => report.id !== reportId));
        setExpandedReports(prev => {
          const newSet = new Set(prev);
          newSet.delete(reportId);
          return newSet;
        });
      } else {
        throw new Error(result?.error || 'Failed to delete report');
      }
    } catch (err: any) {
      console.error('[TestReports] Error deleting report:', err);
      setError(err.message || 'Failed to delete report');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Get status badge
  const getStatusBadge = (report: TestReport) => {
    if (report.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Passed</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    }
  };

  // Render AI analysis
  const renderAIAnalysis = (aiAnalysis: TestReport['aiAnalysis']) => {
    if (!aiAnalysis) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <span className="font-medium">AI Analysis</span>
          <Badge variant="outline" className="text-xs">
            {aiAnalysis.confidence}% confidence
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              <span className="text-sm font-medium">Summary</span>
            </div>
            <p className="text-sm text-muted-foreground pl-5">{aiAnalysis.summary}</p>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Bug className="w-3 h-3 text-red-500" />
              <span className="text-sm font-medium">Root Cause</span>
            </div>
            <p className="text-sm text-muted-foreground pl-5">{aiAnalysis.rootCause}</p>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Lightbulb className="w-3 h-3 text-yellow-500" />
              <span className="text-sm font-medium">Suggestions</span>
            </div>
            <p className="text-sm text-muted-foreground pl-5">{aiAnalysis.suggestions}</p>
          </div>
          
          {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Target className="w-3 h-3 text-blue-500" />
                <span className="text-sm font-medium">Recommendations</span>
              </div>
              <ul className="text-sm text-muted-foreground pl-5 space-y-1">
                {aiAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-xs mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render artifacts
  const renderArtifacts = (artifacts: TestReport['artifacts']) => {
    if (!artifacts || artifacts.length === 0) return null;
    
    const screenshots = artifacts.filter(a => a.contentType.startsWith('image/'));
    const videos = artifacts.filter(a => a.contentType.startsWith('video/'));
    const traces = artifacts.filter(a => a.name === 'trace' || a.contentType === 'application/zip');
    const others = artifacts.filter(a => !screenshots.includes(a) && !videos.includes(a) && !traces.includes(a));
    
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Test Artifacts</span>
          <Badge variant="outline" className="text-xs">{artifacts.length}</Badge>
        </div>
        
        {screenshots.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Camera className="w-3 h-3 text-green-500" />
              <span className="text-sm font-medium">Screenshots ({screenshots.length})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {screenshots.map((artifact, index) => (
                <div key={index} className="relative group">
                  <img
                    src={getArtifactUrl(artifact)}
                    alt={artifact.name}
                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(getArtifactUrl(artifact), '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded truncate">
                      {artifact.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {videos.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Video className="w-3 h-3 text-purple-500" />
              <span className="text-sm font-medium">Videos ({videos.length})</span>
            </div>
            <div className="space-y-2">
              {videos.map((artifact, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">{artifact.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getArtifactUrl(artifact), '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {traces.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-3 h-3 text-orange-500" />
              <span className="text-sm font-medium">Traces ({traces.length})</span>
            </div>
            <div className="space-y-2">
              {traces.map((artifact, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">{artifact.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getArtifactUrl(artifact), '_blank')}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {others.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-3 h-3 text-gray-500" />
              <span className="text-sm font-medium">Other Files ({others.length})</span>
            </div>
            <div className="space-y-2">
              {others.map((artifact, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{artifact.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getArtifactUrl(artifact), '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Load reports on mount and when connection changes
  useEffect(() => {
    fetchReports();
    console.log('fetching reports');
  }, [isConnected]);


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Test Reports</h2>
          <p className="text-muted-foreground">
            {isConnected ? 'Showing reports from your project' : 'No project connected'}
          </p>
        </div>
        <Button 
          onClick={fetchReports} 
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                No project connected. Connect to your project to view test reports.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading reports...</span>
        </div>
      )}

      {/* Reports List */}
      {!loading && reports.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports found</h3>
              <p className="text-muted-foreground">
                Run some tests to generate reports that will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((report) => {
            const isExpanded = expandedReports.has(report.id);
            
            return (
              <Card key={report.id} className={`transition-all ${!report.success ? 'border-red-200' : 'border-green-200'}`}>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div>
                            <CardTitle className="text-base">{report.testPath}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              {getStatusBadge(report)}
                              <span className="text-sm text-muted-foreground flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {format(new Date(report.timestamp), 'MMM d, yyyy HH:mm')}
                            </span>
                              {report.summary && (
                                <span className="text-sm text-muted-foreground">
                                  {formatDuration(report.summary.duration)}
                            </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {report.artifacts && report.artifacts.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {report.artifacts.length} files
                            </Badge>
                          )}
                          {report.aiAnalysis && (
                            <Badge variant="outline" className="text-xs">
                              <Brain className="w-3 h-3 mr-1" />
                              AI Analysis
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(report.id);
                            }}
                            disabled={deleteLoading === report.id}
                          >
                            {deleteLoading === report.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-6">
                        
                        {/* AI Analysis */}
                        {report.aiAnalysis && (
                          <>
                            <Separator />
                            {renderAIAnalysis(report.aiAnalysis)}
                          </>
                        )}
                        
                        {/* Artifacts */}
                        {report.artifacts && report.artifacts.length > 0 && (
                          <>
                            <Separator />
                            {renderArtifacts(report.artifacts)}
                          </>
                        )}
                        
                        {/* Error Details */}
                        {!report.success && report.error && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Bug className="w-4 h-4 text-red-500" />
                                <span className="font-medium">Error Details</span>
                              </div>
                              <pre className="text-sm bg-red-50 border border-red-200 rounded p-3 overflow-x-auto text-red-800">
                                {report.error}
                              </pre>
                            </div>
                          </>
                        )}
                        
                        {/* Raw Output (Collapsible) */}
                        {report.output && (
                          <>
                            <Separator />
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full justify-start">
                                  <ChevronRight className="w-3 h-3 mr-1" />
                                  View Raw Output
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <pre className="text-xs bg-muted border rounded p-3 overflow-x-auto mt-2 max-h-64">
                                  {report.output}
                              </pre>
                              </CollapsibleContent>
                            </Collapsible>
                          </>
                          )}
                        </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}