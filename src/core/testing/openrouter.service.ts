import { TestGenerationPrompt } from '@/types/test';

/**
 * Response structure from AI completions endpoint (OpenRouter)
 */
export interface AICompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// For backward compatibility
export type OpenAIResponse = AICompletionResponse;

/**
 * Available AI models for test generation
 * Focused on models with strong programming capabilities
 */
export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextSize: number;
}

/**
 * List of available models for test generation
 * Prioritizing models good at programming tasks
 */
export const AI_MODELS: AIModel[] = [
  // OpenRouter Models
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Most powerful Claude model, excellent for complex test generation',
    contextSize: 200000
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced Claude model with strong programming capabilities',
    contextSize: 200000
  },
  {
    id: 'google/gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced model with good code generation',
    contextSize: 30720
  },
  {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B',
    description: 'Meta\'s largest open model, excellent for code tasks',
    contextSize: 8192
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI\'s latest model with strong programming capabilities',
    contextSize: 128000
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Powerful model for complex test generation',
    contextSize: 128000
  }
];

/**
 * Configuration options for the AI service
 */
export interface AIServiceConfig {
  model?: string;
  apiKey: string;
}

/**
 * Service to interact with OpenRouter API for generating test scripts
 */
export class OpenRouterService {
  private apiUrl: string = 'https://openrouter.ai/api/v1/chat/completions';
  private config: AIServiceConfig;

  /**
   * Create a new OpenRouter service instance
   * @param configOrApiKey Configuration options or API key string
   */
  constructor(configOrApiKey: AIServiceConfig | string) {
    if (typeof configOrApiKey === 'string') {
      this.config = {
        apiKey: configOrApiKey,
        model: 'anthropic/claude-3-sonnet' // Default model
      };
    } else {
      this.config = {
        model: configOrApiKey.model || 'anthropic/claude-3-sonnet',
        apiKey: configOrApiKey.apiKey
      };
    }
    
    // Log initialization (without exposing API key)
    console.log(`[Arten] Initialized OpenRouter service with model: ${this.config.model}`);
  }
  
  /**
   * Validate that the API key has the correct format for OpenRouter
   */
  private validateApiKey(): boolean {
    if (!this.config.apiKey) {
      return false;
    }
    
    // OpenRouter keys start with 'sk-or-'
    return this.config.apiKey.startsWith('sk-or-');
  }

  /**
   * Generate a test script using the OpenRouter API
   */
  async generateTestScript(prompt: any): Promise<string> {
    console.log(`[Arten] Starting test script generation with OpenRouter`);

    // Validate API key before making request
    if (!this.validateApiKey()) {
      throw new Error('Invalid or missing OpenRouter API key. Keys should start with sk-or-');
    }

    // Ensure we have a string representation of the test specification
    const jsonTestScript = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);

    try {
      // Create context prompt from the JSON test script
      const contextPrompt = this.createContextPrompt(jsonTestScript);
      console.log('[Arten] Context prompt created, length:', contextPrompt.length);

      // Prepare request payload with optimized settings
      const requestPayload = this.buildRequestPayload(contextPrompt);

      // Make the API request
      console.log(`[Arten] Sending request to OpenRouter API...`);
      const headers = this.getHeaders();

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error (${response.status}): ${errorData.error?.message || response.statusText}`
        );
      }

      // Parse the response
      const data = await response.json() as AICompletionResponse;
      
      // Extract the generated test script from the response
      const generatedScript = data.choices?.[0]?.message?.content;
      
      if (!generatedScript) {
        throw new Error('No test script generated in the response');
      }
      
      console.log('[Arten] Test script generated successfully');
      return generatedScript;
    } catch (error) {
      console.error('[Arten] Error generating test script:', error);
      throw new Error(`Failed to generate test script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Build the request payload for the OpenRouter API
   */
  private buildRequestPayload(contextPrompt: string) {
    return {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Playwright test automation engineer who creates high-quality, maintainable test scripts.'
        },
        {
          role: 'user',
          content: contextPrompt
        }
      ],
      temperature: 0.2, // Lower temperature for more deterministic outputs
      max_tokens: 4000, // Ensure we get a complete test script
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: null
    };
  }
  
  /**
   * Get the appropriate headers for the OpenRouter API request
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': 'https://arten.vercel.app', // Replace with your app's URL
      'X-Title': 'Arten Test Generator' // Identify your app to OpenRouter
    };
  }
  
  /**
   * Create a detailed context prompt for the OpenRouter API
   */
  private createContextPrompt(jsonInput: string): string {
    try {
      // Parse the JSON input to extract test details
      const testSpec = JSON.parse(jsonInput);
      const hasSteps = testSpec.steps && Array.isArray(testSpec.steps) && testSpec.steps.length > 0;
      const hasAssertions = testSpec.assertions && Array.isArray(testSpec.assertions) && testSpec.assertions.length > 0;
      
      // Build the prompt with detailed instructions
      let prompt = `You are an expert Playwright test automation engineer. Your task is to create a complete, executable Playwright test script based on the provided JSON test specification.

JSON TEST SPECIFICATION:
${jsonInput}

IMPORTANT GUIDELINES FOR TEST GENERATION:

1. Test Structure and Setup:
   - Create a complete, standalone test file with proper TypeScript typing
   - Include all necessary imports (import { test, expect } from '@playwright/test')
   - Use the Page Object Model pattern for better maintainability
   - Implement proper beforeAll/beforeEach hooks for setup
   - Add cleanup in afterAll/afterEach hooks

2. Selector Strategy (in order of preference):
   - data-testid attributes (most reliable)
   - ARIA roles and accessibility attributes
   - Text content with exact matches
   - CSS selectors only when necessary
   - Avoid XPath unless absolutely required

3. Robust Waiting Strategy:
   - Use auto-waiting mechanisms (waitForSelector, waitForLoadState)
   - Implement smart waits for dynamic content
   - Add retry mechanisms for flaky operations
   - Avoid arbitrary timeouts
   - Handle loading states and animations

4. Error Handling:
   - Implement try-catch blocks for critical operations
   - Add meaningful error messages
   - Handle edge cases and potential failures
   - Log relevant information for debugging
   - Implement recovery mechanisms where appropriate

5. Assertions:
   - Use strong assertions that verify both state and behavior
   - Implement multiple assertion points for complex operations
   - Add visual regression tests where relevant
   - Verify both positive and negative scenarios
   - Include accessibility checks

6. Documentation:
   - Add JSDoc comments for the test suite and complex functions
   - Include step-by-step comments explaining the test flow
   - Document any assumptions or prerequisites
   - Add links to relevant documentation or tickets
   - Explain any non-obvious implementation details

7. Best Practices:
   - Implement proper isolation between tests
   - Use test data factories for consistent data
   - Implement proper state management
   - Follow the Arrange-Act-Assert pattern
   - Keep tests focused and atomic
`;

      // Add specific information about steps and assertions if available
      if (hasSteps) {
        prompt += `\nTEST STEPS IMPLEMENTATION:
${testSpec.steps.map((step: any, index: number) => {
  const stepAction = step.action || step.description || JSON.stringify(step);
  return `${index + 1}. ${stepAction}
   - Implement proper waiting strategy
   - Add error handling
   - Verify step completion
   - Log step execution`;
}).join('\n')}
`;
      }

      if (hasAssertions) {
        prompt += `\nASSERTIONS IMPLEMENTATION:
${testSpec.assertions.map((assertion: any, index: number) => {
  const assertionType = assertion.type || assertion.description || JSON.stringify(assertion);
  return `${index + 1}. ${assertionType}
   - Use appropriate expect() methods
   - Add retry logic if needed
   - Include detailed error messages
   - Consider edge cases`;
}).join('\n')}
`;
      }

      // Add specific examples and patterns
      prompt += `
EXAMPLE PATTERNS TO FOLLOW:

1. Selector Strategy:
   await page.getByTestId('submit-button').click();
   await page.getByRole('button', { name: 'Submit' }).click();
   await page.getByLabel('Username').fill('test@example.com');

2. Waiting Strategy:
   await page.waitForLoadState('networkidle');
   await expect(page.getByTestId('result')).toBeVisible({ timeout: 10000 });
   await page.waitForResponse(response => response.url().includes('/api/data'));

3. Error Handling:
   try {
     await page.getByRole('button').click();
     await expect(page.getByText('Success')).toBeVisible();
   } catch (error) {
     console.error('Failed to complete operation:', error);
     throw new Error('Operation failed: ' + error.message);
   }

4. Assertions:
   await expect(page.getByTestId('form')).toBeVisible();
   await expect(page.getByRole('alert')).toContainText('Success');
   await expect(page.getByLabel('Email')).toHaveValue('test@example.com');
   await expect(page.getByRole('button')).toBeEnabled();

Return ONLY the executable Playwright test script without any explanations outside of code comments. The script should be immediately runnable with Playwright.`;

      return prompt;
    } catch (error) {
      console.warn('[Arten] Error parsing JSON in createContextPrompt:', error);
      return `You are an expert Playwright test automation engineer. Create a complete, executable test script for this specification:\n\n${jsonInput}\n\nInclude all necessary imports, TypeScript typing, and follow Playwright best practices. Return ONLY the executable code.`;
    }
  }
}
