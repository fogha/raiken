"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { TestExecutionSettings } from '@/components/TestExecutionSettings';
import { useConfigurationStore } from '@/store/configurationStore';
import { useTestGeneration } from '@/hooks/useTestGeneration';

export function SettingsPage() {
  const { reset } = useConfigurationStore();
  const { resetExecutionConfig } = useTestGeneration();

  const handleResetAll = () => {
    reset();
    resetExecutionConfig();
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            Test Configuration Settings
          </h1>
        </div>
        
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            Reset All to Defaults
          </Button>
        </div>
      </div>
      
      <div className="space-y-8">
        {/* New Test Execution Settings */}
        <div>
          <TestExecutionSettings />
        </div>
        
        {/* Legacy Configuration Panel */}
        <div>
          <ConfigurationPanel />
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Configuration Info</h3>
        <p className="text-xs text-muted-foreground">
          Settings are automatically saved when changed. The Test Execution Settings above control how tests are run, 
          while the Configuration Panel below contains legacy settings. All configurations will be used for Playwright 
          test executions, including browser selection, retry behavior, timeouts, and debugging features.
        </p>
      </div>
    </div>
  );
}
