import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface DOMNodeProps {
  node: any;
  depth: number;
  onSelect: (node: any) => void;
  selectedPath?: string;
}

const DOMNode = ({ node, depth, onSelect, selectedPath }: DOMNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.path === selectedPath;

  return (
    <div style={{ marginLeft: `${depth * 12}px` }}>
      <div 
        className={`flex items-center py-1 px-2 hover:bg-accent cursor-pointer rounded ${
          isSelected ? 'bg-accent' : ''
        }`}
        onClick={() => onSelect(node)}
      >
        {hasChildren && (
          <button
            className="w-4 h-4 mr-1 hover:bg-accent-foreground/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        <span className="text-sm">
          {node.tagName}
          {node.id && <span className="text-blue-500">#{node.id}</span>}
          {node.className && (
            <span className="text-green-500">.{node.className.split(' ').join('.')}</span>
          )}
        </span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child: any, index: number) => (
            <DOMNode
              key={`${child.path}-${index}`}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DOMTree = ({ 
  rootNode, 
  onNodeSelect,
  selectedPath 
}: { 
  rootNode: any; 
  onNodeSelect: (node: any) => void;
  selectedPath?: string;
}) => {
  if (!rootNode) return null;

  return (
    <div className="overflow-auto">
      <DOMNode 
        node={rootNode} 
        depth={0} 
        onSelect={onNodeSelect}
        selectedPath={selectedPath}
      />
    </div>
  );
}; 