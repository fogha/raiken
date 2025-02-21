import { TestConfig } from '@/types/config';

export class TestExecutor {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  async runTest(script: string) {
    try {
      const response = await fetch('/api/execute-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          config: this.config
        })
      });

      if (!response.ok) {
        throw new Error('Test execution failed');
      }

      return await response.json();
    } catch (error) {
      return {
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 