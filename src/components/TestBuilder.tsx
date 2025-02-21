"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Plus, Play, Save, ChevronRight, ChevronLeft, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { TestCase, TestStep } from '@/types/test';
import { TestScriptEditor } from './TestScriptEditor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConfigurationPanel } from './ConfigurationPanel';
import { TestConfig, defaultConfig } from '@/types/config';
import { TestExecutor } from '@/lib/test-execution';

export function TestBuilder() {
  const [config, setConfig] = useState<TestConfig>(defaultConfig);
  const [testScript, setTestScript] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  const handleRunTest = async () => {
    setIsRunning(true);
    try {
      const executor = new TestExecutor(config);
      const { results, error } = await executor.runTest(testScript);
      setResults(results);
      if (error) throw error;
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const syntaxDocs = {
    overview: "Write tests using Playwright's syntax with additional AI-powered features.",
    sections: [
      {
        title: "Basic Test Structure",
        content: `test('test name', async ({ page }) => {
  // Navigation
  await page.goto('https://example.com');
  
  // Interactions
  await page.click('#submit-button');
  await page.fill('#email', 'test@example.com');
  
  // Assertions
  await expect(page.locator('.success')).toBeVisible();
});`
      },
      {
        title: "Common Actions",
        items: [
          { name: "Navigation", syntax: "await page.goto('url')" },
          { name: "Click", syntax: "await page.click('selector')" },
          { name: "Type", syntax: "await page.fill('selector', 'text')" },
          { name: "Wait", syntax: "await page.waitForSelector('selector')" }
        ]
      },
      {
        title: "Assertions",
        items: [
          { name: "Visibility", syntax: "await expect(page.locator('selector')).toBeVisible()" },
          { name: "Text Content", syntax: "await expect(page.locator('selector')).toHaveText('text')" },
          { name: "Element Count", syntax: "await expect(page.locator('selector')).toHaveCount(1)" }
        ]
      },
      {
        title: "Selectors",
        content: `// Text content
text=Submit

// CSS selectors
.class-name
#button-id

// Combinations
button:has-text("Submit")
.form-field :text-is("Email")`
      }
    ]
  };

  return (
    <div className="space-y-4 p-4 relative min-h-screen">
      <div className="flex justify-between items-center mb-2">
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => setIsConfigOpen(!isConfigOpen)}
        >
          <h3 className="text-lg font-semibold">Test Configuration</h3>
          <Button variant="ghost" size="sm" className="ml-2">
            {isConfigOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDocsOpen(!isDocsOpen)}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Documentation
          {isDocsOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isConfigOpen ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
      )}>
        <ConfigurationPanel
          config={config}
          onChange={setConfig}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TestScriptEditor
            value={testScript}
            onChange={setTestScript}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setTestScript('')}
            >
              Clear
            </Button>
            <Button
              onClick={handleRunTest}
              disabled={!testScript || isRunning}
            >
              {isRunning ? 'Running...' : 'Run Test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Results display */}
          </CardContent>
        </Card>
      )}

      <div 
        className={cn(
          "fixed top-[80px] right-4 h-[calc(100vh-96px)]",
          "w-[400px] shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.1)]",
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
          "transform transition-transform duration-300 ease-in-out z-50",
          "overflow-hidden rounded-lg border flex flex-col",
          isDocsOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ 
          maxWidth: "calc(100vw - 2rem)"
        }}
      >
        <div className="flex justify-between items-center p-6 pb-4 border-b shadow-sm bg-background">
          <h2 className="text-xl font-semibold">Test Documentation</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDocsOpen(false)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div className="space-y-2">
              <p className="text-muted-foreground">{syntaxDocs.overview}</p>
            </div>

            {syntaxDocs.sections.map((section, index) => (
              <div key={index} className="space-y-3">
                <h3 className="font-medium text-lg">{section.title}</h3>
                {section.content && (
                  <pre className="bg-muted/50 p-3 rounded-md text-sm font-mono whitespace-pre w-[360px]">
                    {section.content}
                  </pre>
                )}
                {section.items && (
                  <div className="space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <pre className="bg-muted/50 p-1 rounded text-sm font-mono whitespace-pre w-[360px]">
                          {item.syntax}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
