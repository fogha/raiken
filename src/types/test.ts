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
  detailedErrors?: DetailedError[];
}

export interface DetailedError {
  message: string;
  stack?: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  testName?: string;
  step?: string;
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

// UI-specific test report interface for displaying execution results
export interface UITestReport {
  id: string;
  timestamp: string;
  testPath: string;
  testName: string;
  success: boolean;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  summary?: string;
  suggestions?: string;
  resultFile: string;
  browser?: string;
  retries?: number;
  rawPlaywrightOutput?: string;
  rawPlaywrightError?: string;
  exitCode?: number;
  
  // Debugging artifacts
  screenshots?: Array<{
    name: string;
    path: string;
    timestamp: string;
    url?: string; // For serving the image
  }>;
  videos?: Array<{
    name: string;
    path: string;
    timestamp: string;
    url?: string; // For serving the video
  }>;
  browserLogs?: Array<{
    level: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    timestamp: string;
  }>;
  networkLogs?: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
  }>;
  
  // Parsed errors
  errors?: Array<{
    message: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
    stack?: string;
    testName?: string;
    step?: string;
  }>;
}
