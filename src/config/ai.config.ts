/**
 * AI Service Configuration
 */

export interface AiConfig {
  openrouter: {
    apiKey: string | null;
    baseUrl: string;
    defaultModel: string;
    timeout: number;
    retries: number;
    models: {
      id: string;
      name: string;
      provider: string;
      context: number;
      pricing: {
        prompt: number;
        completion: number;
      };
    }[];
  };
  generation: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  prompts: {
    systemPrompt: string;
    testGenerationPrompt: string;
    analysisPrompt: string;
  };
}

export const aiConfig: AiConfig = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || null,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    timeout: 60000,
    retries: 3,
    models: [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        context: 200000,
        pricing: { prompt: 3, completion: 15 }
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        context: 128000,
        pricing: { prompt: 10, completion: 30 }
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        provider: 'Google',
        context: 2000000,
        pricing: { prompt: 2.5, completion: 7.5 }
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B',
        provider: 'Meta',
        context: 131072,
        pricing: { prompt: 0.59, completion: 0.79 }
      }
    ]
  },
  
  generation: {
    temperature: 0.1,
    maxTokens: 4000,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  
  prompts: {
    systemPrompt: 'You are an expert Playwright test automation engineer.',
    testGenerationPrompt: 'Generate a comprehensive Playwright test script based on the provided requirements.',
    analysisPrompt: 'Analyze the test execution results and provide insights.',
  },
};

/**
 * Check if AI service is available
 */
export function isAiAvailable(): boolean {
  return !!aiConfig.openrouter.apiKey;
}

/**
 * Get available AI models
 */
export function getAvailableModels() {
  return aiConfig.openrouter.models;
}

/**
 * Get model by ID
 */
export function getModelById(modelId: string) {
  return aiConfig.openrouter.models.find(model => model.id === modelId);
}

/**
 * Get generation parameters
 */
export function getGenerationConfig(overrides?: Partial<AiConfig['generation']>) {
  return {
    ...aiConfig.generation,
    ...overrides,
  };
}
