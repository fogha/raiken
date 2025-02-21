import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { TestConfig, defaultConfig } from '@/types/config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ConfigurationPanelProps {
  config: TestConfig;
  onChange: (config: TestConfig) => void;
}

export function ConfigurationPanel({ config, onChange }: ConfigurationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="execution">
          <TabsList>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="playwright">Playwright</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="execution" className="space-y-4">
            <div className="space-y-2">
              <Label>Execution Mode</Label>
              <Select 
                value={config.execution.mode}
                onValueChange={(value: 'browser' | 'service') => 
                  onChange({ ...config, execution: { ...config.execution, mode: value } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Browser</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.execution.mode === 'service' && (
              <div className="space-y-2">
                <Label>Service Endpoint</Label>
                <Input 
                  value={config.execution.endpoint}
                  onChange={(e) => 
                    onChange({ ...config, execution: { ...config.execution, endpoint: e.target.value } })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Save Tests</Label>
              <Switch 
                checked={config.execution.saveTests}
                onCheckedChange={(checked) => 
                  onChange({ ...config, execution: { ...config.execution, saveTests: checked } })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Real-time Results</Label>
              <Switch 
                checked={config.execution.realTimeResults}
                onCheckedChange={(checked) => 
                  onChange({ ...config, execution: { ...config.execution, realTimeResults: checked } })}
              />
            </div>
          </TabsContent>

          <TabsContent value="recording" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Recording</Label>
              <Switch 
                checked={config.recording.enabled}
                onCheckedChange={(checked) => 
                  onChange({ ...config, recording: { ...config.recording, enabled: checked } })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto Selectors</Label>
              <Switch 
                checked={config.recording.autoSelectors}
                onCheckedChange={(checked) => 
                  onChange({ ...config, recording: { ...config.recording, autoSelectors: checked } })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Smart Assertions</Label>
              <Switch 
                checked={config.recording.smartAssertions}
                onCheckedChange={(checked) => 
                  onChange({ ...config, recording: { ...config.recording, smartAssertions: checked } })}
              />
            </div>
          </TabsContent>

          <TabsContent value="playwright" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Network Interception</Label>
                <Switch 
                  checked={config.playwright.features.network}
                  onCheckedChange={(checked) => 
                    onChange({
                      ...config,
                      playwright: {
                        ...config.playwright,
                        features: { ...config.playwright.features, network: checked }
                      }
                    })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Screenshots</Label>
                <Switch 
                  checked={config.playwright.features.screenshots}
                  onCheckedChange={(checked) => 
                    onChange({
                      ...config,
                      playwright: {
                        ...config.playwright,
                        features: { ...config.playwright.features, screenshots: checked }
                      }
                    })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Video Recording</Label>
                <Switch 
                  checked={config.playwright.features.video}
                  onCheckedChange={(checked) => 
                    onChange({
                      ...config,
                      playwright: {
                        ...config.playwright,
                        features: { ...config.playwright.features, video: checked }
                      }
                    })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Tracing</Label>
                <Switch 
                  checked={config.playwright.features.tracing}
                  onCheckedChange={(checked) => 
                    onChange({
                      ...config,
                      playwright: {
                        ...config.playwright,
                        features: { ...config.playwright.features, tracing: checked }
                      }
                    })}
                />
              </div>

              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input 
                  type="number"
                  value={config.playwright.timeout}
                  onChange={(e) => 
                    onChange({
                      ...config,
                      playwright: { ...config.playwright, timeout: parseInt(e.target.value) }
                    })}
                />
              </div>

              <div className="space-y-2">
                <Label>Retries</Label>
                <Input 
                  type="number"
                  value={config.playwright.retries}
                  onChange={(e) => 
                    onChange({
                      ...config,
                      playwright: { ...config.playwright, retries: parseInt(e.target.value) }
                    })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Select 
                value={config.storage.location}
                onValueChange={(value: 'local' | 'remote') => 
                  onChange({ ...config, storage: { ...config.storage, location: value } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Storage Path</Label>
              <Input 
                value={config.storage.path}
                onChange={(e) => 
                  onChange({ ...config, storage: { ...config.storage, path: e.target.value } })}
              />
            </div>

            <div className="space-y-2">
              <Label>File Format</Label>
              <Select 
                value={config.storage.format}
                onValueChange={(value: 'json' | 'typescript') => 
                  onChange({ ...config, storage: { ...config.storage, format: value } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 