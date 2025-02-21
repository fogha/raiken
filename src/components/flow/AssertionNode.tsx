import { Handle, Position } from 'reactflow';

const AssertionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200">
    <Handle type="target" position={Position.Top} />
    <div className="font-bold">{data.label}</div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

export default AssertionNode; 