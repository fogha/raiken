"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTestGeneration } from '@/hooks/useTestGeneration';
import { Settings, RotateCcw, Monitor, Clock, Zap, Camera, Video, Bug } from 'lucide-react';

export function TestExecutionSettings() {
  const { executionConfig, updateExecutionConfig, resetExecutionConfig } = useTestGeneration();

  const handleBrowserTypeChange = (value: 'chromium' | 'firefox' | 'webkit') => {
    updateExecutionConfig({ browserType: value });
  };

  const handleNumberChange = (field: string, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      // Add field-specific validation
      let isValid = true;
      let clampedValue = numValue;
      
      switch (field) {
        case 'retries':
          clampedValue = Math.min(Math.max(numValue, 0), 5);
          break;
        case 'timeout':
          clampedValue = Math.min(Math.max(numValue, 5000), 300000); // 5s to 5min
          break;
        case 'maxFailures':
          clampedValue = Math.min(Math.max(numValue, 1), 50);
          break;
        case 'workers':
          clampedValue = Math.min(Math.max(numValue, 1), 8);
          break;
        default:
          isValid = false;
      }
      
      if (isValid) {
        updateExecutionConfig({ [field]: clampedValue });
      }
    }
  };

  const handleSwitchChange = (field: string, checked: boolean) => {
    updateExecutionConfig({ [field]: checked });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Test Execution Settings</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetExecutionConfig()}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <h3 className="text-sm font-medium">Browser Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Browser Type</Label>
              <Select value={executionConfig.browserType} onValueChange={handleBrowserTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromium">
                    <div className="flex items-center gap-2">
                      Chromium
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="firefox">Firefox</SelectItem>
                  <SelectItem value="webkit">WebKit (Safari)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="headless">Headless Mode</Label>
              <Switch
                id="headless"
                checked={executionConfig.headless}
                onCheckedChange={(checked) => handleSwitchChange('headless', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Execution Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <h3 className="text-sm font-medium">Execution Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retries">Retries</Label>
              <Input
                id="retries"
                type="number"
                min="0"
                max="5"
                value={executionConfig.retries}
                onChange={(e) => handleNumberChange('retries', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Number of retry attempts on failure</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                min="5000"
                max="120000"
                step="1000"
                value={executionConfig.timeout}
                onChange={(e) => handleNumberChange('timeout', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Test timeout in milliseconds</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxFailures">Max Failures</Label>
              <Input
                id="maxFailures"
                type="number"
                min="1"
                max="10"
                value={executionConfig.maxFailures}
                onChange={(e) => handleNumberChange('maxFailures', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Stop after this many failures</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="parallel">Parallel Execution</Label>
                <p className="text-xs text-muted-foreground">Run tests in parallel (experimental)</p>
              </div>
              <Switch
                id="parallel"
                checked={executionConfig.parallel}
                onCheckedChange={(checked) => handleSwitchChange('parallel', checked)}
              />
            </div>

            {executionConfig.parallel && (
              <div className="space-y-2">
                <Label htmlFor="workers">Workers</Label>
                <Input
                  id="workers"
                  type="number"
                  min="1"
                  max="8"
                  value={executionConfig.workers}
                  onChange={(e) => handleNumberChange('workers', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Number of parallel workers</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Debugging Features */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <h3 className="text-sm font-medium">Debugging Features</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <div>
                  <Label htmlFor="screenshots">Screenshots</Label>
                  <p className="text-xs text-muted-foreground">Capture on failure</p>
                </div>
              </div>
              <Switch
                id="screenshots"
                checked={executionConfig.screenshots}
                onCheckedChange={(checked) => handleSwitchChange('screenshots', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <div>
                  <Label htmlFor="videos">Videos</Label>
                  <p className="text-xs text-muted-foreground">Record on failure</p>
                </div>
              </div>
              <Switch
                id="videos"
                checked={executionConfig.videos}
                onCheckedChange={(checked) => handleSwitchChange('videos', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <div>
                  <Label htmlFor="tracing">Tracing</Label>
                  <p className="text-xs text-muted-foreground">Detailed execution trace</p>
                </div>
              </div>
              <Switch
                id="tracing"
                checked={executionConfig.tracing}
                onCheckedChange={(checked) => handleSwitchChange('tracing', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Output Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Output Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outputDir">Output Directory</Label>
              <Input
                id="outputDir"
                value={executionConfig.outputDir}
                onChange={(e) => updateExecutionConfig({ outputDir: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Directory for test artifacts</p>
            </div>

            <div className="space-y-2">
              <Label>Reporters</Label>
              <div className="flex flex-wrap gap-2">
                {executionConfig.reporters.map((reporter) => (
                  <Badge key={reporter} variant="secondary">
                    {reporter}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Active test reporters</p>
            </div>
          </div>
        </div>

        {/* Current Configuration Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Browser: {executionConfig.browserType} ({executionConfig.headless ? 'headless' : 'headed'})</p>
            <p>Retries: {executionConfig.retries}, Timeout: {executionConfig.timeout}ms, Max Failures: {executionConfig.maxFailures}</p>
            <p>Debugging: {[
              executionConfig.screenshots && 'Screenshots',
              executionConfig.videos && 'Videos', 
              executionConfig.tracing && 'Tracing'
            ].filter(Boolean).join(', ') || 'None'}</p>
            <p>Parallel: {executionConfig.parallel ? `Yes (${executionConfig.workers} workers)` : 'No'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
