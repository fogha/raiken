"use client"
import { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, Layout, TestTube, Share2 } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';
import SideBar from './SideBar';
import { TestBuilder } from './TestBuilder';
import { FlowStudio } from './FlowStudio';
import { IframeViewer } from './IframeViewer';
import { injectScript } from '@/utils/scriptInjector';
import { TopBar } from './TopBar';

const ProjectViewer = () => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedNode, setSelectedNode] = useState<DOMNode | null>(null);

  const handleLoadProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. Prepare URL
      let targetUrl = url;
      if (url.startsWith('localhost')) {
        targetUrl = `http://${url}`;
      }

      // 2. Wait for iframe to load
      await new Promise<void>((resolve, reject) => {
        if (!iframeRef.current) return reject(new Error('Iframe not found'));
        
        const timeoutId = setTimeout(() => {
          reject(new Error('Loading timed out'));
        }, 10000);

        iframeRef.current.onload = () => {
          clearTimeout(timeoutId);
          resolve();
        };

        // Inject our script and set the URL
        const injectedUrl = injectScript(targetUrl);
        iframeRef.current.src = injectedUrl;
      });

      // 3. Wait for Arten script to initialize and analyze DOM
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('DOM analysis timed out'));
        }, 15000);

        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'DOM_TREE_UPDATE') {
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleMessage);
            resolve();
          }
        };

        window.addEventListener('message', handleMessage);
      });

    } catch (error) {
      console.error('Failed to load project:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTest = async (test: any) => {
    // Implementation of test running logic
    console.log('Running test:', test);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SideBar onNodeSelect={setSelectedNode} />
      <div className="flex flex-col flex-1">
        <TopBar 
          url={url}
          isLoading={isLoading}
          onUrlChange={setUrl}
          onLoadProject={handleLoadProject}
        />
        <div className="flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <IframeViewer 
                url={url} 
                isLoading={isLoading} 
                iframeRef={iframeRef}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-hidden">
                <Tabs defaultValue="test" className="h-full flex flex-col">
                  <div className="border-b px-4 py-2">
                    <TabsList>
                      <TabsTrigger value="test" className="gap-2">
                        <TestTube className="h-4 w-4" />
                        Test Builder
                      </TabsTrigger>
                      <TabsTrigger value="flow" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Flow Studio
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <TabsContent value="test" className="h-full m-0 p-0 data-[state=active]:flex-1">
                      <TestBuilder
                        selectedNode={selectedNode}
                        onRunTest={handleRunTest}
                      />
                    </TabsContent>
                    <TabsContent value="flow" className="h-full m-0 p-0 data-[state=active]:flex-1">
                      <FlowStudio
                        selectedNode={selectedNode}
                        onRunFlow={handleRunTest}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

export default ProjectViewer;
