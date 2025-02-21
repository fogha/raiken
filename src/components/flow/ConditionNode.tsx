"use client"

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { SplitSquareVertical } from 'lucide-react';

function ConditionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-yellow-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2">
        <SplitSquareVertical className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="true"
        className="w-3 h-3 bg-green-500"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="false"
        className="w-3 h-3 bg-red-500"
      />
    </div>
  );
}

export default memo(ConditionNode);
