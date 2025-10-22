"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Copy,
  AlertTriangle,
  Info
} from 'lucide-react';
import { unifiedBridgeService } from '@/lib/unified-bridge';
import { localBridgeService } from '@/lib/local-bridge';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: string;
}

export function BridgeConnectionDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [bridgeStatus, setBridgeStatus] = useState(unifiedBridgeService.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setBridgeStatus(unifiedBridgeService.getStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    try {
      // Test 1: Check if running in browser
      diagnostics.push({
        name: 'Browser Environment',
        status: typeof window !== 'undefined' ? 'pass' : 'fail',
        message: typeof window !== 'undefined' ? 'Running in browser' : 'Not running in browser environment'
      });

      // Test 2: Check localhost connectivity
      const ports = [3460, 3456, 3459, 3457, 3458];
      let localFound = false;
      let localDetails = '';

      for (const port of ports) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          
          if (response.ok) {
            const data = await response.json();
            localFound = true;
            localDetails = `Found CLI at port ${port} - Project: ${data.project} (${data.type})`;
            break;
          }
        } catch (error) {
          // Continue to next port
        }
      }

      diagnostics.push({
        name: 'Local CLI Detection',
        status: localFound ? 'pass' : 'fail',
        message: localFound ? 'Local Raiken CLI detected' : 'No local Raiken CLI found',
        details: localFound ? localDetails : 'Run "raiken start" in your project directory'
      });

      // Test 3: Authentication test
      if (localFound) {
        try {
          const connection = await localBridgeService.detectLocalCLI();
          if (connection) {
            const testResult = await localBridgeService.getTestFiles();
            diagnostics.push({
              name: 'Authentication',
              status: testResult.success ? 'pass' : 'fail',
              message: testResult.success ? 'Authentication successful' : 'Authentication failed',
              details: testResult.error || 'Token validation passed'
            });
          }
        } catch (error) {
          diagnostics.push({
            name: 'Authentication',
            status: 'fail',
            message: 'Authentication test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Test 4: CORS check
      diagnostics.push({
        name: 'CORS Configuration',
        status: 'info',
        message: 'Modern browsers allow localhost connections',
        details: 'Loopback addresses (127.0.0.1) are treated as secure contexts'
      });

      // Test 5: Network connectivity
      try {
        await fetch('https://httpbin.org/get', { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        diagnostics.push({
          name: 'Internet Connectivity',
          status: 'pass',
          message: 'Internet connection available',
          details: 'Relay fallback is possible'
        });
      } catch (error) {
        diagnostics.push({
          name: 'Internet Connectivity',
          status: 'warning',
          message: 'Limited internet connectivity',
          details: 'Relay fallback may not work'
        });
      }

      // Test 6: WebSocket support (for relay)
      diagnostics.push({
        name: 'WebSocket Support',
        status: typeof WebSocket !== 'undefined' ? 'pass' : 'fail',
        message: typeof WebSocket !== 'undefined' ? 'WebSocket supported' : 'WebSocket not supported',
        details: 'Required for relay bridge fallback'
      });

      // Test 7: Local storage
      try {
        localStorage.setItem('raiken_test', 'test');
        localStorage.removeItem('raiken_test');
        diagnostics.push({
          name: 'Local Storage',
          status: 'pass',
          message: 'Local storage available',
          details: 'Connection caching will work'
        });
      } catch (error) {
        diagnostics.push({
          name: 'Local Storage',
          status: 'warning',
          message: 'Local storage not available',
          details: 'Connection caching disabled'
        });
      }

    } catch (error) {
      diagnostics.push({
        name: 'Diagnostic Error',
        status: 'fail',
        message: 'Failed to run diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Bridge Connection Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Current Status</h3>
          <div className="flex items-center gap-4">
            <Badge 
              variant={bridgeStatus.connected ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {bridgeStatus.connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {bridgeStatus.mode.toUpperCase()} {bridgeStatus.connected ? 'Connected' : 'Disconnected'}
            </Badge>
            
            {bridgeStatus.projectName && (
              <span className="text-sm text-muted-foreground">
                Project: {bridgeStatus.projectName}
              </span>
            )}
            
            {bridgeStatus.lastHealthCheck && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last check: {new Date(bridgeStatus.lastHealthCheck).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Diagnostic Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => unifiedBridgeService.reconnect()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Diagnostic Results</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-1">{result.message}</p>
                  
                  {result.details && (
                    <div className="flex items-start gap-2 mt-2">
                      <p className="text-xs text-muted-foreground flex-1">{result.details}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.details!)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Troubleshooting</h3>
          <div className="space-y-2">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>No local CLI detected?</strong> Run <code className="bg-muted px-1 rounded">raiken start</code> in your project directory.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Authentication failed?</strong> Copy the token from your CLI terminal and paste it when prompted.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Still having issues?</strong> The system will automatically fall back to relay mode for enterprise networks.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
