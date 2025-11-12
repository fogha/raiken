/**
 * Type definitions for test generation and API operations
 */

// JSON Test Specification Interface
export interface JsonTestSpec {
  name?: string;
  description?: string;
  url?: string;
  steps?: TestStep[];
  assertions?: TestAssertion[];
  setup?: TestSetupAction[];
  teardown?: TestTeardownAction[];
}

export interface TestStep {
  action: string;
  selector?: string;
  value?: string;
  timeout?: number;
  description?: string;
}

export interface TestAssertion {
  type: string;
  selector?: string;
  expected?: string | number | boolean;
  description?: string;
}

export interface TestSetupAction {
  action: string;
  params?: Record<string, unknown>;
}

export interface TestTeardownAction {
  action: string;
  params?: Record<string, unknown>;
}

// API Request/Response Types
export interface ExecuteTestParams {
  testPath: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  retries?: number;
  timeout?: number;
  maxFailures?: number;
  parallel?: boolean;
  workers?: number;
  features?: {
    screenshots?: boolean;
    video?: boolean;
    tracing?: boolean;
  };
  outputDir?: string;
  reporters?: string[];
}

export interface SaveTestParams {
  content: string;
  filename: string;
  tabId?: string;
}

export interface DeleteTestParams {
  testPath: string;
}

export interface DeleteReportParams {
  id: string;
}

// CLI Bridge Types
export interface TestFileRequest {
  content: string;
  filename?: string;
  name?: string;
  tabId?: string;
}

export interface ExecuteTestRequest {
  testPath: string;
  config?: {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    retries?: number;
    timeout?: number;
  };
}

// Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface TestExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  reportId?: string;
  artifacts?: string[];
}

export interface SaveTestResult {
  path: string;
  filePath: string;
  success: boolean;
}
