"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from 'lucide-react';
import { TestConfig, defaultConfig } from '@/types/config';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';

interface TestScriptConfig {
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
}

interface AdvancedConfig {
  timeout: number;
  captureScreenshots: boolean;
  retryOnFailure: boolean;
  retryCount: number;
  recordVideo: boolean;
  traceEnabled: boolean;
  debugMode: boolean;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('browser');
  const [config, setConfig] = useState<TestConfig>(defaultConfig);

  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>({
    timeout: 30000,
    captureScreenshots: true,
    retryOnFailure: false,
    retryCount: 1,
    recordVideo: false,
    traceEnabled: false,
    debugMode: false
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('artenConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
      
      const savedAdvancedConfig = localStorage.getItem('artenAdvancedConfig');
      if (savedAdvancedConfig) {
        setAdvancedConfig(prev => ({
          ...prev,
          ...JSON.parse(savedAdvancedConfig)
        }));
      }
    } catch (error) {
      console.error('Error loading saved configuration:', error);
    }
  }, []);

  const handleConfigChange = (newConfig: TestConfig) => {
    setConfig(newConfig);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const updateAdvancedConfig = (key: keyof AdvancedConfig, value: any) => {
    setAdvancedConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const saveChanges = () => {
    try {
      localStorage.setItem('artenConfig', JSON.stringify(config));
      localStorage.setItem('artenAdvancedConfig', JSON.stringify(advancedConfig));
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
    setAdvancedConfig({
      timeout: 30000,
      captureScreenshots: true,
      retryOnFailure: false,
      retryCount: 1,
      recordVideo: false,
      traceEnabled: false,
      debugMode: false
    });
    setHasChanges(true);
    setSaveSuccess(false);
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
            Settings
          </h1>
        </div>
        
        <div className="flex gap-2 items-center">
          {saveSuccess && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <Check className="h-4 w-4 mr-1" /> Saved
            </span>
          )}
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              Reset
            </Button>
          )}
          <Button
            variant={hasChanges ? "default" : "secondary"}
            size="sm"
            onClick={saveChanges}
            disabled={!hasChanges}
          >
            {hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>
      <div className="mt-6">
        <ConfigurationPanel
          config={config}
          onChange={handleConfigChange}
        />
      </div>
    </div>
  );
}
