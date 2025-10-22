import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useConfigurationStore } from '@/store/configurationStore';
import { SUPPORTED_MODELS } from '@/core/testing/services/openrouter.service';

export function ConfigurationPanel() {
  const store = useConfigurationStore();
  const { config, activeTab } = store;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Configuration</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure settings for interactive browsing and AI test generation. 
          Test execution is handled by the CLI bridge system.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => store.setActiveTab(value as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="ai">AI Models</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="execution" className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> These settings apply to interactive browsing and DOM extraction. 
                Actual test execution uses CLI bridge with per-test configurations.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Browser Engine</Label>
              <Select 
                value={config.execution.browserType}
                onValueChange={(value: 'chromium' | 'firefox' | 'webkit') => 
                  store.updateExecutionConfig({ browserType: value })}
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
              <p className="text-xs text-muted-foreground">
                Browser engine for DOM extraction and interactive browsing
              </p>
            </div>

            <div className="space-y-2">
              <Label>Retry Count</Label>
              <Input 
                type="number"
                min="0"
                max="10"
                value={config.execution.retries}
                onChange={(e) => 
                  store.updateExecutionConfig({ retries: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Number of times to retry failed tests (0 = no retries)
              </p>
            </div>


            <div className="flex items-center justify-between">
              <Label>Save Tests</Label>
              <Switch 
                checked={config.execution.saveTests}
                onCheckedChange={(checked) => 
                  store.updateExecutionConfig({ saveTests: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Real-time Results</Label>
              <Switch 
                checked={config.execution.realTimeResults}
                onCheckedChange={(checked) => 
                  store.updateExecutionConfig({ realTimeResults: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Headless Mode</Label>
              <Switch
                checked={config.execution.headless}
                onCheckedChange={(checked) => 
                  store.updateExecutionConfig({ headless: checked })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Run browser in headless mode (invisible) for DOM extraction
            </p>


          </TabsContent>

          <TabsContent value="recording" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Recording</Label>
              <Switch 
                checked={config.recording.enabled}
                onCheckedChange={(checked) => 
                  store.updateRecordingConfig({ enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto Selectors</Label>
              <Switch 
                checked={config.recording.autoSelectors}
                onCheckedChange={(checked) => 
                  store.updateRecordingConfig({ autoSelectors: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Smart Assertions</Label>
              <Switch 
                checked={config.recording.smartAssertions}
                onCheckedChange={(checked) => 
                  store.updateRecordingConfig({ smartAssertions: checked })}
              />
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
                  store.updateApiConfig({ apiKey: e.target.value })}
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
                  store.updateApiConfig({ model: value })}
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
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg mb-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>CLI Bridge:</strong> Tests are automatically saved to your local project directory 
                when using the CLI bridge connection.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Select 
                value={config.storage.location}
                onValueChange={(value: 'local' | 'remote') => 
                  store.updateStorageConfig({ location: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Project</SelectItem>
                  <SelectItem value="remote">Remote Storage</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Local project storage is recommended when using CLI bridge
              </p>
            </div>

            <div className="space-y-2">
              <Label>Storage Path</Label>
              <Input 
                value={config.storage.path}
                onChange={(e) => 
                  store.updateStorageConfig({ path: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>File Format</Label>
              <Select 
                value={config.storage.format}
                onValueChange={(value: 'typescript') => 
                  store.updateStorageConfig({ format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tests are generated as TypeScript files for better type safety and IDE support
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 