"use client";

import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  TestTube, 
  BookOpen, 
  Github, 
  Settings, 
  Play, 
  Globe, 
  Zap,
  Activity,
  BarChart3,
  Code2,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { DOMNode } from '@/types/dom';
import { useProjectStore } from '@/store/projectStore';
import { TestBuilder, TestBuilderHeader } from '@/core/testing/ui/TestBuilder';
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useLocalBridge } from '@/hooks/useLocalBridge';
import { useBrowser } from '@/hooks/useBrowser';

interface TestsPageProps {
  children?: React.ReactNode;
}

const TestsPage: React.FC<TestsPageProps> = ({ children }) => {
  const pathname = usePathname();
  
  const {
    url,
    loadError,
    selectedNode,
    setSelectedNode,
    setDomTree,
  } = useProjectStore();

  // Test generation is now handled by React Query in TestBuilder
  const { isConnected } = useLocalBridge();
  const { navigateAndExtract, isNavigatingAndExtracting } = useBrowser();

  // Local state for UI-only concerns
  const [inputUrl, setInputUrl] = React.useState<string>(url || '');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [editorMode, setEditorMode] = React.useState<'json' | 'chat'>('json');

  // Handle DOM tree updates
  const handleDOMTreeUpdate = (newDomTree: DOMNode | null) => {
    console.log('[Raiken] DOM tree received in TestsPage');
    setDomTree(newDomTree);
  };

  const handleTestGenerated = (testScript: string) => {
    // Test generation is managed by useTestGeneration hook in TestBuilder
    console.log('Test generated:', testScript);
  };

  // Load URL and extract DOM using TanStack Query
  const handleLoadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    console.log('Loading URL:', inputUrl);
    
    try {
      const domTree = await navigateAndExtract({ url: inputUrl });
      handleDOMTreeUpdate(domTree);
      setError(null);
      console.log('Navigation and DOM extraction successful');
    } catch (error) {
      console.error('Error during URL load:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigationItems = [
    {
      href: '/tests/editor',
      label: 'Editor',
      icon: Code2,
      description: 'Create and edit tests',
      color: 'text-blue-500'
    },
    {
      href: '/tests/manager',
      label: 'Manager',
      icon: Activity,
      description: 'Manage test files',
      color: 'text-green-500'
    },
    {
      href: '/tests/reports',
      label: 'Reports',
      icon: BarChart3,
      description: 'View test results',
      color: 'text-purple-500'
    }
  ];

  const isActiveTab = (href: string) => pathname === href;

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950">
      {/* Error toast for URL loading errors */}
      {loadError && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <div>
              <span className="font-medium">Connection Error</span>
              <p className="text-sm opacity-90">{loadError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full px-4">
        <header className="h-20 bg-white dark:bg-slate-900 flex items-center justify-between px-6 py-4 rounded-b-2xl shadow-lg sticky top-0 z-20">
          {/* Left: Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Raiken</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Intelligent Testing</p>
            </div>
          </div>

          {/* Center: URL Input */}
          <div className="flex-1 max-w-2xl mx-6">
            <form onSubmit={handleLoadUrl} className="flex gap-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Enter URL to test (e.g., https://example.com)"
                  className="pl-10 h-10 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !inputUrl.trim()} 
                className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Load
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 min-w-0">
            <Badge 
              variant="outline" 
              className={`text-xs font-medium bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hidden sm:flex ${
                isConnected ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'
              }`}
            >
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <Wifi className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
                  <WifiOff className="w-3 h-3 mr-1" />
                  No Project
                </>
              )}
            </Badge>
            
            <div className="flex items-center gap-0.5">
              <Link 
                href="https://raiken-docs.vercel.app/" 
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                title="Documentation"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </Link>
              <Link 
                href="https://github.com/fogha/raiken" 
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                title="GitHub"
              >
                <Github className="w-3.5 h-3.5" />
              </Link>
              <Link 
                href="/settings" 
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 bg-white dark:bg-slate-950">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Main browser panel */}
            <ResizablePanel defaultSize={70} minSize={50}>
              <div className="h-full relative py-4 mr-2">
                <Card className="w-full h-full overflow-hidden rounded-2xl border-none bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="flex-1 p-0 relative">
                    
                    {/* Navigation Tabs */}
                    <div className="h-14 bg-gradient-to-r from-white/50 to-white/30 dark:from-slate-900/50 dark:to-slate-900/30 backdrop-blur-md">
                      <div className="flex items-center px-6 h-full gap-1">
                        {navigationItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActiveTab(item.href);
                          
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`
                                flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-all relative group rounded-lg
                                ${active 
                                  ? 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 shadow-sm' 
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                }
                              `}
                            >
                              <Icon className={`w-3.5 h-3.5 transition-all flex-shrink-0 ${active ? `${item.color} scale-110` : 'group-hover:scale-110'}`} />
                              <span className="font-semibold text-xs tracking-wide">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1" style={{ height: 'calc(100vh - 160px)' }}>
                      {error ? (
                        <div className="p-12 flex items-center justify-center h-full">
                          <div className="text-center max-w-md">
                            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-red-200/50 dark:border-red-900/30">
                              <Zap className="w-7 h-7 text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">Connection Failed</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{error}</p>
                            <Button 
                              onClick={() => setError(null)}
                              className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                              size="sm"
                            >
                              Try Again
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full">
                          {children}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="mx-0 w-0 bg-transparent hover:bg-blue-500/20 transition-colors" />

            {/* Right panel with Test Builder */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
              <div className="h-full flex flex-col py-4">
                <div className="h-full ml-2 flex flex-col rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                  {/* Panel Header */}
                  <div className="h-16 px-5 bg-gradient-to-r from-white/50 to-white/30 dark:from-slate-900/50 dark:to-slate-900/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                        <TestTube className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight truncate">Test Builder</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-none truncate font-medium">AI-Powered Testing</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 pl-3">
                      <TestBuilderHeader editorMode={editorMode} onModeChange={setEditorMode} />
                    </div>
                  </div>

                  {/* Test Builder Content */}
                  <div className="flex-1 overflow-hidden bg-gradient-to-b from-white/20 to-white/5 dark:from-slate-900/20 dark:to-slate-900/5 px-2">
                    <TestBuilder
                      selectedNode={selectedNode}
                      onTestGenerated={handleTestGenerated}
                      editorMode={editorMode}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

export default TestsPage;