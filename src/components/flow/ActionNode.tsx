"use client"

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MousePointer, Type, Eye } from 'lucide-react';

function ActionNode({ data }: { data: any }) {
  const getIcon = () => {
    if (!data.action) return null;
    switch (data.action.type) {
      case 'click':
        return <MousePointer className="w-4 h-4" />;
      case 'type':
        return <Type className="w-4 h-4" />;
      case 'hover':
        return <Eye className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(ActionNode);
