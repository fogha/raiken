import { OpenRouterService } from '@/core/testing/services/openrouter.service';
import { OpenRouterConfig } from '@/types';

export class AiService {
  private openRouter: OpenRouterService | null = null;

  constructor() {
    this.initializeOpenRouter();
  }

  private initializeOpenRouter(): void {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return;
    }

    this.openRouter = new OpenRouterService({
      apiKey,
      model: 'anthropic/claude-3.5-sonnet',
    });
  }

  isAvailable(): boolean {
    return this.openRouter !== null;
  }

  async generateTestScript(
    prompt: string,
    domTree?: any,
    url?: string
  ): Promise<string> {
    if (!this.openRouter) {
      throw new Error('AI service not available. Please configure OPENROUTER_API_KEY.');
    }

    return this.openRouter.generateTestScript(prompt);
  }

  async analyzeTestResults(
    testScript: string,
    results: any,
    error?: string
  ): Promise<{ summary: string; suggestions: string } | null> {
    if (!this.openRouter) {
      return null;
    }

    // Future implementation for test result analysis
    return null;
  }

  updateConfig(config: Partial<OpenRouterConfig>): void {
    if (config.apiKey) {
      this.openRouter = new OpenRouterService({
        apiKey: config.apiKey,
        model: config.model || 'anthropic/claude-3.5-sonnet',
      });
    }
  }

  getConfig(): OpenRouterConfig | null {
    return this.openRouter ? {
      apiKey: '***',
      model: 'anthropic/claude-3.5-sonnet'
    } : null;
  }
}

export const aiService = new AiService();