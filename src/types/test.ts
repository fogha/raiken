export type TestAction = 
  | { type: 'click'; selector: string }
  | { type: 'type'; selector: string; value: string }
  | { type: 'assert'; selector: string; assertion: 'exists' | 'notExists' | 'hasText' | 'hasValue' }
  | { type: 'wait'; duration: number }
  | { type: 'hover'; selector: string }
  | { type: 'press'; key: string };

export interface TestStep {
  id: string;
  action: TestAction;
  description: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  cases: TestCase[];
}

export interface TestGenerationPrompt {
  description: string;
  requirements?: string[];
  expectations?: string[];
  url?: string;
  target?: string; // Target URL for the test
  additionalContext?: string; // Additional context like JSON test script
}

export interface TestGenerationResult {
  success: boolean;
  code?: string;
  error?: string;
}

// Test configuration types
export interface TestScriptConfig {
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
}

// Test result types
export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

// Test tab types
export interface TestTab {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'json';
  config: TestScriptConfig;
  isRunning?: boolean;
  results?: TestResult[];
  error?: string;
}

// Component props types
export interface TabbedTestEditorProps {
  onRunTest: (scriptContent: string, scriptId: string, config: TestScriptConfig) => Promise<void>;
  onCloseTab?: (tabId: string) => Promise<void>;
  initialScript?: string;
  globalConfig: TestScriptConfig;
  onRef?: (ref: { addNewTab: (content: string, name: string) => string }) => void;
}
