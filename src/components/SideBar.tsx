"use client"
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Layout, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from 'lucide-react';

interface DOMNode {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  type: string;
  children: DOMNode[];
}

interface SideBarProps {
  onNodeSelect: (node: DOMNode) => void;
}

const TreeNode = ({ node, depth = 0, onSelect }: { 
  node: DOMNode; 
  depth?: number;
  onSelect: (node: DOMNode) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  const highlightElement = () => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage({
      type: 'HIGHLIGHT_ELEMENT',
      payload: {
        tagName: node.tagName,
        id: node.id,
        className: node.className
      }
    }, '*');
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
        className="flex items-center py-1 hover:bg-accent cursor-pointer"
        style={{ paddingLeft: `${depth * 12}px` }}
        onClick={() => {
          onSelect(node);
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
            className="mr-1"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        <span className="text-sm">
          {node.tagName}
          {node.id && <span className="text-blue-500 ml-1">#{node.id}</span>}
          {node.className && (
            <span className="text-green-500 ml-1">.{node.className}</span>
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
  const [domTree, setDomTree] = useState<DOMNode | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DOM_TREE_UPDATE') {
        setDomTree(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className={cn(
      "transition-all duration-300 ease-in-out",
      isCollapsed ? "w-12" : "w-[320px]"
    )}>
      <Card className="h-full relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </Button>
        
        {!isCollapsed && (
          <>
            <CardHeader className="pb-2">
              <CardTitle>Arten</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto h-[calc(100vh-8rem)] p-4 relative">
                {domTree ? (
                  <div className="min-w-[800px]">
                    <TreeNode node={domTree} onSelect={onNodeSelect} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
                    <Layout className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">No DOM Tree Available</h3>
                      <p className="text-sm text-muted-foreground max-w-[220px]">
                        Enter a URL above and click "Load Project" to analyze the DOM structure.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default SideBar;