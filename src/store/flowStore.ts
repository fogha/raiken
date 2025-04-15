import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { type FlowNode, type FlowEdge, type TestFlow, type TestResult as FlowTestResult, type RecordedEvent } from '@/types/flow';
import { TestExecutor, type TestResult as ExecutorTestResult } from '@/core/testing/test-executor';
import { type TestGenerationPrompt } from '@/types/test';

// Adapter function to convert executor results to flow results
const adaptExecutorResult = (executorResult: ExecutorTestResult, nodeId: string): FlowTestResult => ({
  nodeId,
  success: executorResult.success,
  message: executorResult.message || '',  // Ensure message is always a string
  timestamp: typeof executorResult.timestamp === 'string' ? Date.parse(executorResult.timestamp) : Date.now()
});

interface FlowState {
  // Active flow
  currentFlow: TestFlow | null;
  selectedNode: string | null;
  isEditing: boolean;
  
  // Flow history
  flows: TestFlow[];
  
  // Test execution
  isExecuting: boolean;
  executionTimeout: number;
  executionStartTime: number | null;
  currentBrowserId: string | null;
  results: FlowTestResult[];
  
  // Recording
  isRecording: boolean;
  recordedEvents: RecordedEvent[];
  
  // Actions
  setCurrentFlow: (flow: TestFlow | null) => void;
  updateFlow: (updates: Partial<TestFlow>) => void;
  addFlow: (flow: TestFlow) => void;
  deleteFlow: (flowId: string) => void;
  
  // Node management
  addNode: (node: FlowNode) => void;
  updateNode: (nodeId: string, updates: Partial<FlowNode>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  
  // Edge management
  addEdge: (edge: FlowEdge) => void;
  updateEdge: (edgeId: string, updates: Partial<FlowEdge>) => void;
  deleteEdge: (edgeId: string) => void;
  
  // Test execution
  startExecution: (browserId: string, timeout?: number) => Promise<void>;
  stopExecution: () => Promise<void>;
  addTestResult: (result: FlowTestResult) => void;
  clearTestResults: () => void;
  checkTimeout: () => boolean;
  
  // Recording
  startRecording: () => void;
  stopRecording: () => void;
  addRecordedEvent: (event: RecordedEvent) => void;
  clearRecordedEvents: () => void;
  
  // Edit mode
  setIsEditing: (isEditing: boolean) => void;
  
  testExecutor: TestExecutor | null;
}

export const useFlowStore = create<FlowState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentFlow: null,
      selectedNode: null,
      isEditing: false,
      flows: [],
      isExecuting: false,
      executionTimeout: 30000, // 30 seconds default
      executionStartTime: null,
      currentBrowserId: null,
      results: [],
      isRecording: false,
      recordedEvents: [],
      testExecutor: null,
      
      // Flow management
      setCurrentFlow: (flow) => 
        set({ currentFlow: flow }, false, 'flow/setCurrentFlow'),
      
      updateFlow: (updates) => 
        set((state) => ({
          currentFlow: state.currentFlow 
            ? { ...state.currentFlow, ...updates }
            : null
        }), false, 'flow/updateFlow'),
      
      addFlow: (flow) =>
        set((state) => ({
          flows: [...state.flows, flow],
          currentFlow: flow
        }), false, 'flow/addFlow'),
      
      deleteFlow: (flowId) =>
        set((state) => ({
          flows: state.flows.filter(f => f.id !== flowId),
          currentFlow: state.currentFlow?.id === flowId ? null : state.currentFlow
        }), false, 'flow/deleteFlow'),
      
      // Node management
      addNode: (node) =>
        set((state) => {
          if (!state.currentFlow) return state;
          return {
            currentFlow: {
              ...state.currentFlow,
              nodes: [...state.currentFlow.nodes, node]
            }
          };
        }, false, 'flow/addNode'),
      
      updateNode: (nodeId, updates) =>
        set((state) => {
          if (!state.currentFlow) return state;
          return {
            currentFlow: {
              ...state.currentFlow,
              nodes: state.currentFlow.nodes.map(node =>
                node.id === nodeId ? { ...node, ...updates } : node
              )
            }
          };
        }, false, 'flow/updateNode'),
      
      deleteNode: (nodeId) =>
        set((state) => {
          if (!state.currentFlow) return state;
          return {
            currentFlow: {
              ...state.currentFlow,
              nodes: state.currentFlow.nodes.filter(node => node.id !== nodeId),
              edges: state.currentFlow.edges.filter(
                edge => edge.source !== nodeId && edge.target !== nodeId
              )
            },
            selectedNode: state.selectedNode === nodeId ? null : state.selectedNode
          };
        }, false, 'flow/deleteNode'),
      
      setSelectedNode: (nodeId) =>
        set({ selectedNode: nodeId }, false, 'flow/setSelectedNode'),
      
      // Edge management
      addEdge: (edge) =>
        set((state) => {
          if (!state.currentFlow) return state;
          return {
            currentFlow: {
              ...state.currentFlow,
              edges: [...state.currentFlow.edges, edge]
            }
          };
        }, false, 'flow/addEdge'),
      
      updateEdge: (edgeId, updates) =>
        set((state) => {
          if (!state.currentFlow) return state;
          return {
            currentFlow: {
              ...state.currentFlow,
              edges: state.currentFlow.edges.map(edge =>
                edge.id === edgeId ? { ...edge, ...updates } : edge
              )
            }
          };
        }, false, 'flow/updateEdge'),
      
      deleteEdge: (edgeId) =>
        set((state) => {
          if (!state.currentFlow) return state;
          return {
            currentFlow: {
              ...state.currentFlow,
              edges: state.currentFlow.edges.filter(edge => edge.id !== edgeId)
            }
          };
        }, false, 'flow/deleteEdge'),
      
      // Test execution
      startExecution: async (browserId: string, timeout?: number) => {
        const state = get();
        if (!state.currentFlow) {
          throw new Error('No flow selected for execution');
        }

        try {
          // Initialize TestExecutor if not already done
          if (!state.testExecutor) {
            const testExecutor = new TestExecutor({
              apiKey: process.env.OPENROUTER_API_KEY || '',
              timeout: timeout || 30000
            });
            set({ testExecutor }, false, 'flow/initTestExecutor');
          }

          // Start execution state
          set({
            isExecuting: true,
            executionStartTime: Date.now(),
            currentBrowserId: browserId,
            executionTimeout: timeout || state.executionTimeout
          }, false, 'flow/startExecution');

          // Generate and run test script
          const script = await state.testExecutor?.generateScript({
            description: state.currentFlow.description,
            target: state.currentFlow.id,
            additionalContext: JSON.stringify(state.currentFlow)
          });

          if (script) {
            const { results, error } = await state.testExecutor?.runTest(script) || {};
            
            if (error) {
              throw error;
            }

            if (results) {
              results.forEach((result: ExecutorTestResult) => {
                // Convert executor result to flow result before adding
                const selectedNode = get().selectedNode;
                const flowResult = adaptExecutorResult(result, selectedNode || 'unknown');
                get().addTestResult(flowResult);
              });
            }
          }
        } catch (error) {
          console.error('Test execution failed:', error);
          get().addTestResult({
            nodeId: 'error',
            success: false,
            message: `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: Date.now()
          });
        } finally {
          await get().stopExecution();
        }
      },
      
      stopExecution: async () => {
        const state = get();
        
        try {
          // Close browser using PlaywrightService
          if (state.currentBrowserId) {
            const response = await fetch('/api/browser', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: 'closeBrowser', 
                scriptId: state.currentBrowserId
              })
            });
            
            if (!response.ok) {
              console.error('Failed to close browser:', await response.text());
            }
          }

          // Save results if we have a TestExecutor
          if (state.testExecutor && state.currentFlow && state.results.length > 0) {
            const resultsWithStringTimestamp = state.results.map(result => ({
              ...result,
              timestamp: new Date(result.timestamp).toISOString()
            }));
            await state.testExecutor.saveResults(
              JSON.stringify(state.currentFlow),
              resultsWithStringTimestamp
            );
          }
        } catch (error) {
          console.error('Error during execution cleanup:', error);
        } finally {
          set({
            isExecuting: false,
            executionStartTime: null,
            currentBrowserId: null
          }, false, 'flow/stopExecution');
        }
      },
      
      addTestResult: (result) =>
        set((state) => ({
          results: [...state.results, result]
        }), false, 'flow/addTestResult'),
      
      clearTestResults: () =>
        set({ results: [] }, false, 'flow/clearTestResults'),
      
      checkTimeout: () => {
        const state = get();
        if (!state.isExecuting || !state.executionStartTime) return false;
        
        const elapsed = Date.now() - state.executionStartTime;
        if (elapsed >= state.executionTimeout) {
          // Stop execution and add timeout result
          get().stopExecution();
          get().addTestResult({
            nodeId: 'timeout',
            success: false,
            message: `Test execution timed out after ${state.executionTimeout}ms`,
            timestamp: Date.now()
          });
          return true;
        }
        return false;
      },
      
      // Recording
      startRecording: () =>
        set({ isRecording: true }, false, 'flow/startRecording'),
      
      stopRecording: () =>
        set({ isRecording: false }, false, 'flow/stopRecording'),
      
      addRecordedEvent: (event) =>
        set((state) => ({
          recordedEvents: [...state.recordedEvents, event]
        }), false, 'flow/addRecordedEvent'),
      
      clearRecordedEvents: () =>
        set({ recordedEvents: [] }, false, 'flow/clearRecordedEvents'),
      
      // Edit mode
      setIsEditing: (isEditing) =>
        set({ isEditing }, false, 'flow/setIsEditing'),
    }),
    {
      name: 'flow-store',
      // Serialize everything except execution state
      serialize: {
        options: {
          map: new Map([
            ['currentFlow', true],
            ['flows', true],
            ['isEditing', true],
            ['executionTimeout', true],
            ['isExecuting', false],
            ['executionStartTime', false],
            ['currentBrowserId', false],
            ['results', false],
            ['isRecording', false],
            ['recordedEvents', false],
            ['testExecutor', false]  // Don't serialize the TestExecutor instance
          ])
        }
      }
    }
  )
); 