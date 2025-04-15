import { Node as ReactFlowNode } from 'reactflow';

export interface FlowNode extends ReactFlowNode {
  type: 'action' | 'condition' | 'assertion' | 'input' | 'wait';
  data: {
    label: string;
    action?: {
      type: 'click' | 'input' | 'select' | 'wait' | 'assert' | 'start';
      selector: string;
      value?: string;
      timeout?: number;
      assertion?: (element: Element) => Promise<boolean>;
    };
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'success' | 'failure';
}

export interface TestFlow {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface TestResult {
  nodeId: string;
  success: boolean;
  message: string;
  timestamp: number;
}

// Also add RecordedEvent type
export interface RecordedEvent {
  type: string;
  path: string;
  value?: string;
  timestamp: number;
}

export interface TestFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: {
      element: {
        type: "string";
        description: string;
      };
      action?: {
        type: "string";
        enum: ["click", "type", "assert", "wait", "hover"];
      };
      value?: {
        type: "string";
        description: string;
      };
      assertion?: {
        type: "string";
        enum: ["exists", "visible", "contains", "equals", "enabled"];
      };
    };
    required: string[];
  };
}

export const testFunctions: TestFunction[] = [
  {
    name: "click",
    description: "Click on an element on the page",
    parameters: {
      type: "object",
      properties: {
        element: {
          type: "string",
          description: "Description of the element to click (e.g., 'Submit button', 'Login link')"
        }
      },
      required: ["element"]
    }
  },
  {
    name: "type",
    description: "Type text into an input field",
    parameters: {
      type: "object",
      properties: {
        element: {
          type: "string",
          description: "Description of the input field (e.g., 'Email input', 'Password field')"
        },
        value: {
          type: "string",
          description: "The text to type into the field"
        }
      },
      required: ["element", "value"]
    }
  },
  // ... more functions
];
