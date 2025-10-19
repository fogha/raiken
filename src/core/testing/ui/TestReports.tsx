"use client"

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  RefreshCw,
  Trash2,
  Clock,
  ChevronDown,
  ChevronRight,
  Camera,
  Video,
  FileText,
  Bug,
  AlertTriangle,
  Brain,
  Lightbulb,
  Target,
  CheckCircle,
  XCircle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Activity,
  Zap,
  X,
  ZoomIn
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useLocalBridge } from "@/hooks/useLocalBridge";
import { useTestReports, type TestReport } from "@/hooks/useTestReports";

export function TestReports() {
  const { reports, isLoading, error, refetch, deleteReport: deleteMutation, isDeleting } = useTestReports();
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const { isConnected, connection } = useLocalBridge();

  // Helper function to get artifact URL based on bridge connection
  const getArtifactUrl = (artifact: any) => {
    if (isConnected && connection && artifact.url) {
      return `${connection.url}${artifact.url}`;
    } else if (artifact.relativePath) {
      return `/api/artifacts/${artifact.relativePath}`;
    } else {
      return artifact.url || `/api/artifacts/${artifact.relativePath}`;
    }
  };

  const fetchReports = () => {
    refetch();
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    deleteMutation(reportId);
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      newSet.delete(reportId);
      return newSet;
    });
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Parse test results from output for successful tests
  const parseTestResults = (report: TestReport) => {
    if (!report.success || !report.output) return null;
    
    try {
      // Try to parse the output as JSON (Playwright JSON report)
      const parsed = JSON.parse(report.output);
      
      if (parsed.suites && parsed.stats) {
        return {
          stats: parsed.stats,
          suites: parsed.suites,
          config: parsed.config
        };
      }
    } catch (e) {
      // If parsing fails, try to extract basic info from text output
      const lines = report.output.split('\n');
      const passedMatch = lines.find(line => line.includes('passed'))?.match(/(\d+)\s+passed/);
      const durationMatch = lines.find(line => line.includes('ms') || line.includes('s'))?.match(/(\d+(?:\.\d+)?)(ms|s)/);
      
      if (passedMatch || durationMatch) {
        return {
          stats: {
            expected: passedMatch ? parseInt(passedMatch[1]) : 0,
            duration: durationMatch ? (durationMatch[2] === 's' ? parseFloat(durationMatch[1]) * 1000 : parseFloat(durationMatch[1])) : 0
          }
        };
      }
    }
    
    return null;
  };

  // Extract test cases from parsed results
  const extractTestCases = (parsedResults: any) => {
    if (!parsedResults?.suites) return [];
    
    const testCases: Array<{
      title: string;
      status: string;
      duration: number;
      file: string;
      line?: number;
    }> = [];
    
    const extractFromSuite = (suite: any): void => {
      // Extract test cases from specs
      const specs = suite.specs || [];
      specs.forEach((spec: any) => {
        const tests = spec.tests || [];
        tests.forEach((test: any) => {
          const results = test.results || [];
          const firstResult = results[0];
          
          if (!firstResult) return;
          
          testCases.push({
            title: spec.title,
            status: firstResult.status,
            duration: firstResult.duration || 0,
            file: spec.file || suite.file,
            line: spec.line
          });
        });
      });
      
      // Recursively process nested suites
      const nestedSuites = suite.suites || [];
      nestedSuites.forEach(extractFromSuite);
    };
    
    parsedResults.suites.forEach(extractFromSuite);
    return testCases;
  };

  // Get status badge
  const getStatusBadge = (report: TestReport) => {
    if (report.success) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Passed
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  // Render successful test information
  const renderSuccessfulTestInfo = (report: TestReport) => {
    if (!report.success) return null;
    
    const parsedResults = parseTestResults(report);
    const testCases = parsedResults ? extractTestCases(parsedResults) : [];
    
    return (
      <div className="space-y-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
        {/* Test Statistics */}
        {parsedResults?.stats && (
          <div className="grid grid-cols-3 grid-rows-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 row-span-1 bg-white/60 dark:bg-slate-800/80 p-3 rounded-lg border border-green-200/30 dark:border-green-800/30">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">Passed</span>
              </div>
              <p className="text-lg font-bold text-green-800 dark:text-green-200 mt-1">
                {parsedResults.stats.expected || 0}
              </p>
            </div>
            <div className="col-span-1 row-span-1 bg-white/60 dark:bg-slate-800/80 p-3 rounded-lg border border-green-200/30 dark:border-green-800/30">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                {formatDuration(parsedResults.stats.duration || 0)}
              </p>
            </div>
            {parsedResults.stats.skipped !== undefined && (
              <div className="col-span-1 row-span-1 bg-white/60 dark:bg-slate-800/80 p-3 rounded-lg border border-green-200/30 dark:border-green-800/30">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Skipped</span>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {parsedResults.stats.skipped || 0}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Individual Test Cases */}
        {testCases.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">Test Cases ({testCases.length})</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {testCases.map((testCase, index) => (
                <div key={index} className="flex items-center justify-between bg-white/60 dark:bg-slate-800/80 p-3 rounded-lg border border-green-200/30 dark:border-green-800/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {testCase.title}
                    </p>
                    {testCase.file && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {testCase.file}{testCase.line ? `:${testCase.line}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800"
                    >
                      {testCase.status}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDuration(testCase.duration)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render AI analysis
  const renderAIAnalysis = (aiAnalysis: TestReport['aiAnalysis']) => {
    if (!aiAnalysis) return null;

    console.log(aiAnalysis)
    
    return (
      <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">AI Analysis</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Intelligent failure diagnosis & fixes</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            <Sparkles className="w-3 h-3 mr-1" />
            {aiAnalysis.confidence}% confidence
          </Badge>
        </div>

        <div className="grid gap-6">
          {/* Root Cause */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Bug className="w-5 h-5 text-red-500" />
              <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Root Cause</span>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/80 p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {aiAnalysis.rootCause}
              </p>
            </div>
          </div>
          
          {/* Recommended Fixes */}
          {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-500" />
                <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Recommended Fixes</span>
              </div>
              <div className="space-y-3">
                {aiAnalysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-4 bg-white/60 dark:bg-slate-800/80 p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
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
      <div className="space-y-4 p-4 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Test Artifacts</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Screenshots, videos & traces</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {artifacts.length} files
          </Badge>
        </div>

        {screenshots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Screenshots ({screenshots.length})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {screenshots.map((artifact, index) => (
                <div key={index} className="relative group cursor-pointer" onClick={() => setSelectedImage({ url: getArtifactUrl(artifact), name: artifact.name })}>
                  <img
                    src={getArtifactUrl(artifact)}
                    alt={artifact.name}
                    className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-all hover:scale-105 shadow-sm"
                    onClick={() => setSelectedImage({ url: getArtifactUrl(artifact), name: artifact.name })}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                    <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Videos ({videos.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {videos.map((artifact, index) => (
                <div key={index} className="relative group bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-lg overflow-hidden hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors">
                  <video
                    controls
                    className="w-full h-48 object-cover bg-black"
                    poster={getArtifactUrl(artifact).replace('.webm', '-poster.png')}
                  >
                    <source src={getArtifactUrl(artifact)} type="video/webm" />
                    <source src={getArtifactUrl(artifact)} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md truncate flex items-center justify-between">
                      <span>{artifact.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(getArtifactUrl(artifact), '_blank')}
                        className="h-6 w-6 p-0 hover:bg-white/20"
                      >
                        <ExternalLink className="w-3 h-3 text-white" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // No useEffect needed - React Query handles data fetching

  const passedTests = reports.filter(r => r.success).length;
  const failedTests = reports.filter(r => !r.success).length;

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50/50 to-white/50 dark:from-slate-900/50 dark:to-slate-800/50 min-h-[77vh] h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Test Reports</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isConnected ? 'Connected to your project' : 'No project connected'}
              </p>
            </div>
          </div>

          {/* Stats */}
          {reports.length > 0 && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{passedTests} Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{failedTests} Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{reports.length} Total</span>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={fetchReports}
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 dark:border-amber-800/50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">No Project Connected</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Connect to your project to view test reports and artifacts.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 dark:border-red-800/50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Error Loading Reports</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">Loading Reports</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fetching your test results...</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && reports.length === 0 && !error && (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Reports Yet</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Run some tests to generate reports that will appear here. Your test results, screenshots, and AI analysis will be displayed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {!isLoading && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((report) => {
            const isExpanded = expandedReports.has(report.id);

            return (
              <Card key={report.id} className={`
                transition-all duration-200 hover:shadow-lg
                ${!report.success
                  ? 'border-red-200/50 bg-gradient-to-r from-red-50/50 to-pink-50/50 dark:from-red-900/5 dark:to-pink-900/5 dark:border-red-800/30'
                  : 'border-green-200/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/5 dark:to-emerald-900/5 dark:border-green-800/30'
                }
              `}>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {report.testPath}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(report.timestamp), 'MMM d, HH:mm')}</span>
                          </div>
                              {(() => {
                                // Try to get duration from parsed results or summary
                                const parsedResults = parseTestResults(report);
                                const duration = parsedResults?.stats?.duration || report.summary?.duration;
                                if (duration) {
                                  return (
                                    <span className="flex items-center gap-1">
                                      <Zap className="w-3 h-3" />
                                      <span>{formatDuration(duration)}</span>
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {getStatusBadge(report)}

                          {report.artifacts && report.artifacts.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {report.artifacts.length}
                            </Badge>
                          )}

                          {report.aiAnalysis && (
                            <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                              <Brain className="w-3 h-3 mr-1 text-purple-600 dark:text-purple-400" />
                              AI
                            </Badge>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(report.id);
                            }}
                            disabled={isDeleting}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                          >
                            {isDeleting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-6">

                      {/* Successful Test Information */}
                      {report.success && (
                        <>
                          <Separator className="bg-slate-200/50 dark:bg-slate-700/50" />
                          {renderSuccessfulTestInfo(report)}
                        </>
                      )}

                      {/* AI Analysis */}
                      {report.aiAnalysis && (
                        <>
                          <Separator className="bg-slate-200/50 dark:bg-slate-700/50" />
                          {renderAIAnalysis(report.aiAnalysis)}
                        </>
                      )}

                      {/* Artifacts */}
                      {report.artifacts && report.artifacts.length > 0 && (
                        <>
                          <Separator className="bg-slate-200/50 dark:bg-slate-700/50" />
                          {renderArtifacts(report.artifacts)}
                        </>
                      )}

                      {/* Error Details */}
                      {!report.success && report.error && (
                        <>
                          <Separator className="bg-slate-200/50 dark:bg-slate-700/50" />
                          <div className="space-y-3 p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 rounded-lg border border-red-200/50 dark:border-red-800/50">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                <Bug className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </div>
                              <div>
                                <span className="font-semibold text-red-900 dark:text-red-100">Error Details</span>
                                <p className="text-xs text-red-600 dark:text-red-400">Test execution failed</p>
                              </div>
                            </div>
                            <pre className="text-sm bg-white/50 dark:bg-slate-800/50 border border-red-200/50 dark:border-red-800/50 rounded-md p-4 overflow-x-auto text-red-800 dark:text-red-200 font-mono">
                              {report.error}
                            </pre>
                        </div>
                        </>
                    )}

                    {/* Raw Output (Collapsible) */}
                      {report.output && (
                        <>
                          <Separator className="bg-slate-200/50 dark:bg-slate-700/50" />
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-slate-100 dark:hover:bg-slate-800">
                                <ChevronRight className="w-4 h-4 mr-2" />
                                <FileText className="w-4 h-4 mr-2" />
                                View Raw Output
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <pre className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 overflow-x-auto mt-3 max-h-64 font-mono">
                                {report.output}
                              </pre>
                            </CollapsibleContent>
                          </Collapsible>
                        </>
                      )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
            );
          })}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg flex items-center justify-between">
                <span>{selectedImage.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(selectedImage.url, '_blank')}
                  className="text-white hover:bg-white/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}