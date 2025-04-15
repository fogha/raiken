export * from './test-executor';
export * from './openrouter.service';
export * from './ui';

import { TestExecutor } from './test-executor';

// Create a default instance that can be used by components
let testExecutorInstance: TestExecutor | null = null;

/**
 * Get or create a TestExecutor instance
 * Components should use this function instead of directly instantiating TestExecutor
 */
export function getTestExecutor(config: { apiKey: string, provider?: 'openai' | 'openrouter', model?: string, timeout?: number, outputDir?: string }) {
  if (!testExecutorInstance) {
    testExecutorInstance = new TestExecutor(config);
  } else if (config.apiKey) {
    // Update with new configuration if provided
    testExecutorInstance = new TestExecutor(config);
  }
  return testExecutorInstance;
}
