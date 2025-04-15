"use client"

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MousePointer, Type, Eye, Settings } from 'lucide-react';
import { useFlowStore } from '@/store/flowStore';
import { type FlowNode } from '@/types/flow';

interface ActionNodeProps {
  id: string;
  data: FlowNode['data'];
  selected: boolean;
}

function ActionNode({ id, data, selected }: ActionNodeProps) {
  const { setSelectedNode, isEditing } = useFlowStore();

  const getIcon = () => {
    if (!data.action) return <Settings className="w-4 h-4" />;
    switch (data.action.type) {
      case 'click':
        return <MousePointer className="w-4 h-4" />;
      case 'input':
        return <Type className="w-4 h-4" />;
      case 'select':
        return <Eye className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const handleClick = () => {
    if (isEditing) {
      setSelectedNode(id);
    }
  };

  return (
    <div 
      className={`
        px-4 py-2 shadow-md rounded-md bg-white border-2 
        ${selected ? 'border-blue-500' : 'border-gray-200'}
        ${isEditing ? 'cursor-pointer' : 'cursor-default'}
        transition-colors duration-200
      `}
      onClick={handleClick}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-gray-400" 
      />
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium">{data.label}</span>
        {data.action?.value && (
          <span className="text-xs text-gray-500">
            {data.action.value.length > 20 
              ? `${data.action.value.substring(0, 20)}...` 
              : data.action.value}
          </span>
        )}
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-gray-400" 
      />
    </div>
  );
}

export default memo(ActionNode);
