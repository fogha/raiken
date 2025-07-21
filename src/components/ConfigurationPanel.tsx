import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useConfigurationStore } from '@/store/configurationStore';
import { SUPPORTED_MODELS } from '@/core/testing/services/openrouter.service';

export function ConfigurationPanel() {
  const {
    config,
    activeTab,
    setActiveTab,
    updateExecutionConfig,
    updateRecordingConfig,
    updatePlaywrightConfig,
    updateApiConfig,
    updateStorageConfig
  } = useConfigurationStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="playwright">Playwright</TabsTrigger>
            <TabsTrigger value="ai">AI Models</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="execution" className="space-y-4">
            <div className="space-y-2">
              <Label>Browser Engine</Label>
              <Select 
                value={config.execution.browserType}
                onValueChange={(value: 'chromium' | 'firefox' | 'webkit') => 
                  updateExecutionConfig({ browserType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromium">Chromium (Default)</SelectItem>
                  <SelectItem value="firefox">Firefox</SelectItem>
                  <SelectItem value="webkit">WebKit (Safari)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Retry Count</Label>
              <Input 
                type="number"
                min="0"
                max="10"
                value={config.execution.retries}
                onChange={(e) => 
                  updateExecutionConfig({ retries: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Number of times to retry failed tests (0 = no retries)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Execution Mode</Label>
              <Select 
                value={config.execution.mode}
                onValueChange={(value: 'browser' | 'service') => 
                  updateExecutionConfig({ mode: value })}
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
                    updateExecutionConfig({ endpoint: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Save Tests</Label>
              <Switch 
                checked={config.execution.saveTests}
                onCheckedChange={(checked) => 
                  updateExecutionConfig({ saveTests: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Real-time Results</Label>
              <Switch 
                checked={config.execution.realTimeResults}
                onCheckedChange={(checked) => 
                  updateExecutionConfig({ realTimeResults: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Headless Mode</Label>
              <Switch
                checked={config.execution.headless}
                onCheckedChange={(checked) => 
                  updateExecutionConfig({ headless: checked })}
              />
            </div>


          </TabsContent>

          <TabsContent value="recording" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Recording</Label>
              <Switch 
                checked={config.recording.enabled}
                onCheckedChange={(checked) => 
                  updateRecordingConfig({ enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto Selectors</Label>
              <Switch 
                checked={config.recording.autoSelectors}
                onCheckedChange={(checked) => 
                  updateRecordingConfig({ autoSelectors: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Smart Assertions</Label>
              <Switch 
                checked={config.recording.smartAssertions}
                onCheckedChange={(checked) => 
                  updateRecordingConfig({ smartAssertions: checked })}
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
                    updatePlaywrightConfig({
                      features: { ...config.playwright.features, network: checked }
                    })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Screenshots</Label>
                <Switch 
                  checked={config.playwright.features.screenshots}
                  onCheckedChange={(checked) => 
                    updatePlaywrightConfig({
                      features: { ...config.playwright.features, screenshots: checked }
                    })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Video Recording</Label>
                <Switch 
                  checked={config.playwright.features.video}
                  onCheckedChange={(checked) => 
                    updatePlaywrightConfig({
                      features: { ...config.playwright.features, video: checked }
                    })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Tracing</Label>
                <Switch 
                  checked={config.playwright.features.tracing}
                  onCheckedChange={(checked) => 
                    updatePlaywrightConfig({
                      features: { ...config.playwright.features, tracing: checked }
                    })}
                />
              </div>

              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input 
                  type="number"
                  value={config.playwright.timeout}
                  onChange={(e) => 
                    updatePlaywrightConfig({ timeout: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Retries</Label>
                <Input 
                  type="number"
                  value={config.playwright.retries}
                  onChange={(e) => 
                    updatePlaywrightConfig({ retries: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div className="space-y-2">
              <Label>OpenRouter API Key</Label>
              <Input 
                type="password"
                placeholder="sk-or-..."
                value={config.api.apiKey || ''}
                onChange={(e) => 
                  updateApiConfig({ apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your OpenRouter API key at openrouter.ai
              </p>
            </div>

            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select 
                value={config.api.model || ''}
                onValueChange={(value: string) => 
                  updateApiConfig({ model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_MODELS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Models with stronger capabilities will generate better test scripts
              </p>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Select 
                value={config.storage.location}
                onValueChange={(value: 'local' | 'remote') => 
                  updateStorageConfig({ location: value })}
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
                  updateStorageConfig({ path: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>File Format</Label>
              <Select 
                value={config.storage.format}
                onValueChange={(value: 'json' | 'typescript') => 
                  updateStorageConfig({ format: value })}
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