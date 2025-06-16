import { OpenRouterService } from './openrouter.service';

export interface TestExecutorConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
  outputDir?: string;
}

export interface TestExecutor {
  generateScript: (prompt: any) => Promise<string>;
}

/**
 * Create a test executor instance with the given configuration
 */
export function getTestExecutor(config: TestExecutorConfig): TestExecutor {
  const openRouterService = new OpenRouterService({
    apiKey: config.apiKey,
    model: config.model || 'anthropic/claude-3-sonnet'
  });

  return {
    generateScript: async (prompt: any): Promise<string> => {
      return await openRouterService.generateTestScript(prompt);
    }
  };
} 