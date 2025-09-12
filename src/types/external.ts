/**
 * External Service Types
 */

// OpenRouter API Types
export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenRouterMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Playwright Types (simplified)
export interface PlaywrightLaunchOptions {
  headless?: boolean;
  devtools?: boolean;
  slowMo?: number;
  timeout?: number;
}

export interface PlaywrightNavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

export interface PlaywrightScreenshotOptions {
  path?: string;
  type?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Local Bridge Types
export interface LocalBridgeConnection {
  url: string;
  projectInfo: {
    name: string;
    type: string;
    testDir: string;
    packageManager: string;
  };
  authToken?: string;
}

export interface LocalBridgeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  path?: string;
  files?: any[];
}
