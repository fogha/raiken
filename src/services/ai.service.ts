/**
 * AI Service - Abstraction for AI operations
 */

import { OpenRouterService } from '@/core/testing/services/openrouter.service';
import { OpenRouterConfig } from '@/types';

export class AiService {
  private openRouter: OpenRouterService | null = null;

  constructor() {
    this.initializeOpenRouter();
  }

  private initializeOpenRouter() {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!apiKey) {
      console.warn('OpenRouter API key not found. AI features will be disabled.');
      return;
    }

    this.openRouter = new OpenRouterService({
      apiKey,
      model: 'anthropic/claude-3.5-sonnet',
    });
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.openRouter !== null;
  }

  /**
   * Generate test script
   */
  async generateTestScript(
    prompt: string,
    domTree?: any,
    url?: string
  ): Promise<string | null> {
    if (!this.openRouter) {
      throw new Error('AI service not available. Please configure OPENROUTER_API_KEY.');
    }

    return this.openRouter.generateTestScript(prompt, domTree, url);
  }

  /**
   * Analyze test results
   */
  async analyzeTestResults(
    testScript: string,
    results: any,
    error?: string
  ): Promise<{ summary: string; suggestions: string } | null> {
    if (!this.openRouter) {
      return null;
    }

    // This would use the OpenRouter service to analyze results
    // Implementation depends on the analysis requirements
    return null;
  }

  /**
   * Update AI configuration
   */
  updateConfig(config: Partial<OpenRouterConfig>) {
    if (this.openRouter) {
      // Update configuration
      // This would require modifying the OpenRouterService to support config updates
    }
  }
}

export const aiService = new AiService();
