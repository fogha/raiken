"use client"
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Layout, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/core/common/utils";
import { ChevronRight, ChevronDown } from 'lucide-react';

import { DOMNode } from '@/types/dom';
import { useProjectStore } from '@/store/projectStore';

interface SideBarProps {
  onNodeSelect: (node: Element | DOMNode) => void;
}

const TreeNode = ({ node, depth = 0, onSelect }: { 
  node: DOMNode; 
  depth?: number;
  onSelect: (node: Element | DOMNode) => void;
}) => {
  const { setSelectedNode } = useProjectStore();
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Keep local UI state

  const hasChildren = node.children && node.children.length > 0;

  const highlightElement = () => {
    // Find all iframes in the document (including ones inside SimpleBrowser)
    const iframes = document.querySelectorAll('iframe');
    
    // Message to send to highlight the element
    const message = {
      type: 'HIGHLIGHT_ELEMENT',
      payload: {
        tagName: node.tagName,
        id: node.id,
        className: node.className
      }
    };
    
    // Send to all iframes to ensure it reaches the correct one
    iframes.forEach(iframe => {
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(message, '*');
        } catch (e) {
          console.error('[Arten] Error sending highlight message:', e);
        }
      }
    });
    
    // Also dispatch a custom event that SimpleBrowser can listen for
    window.dispatchEvent(new CustomEvent('arten:highlight-element', { detail: message.payload }));
  };

  const clearHighlight = () => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage({
      type: 'CLEAR_HIGHLIGHT'
    }, '*');
  };

  return (
    <div>
      <div 
        className={cn(
          "flex items-center py-1.5 px-1 rounded-sm cursor-pointer text-sm transition-colors",
          "hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${depth * 10}px` }}
        onClick={() => {
          onSelect(node);
          setSelectedNode(node);
          highlightElement();
        }}
        onMouseEnter={highlightElement}
        onMouseLeave={clearHighlight}
      >
        {hasChildren && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mr-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isExpanded ? "Collapse node" : "Expand node"}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        <span className="font-mono text-xs">
          <span className="text-orange-500 dark:text-orange-400">{node.tagName.toLowerCase()}</span>
          {node.id && <span className="text-blue-500 dark:text-blue-400 ml-1">#{node.id}</span>}
          {node.className && (
            <span className="text-emerald-600 dark:text-emerald-400 ml-1">.{node.className.split(' ')[0]}{node.className.split(' ').length > 1 && '...'}</span>
          )}
        </span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode 
              key={index}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SideBar = ({ onNodeSelect }: SideBarProps) => {
  const { domTree, sidebarCollapsed, setDomTree, setSidebarCollapsed } = useProjectStore();

  useEffect(() => {
    // Listen for direct postMessage events (original method)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DOM_TREE_UPDATE') {
        console.log('[SideBar] Received DOM tree via postMessage');
        setDomTree(event.data.payload);
      }
    };
    
    // Listen for custom events from SimpleBrowser (new method)
    const handleCustomEvent = (event: CustomEvent) => {
      console.log('[SideBar] Received DOM tree via custom event');
      setDomTree(event.detail);
    };

    // Add both event listeners
    window.addEventListener('message', handleMessage);
    window.addEventListener('arten:dom-tree-update', handleCustomEvent as EventListener);
    
    // Clean up both event listeners
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('arten:dom-tree-update', handleCustomEvent as EventListener);
    };
  }, []); // Only run on mount

  return (
    <div className={cn(
      "transition-all duration-300 ease-in-out h-full",
      sidebarCollapsed ? "w-10" : "w-[280px]"
    )}>
      <div className="h-full bg-background/60 backdrop-blur-sm flex flex-col relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-0.5 z-10 h-5 w-5 opacity-60 hover:opacity-100 text-muted-foreground hover:bg-transparent"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <PanelLeft size={12} /> : <PanelLeftClose size={12} />}
        </Button>
        
        {!sidebarCollapsed && (
          <>
            <div className="pt-2 pb-1 px-2"></div>
            
            <div className="flex-1 overflow-auto pt-1">
              <div className="px-1 h-full">
                {domTree ? (
                  <div className="overflow-x-auto">
                    <TreeNode node={domTree} onSelect={onNodeSelect} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-4">
                    <Layout className="h-8 w-8 text-muted-foreground/20" />
                    <div>
                      <h3 className="text-xs font-medium mb-1 text-muted-foreground">No DOM Tree Available</h3>
                      <p className="text-xs text-muted-foreground/70 max-w-[220px]">
                        No page elements available yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SideBar;