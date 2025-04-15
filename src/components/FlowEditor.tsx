import { useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore } from '@/store/flowStore';
import { FlowNode, FlowEdge } from '@/types/flow';
import ActionNode from './flow/ActionNode';
import WaitNode from './flow/WaitNode';
import InputNode from './flow/InputNode';
import AssertionNode from './flow/AssertionNode';
import ConditionNode from './flow/ConditionNode';

const nodeTypes = {
  action: ActionNode,
  wait: WaitNode,
  input: InputNode,
  assertion: AssertionNode,
  condition: ConditionNode,
};

export function FlowEditor() {
  const {
    currentFlow,
    isEditing,
    setCurrentFlow,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
  } = useFlowStore();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!currentFlow) return;
      
      const updatedNodes = applyNodeChanges(changes, currentFlow.nodes) as FlowNode[];
      setCurrentFlow({ ...currentFlow, nodes: updatedNodes });
    },
    [currentFlow, setCurrentFlow]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!currentFlow) return;
      
      const updatedEdges = applyEdgeChanges(changes, currentFlow.edges) as FlowEdge[];
      setCurrentFlow({ ...currentFlow, edges: updatedEdges });
    },
    [currentFlow, setCurrentFlow]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!currentFlow) return;
      
      const edge: FlowEdge = {
        id: `e${currentFlow.edges.length + 1}`,
        source: connection.source!,
        target: connection.target!,
      };
      addEdge(edge);
    },
    [currentFlow, addEdge]
  );

  if (!currentFlow) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No flow selected</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={currentFlow.nodes}
        edges={currentFlow.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
} 