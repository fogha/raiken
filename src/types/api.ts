/**
 * API Request/Response Types
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Browser API Types
export interface BrowserActionRequest {
  action: 'initialize' | 'navigate' | 'extract-dom' | 'take-screenshot' | 'execute-test' | 'close';
  scriptId?: string;
  [key: string]: any;
}

export interface BrowserInitializeRequest extends BrowserActionRequest {
  action: 'initialize';
  headless?: boolean;
  browserType?: 'chromium' | 'firefox' | 'webkit';
}

export interface BrowserNavigateRequest extends BrowserActionRequest {
  action: 'navigate';
  url: string;
}

export interface BrowserScreenshotRequest extends BrowserActionRequest {
  action: 'take-screenshot';
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Test API Types
export interface TestActionRequest {
  action: 'generate' | 'execute' | 'save' | 'list' | 'delete' | 'get-reports';
  [key: string]: any;
}

export interface TestGenerateRequest extends TestActionRequest {
  action: 'generate';
  prompt: string;
  domTree?: any;
  url?: string;
  config?: {
    model?: string;
    temperature?: number;
  };
}

export interface TestExecuteRequest extends TestActionRequest {
  action: 'execute';
  testPath: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  retries?: number;
  timeout?: number;
  features?: {
    video?: boolean;
    screenshots?: boolean;
    tracing?: boolean;
  };
}

export interface TestSaveRequest extends TestActionRequest {
  action: 'save';
  content: string;
  filename: string;
  tabId?: string;
}

export interface TestDeleteRequest extends TestActionRequest {
  action: 'delete';
  testPath: string;
}
