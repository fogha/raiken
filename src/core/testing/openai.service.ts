import { TestGenerationPrompt } from '@/types/test';

/**
 * Response structure from AI completions endpoint (OpenAI and OpenRouter)
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
 * Available AI providers for test generation
 */
export type AIProvider = 'openai' | 'openrouter';

/**
 * Configuration options for the AI service
 */
export interface AIServiceConfig {
  provider?: AIProvider;
  model?: string;
  apiKey: string;
}

/**
 * Service to interact with AI APIs (OpenAI or OpenRouter) for generating test scripts
 */
export class OpenAIService {
  private apiUrl: string;
  private model: string;
  private provider: AIProvider;
  
  // API URL constants
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  
  // Default models for each provider
  private static readonly DEFAULT_MODELS = {
    openai: 'gpt-3.5-turbo',
    openrouter: 'openai/gpt-3.5-turbo'
  };
  
  /**
   * Create a new AI service instance
   * @param config Configuration options including provider, model and apiKey
   */
  constructor(private readonly config: AIServiceConfig) {
    this.provider = config.provider || 'openai';
    this.model = config.model || OpenAIService.DEFAULT_MODELS[this.provider];
    this.apiUrl = this.provider === 'openrouter' 
      ? OpenAIService.OPENROUTER_API_URL 
      : OpenAIService.OPENAI_API_URL;
    
    // Validate API key format
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    
    // OpenAI keys start with 'sk-'
    if (this.provider === 'openai' && !config.apiKey.startsWith('sk-')) {
      console.warn('[Arten] OpenAI API key may be invalid - should start with sk-');
    }
  }
  
  /**
   * Generate a test script using the OpenAI API
   */
  /**
   * Generate a Playwright test script from a JSON test definition
   * @param prompt JSON test script (as string or object)
   * @returns Generated Playwright test script as string
   */
  /**
   * Generate a Playwright test script from a JSON test definition
   * @param prompt JSON test script (as string or object)
   * @returns Generated Playwright test script as string
   */
  async generateTestScript(prompt: any): Promise<string> {
    console.log(`[Arten] Starting test script generation with ${this.provider} provider`);
    
    // Ensure we have a string representation of the test specification
    const jsonTestScript = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    
    try {
      // Create context prompt from the JSON test script
      const contextPrompt = this.createContextPrompt(jsonTestScript);
      console.log('[Arten] Context prompt created, length:', contextPrompt.length);
      
      // Prepare request payload with optimized settings
      const requestPayload = this.buildRequestPayload(contextPrompt);
      
      // Make the API request
      console.log(`[Arten] Sending request to ${this.provider} API...`);
      const headers = this.getRequestHeaders();
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      });

      console.log(`[Arten] Response received from ${this.provider}, status:`, response.status);
      
      // Handle error responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Arten] ${this.provider} API error response:`, errorText);
        throw new Error(`Failed to generate test script: ${response.status} ${response.statusText}`);
      }

      // Parse successful response
      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error(`Invalid response format from ${this.provider} API`);
      }
      
      console.log('[Arten] Test script generated successfully');
      return data.choices[0].message.content;
    } catch (error: unknown) {
      console.error('[Arten] Error generating test script:', error);
      
      // Enhanced error handling with useful debug information
      if (error instanceof Error) {
        // For network errors, provide helpful troubleshooting info
        if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
          console.log(`[Arten] This appears to be a network connectivity issue with the ${this.provider} API.`);
          if (!this.config.apiKey) {
            throw new Error('API key is missing or undefined');
          } else if (this.provider === 'openai' && !this.config.apiKey.startsWith('sk-')) {
            throw new Error('OpenAI API key appears to be invalid (should start with sk-)');
          }
        }
      } 
      
      // Rethrow with added context if needed
      throw error instanceof Error ? error : new Error(`Unknown error: ${String(error)}`);
    }
  }

  /**
   * Build the appropriate request payload based on the selected provider
   */
  private buildRequestPayload(contextPrompt: string) {
    const basePayload = {
      model: this.model,
      messages: [{ role: 'system', content: contextPrompt }],
      max_tokens: 1500,
      temperature: 0.7
    };
    
    // Add OpenRouter-specific fields if using OpenRouter
    if (this.provider === 'openrouter') {
      return {
        ...basePayload,
        transforms: ['middle-out'],
        route: 'fallback',
        prompt_tool: 'arten-test-generator'
      };
    }
    
    return basePayload;
  }
  
  /**
   * Get the appropriate headers for the API request based on the provider
   */
  private getRequestHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add provider-specific auth headers
    if (this.provider === 'openrouter') {
      return {
        ...headers,
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://arten.app',
        'X-Title': 'Arten Test Generator'
      };
    } else {
      return {
        ...headers,
        'Authorization': `Bearer ${this.config.apiKey}`
      };
    }
  }

  /**
   * Create a detailed context prompt for OpenAI
   */
  private createContextPrompt(
    jsonInput: string
  ): string {
    // Store the original input for later use
    const jsonTestScript = jsonInput;
    
    // Parse the JSON test script to extract key components
    let testSpec;
    try {
      testSpec = JSON.parse(jsonInput);
    } catch (error) {
      console.warn('[Arten] Failed to parse JSON test script, using as plain text');
      // If parsing fails, continue with the original string
      testSpec = null;
    }
    
    // Extract test details if parsing was successful
    const testName = testSpec?.name || 'Unnamed Test';
    const testDescription = testSpec?.description || 'No description provided';
    const hasSteps = testSpec?.steps && Array.isArray(testSpec.steps) && testSpec.steps.length > 0;
    const hasAssertions = testSpec?.assertions && Array.isArray(testSpec.assertions) && testSpec.assertions.length > 0;
    
    // Begin constructing the custom prompt with extracted details
    let prompt = "You are a professional test automation engineer specializing in Playwright, tasked with creating high-quality, maintainable end-to-end tests.\n\n";
    
    // Add test-specific context using the extracted information
    prompt += `TASK: Create a complete, executable Playwright test script for: ${testName}\n\n`;
    prompt += `TEST DESCRIPTION: ${testDescription}\n\n`;
    
    // Highlight the test structure if steps and assertions are present
    if (hasSteps) {
      prompt += `This test has ${testSpec.steps.length} specific steps that must be followed in sequence.\n`;
    }
    
    if (hasAssertions) {
      prompt += `This test requires ${testSpec.assertions.length} assertions to verify correct behavior.\n`;
    }
    
    prompt += "\nThe script must follow these requirements:\n" +
      "- Use TypeScript with proper typing\n" +
      "- Include all necessary imports (import { test, expect } from '@playwright/test')\n" +
      "- Create a complete, standalone test file that can run without any modifications\n" +
      "- Use Playwright's Page Object Model pattern where appropriate\n" +
      "- Implement proper error handling and retry mechanisms\n" +
      "- Use the exact test name specified in the JSON\n" +
      "- Follow the steps array EXACTLY as specified in the JSON\n" +
      "- Implement ALL assertions defined in the assertions array\n" +
      "- Use meaningful comments explaining the test logic\n" +
      "- Implement proper waiting strategies (avoid arbitrary timeouts)\n" +
      "- Follow best practices for selector stability (prefer role, text, test-id over CSS/XPath)\n\n";
      
    // Include the full JSON test specification
    prompt += "HERE IS THE COMPLETE JSON TEST SPECIFICATION TO IMPLEMENT:\n\n" +
      "```json\n" + jsonTestScript + "\n```\n\n";
      
    // Add specific instructions for handling steps and assertions
    if (hasSteps) {
      prompt += "IMPLEMENTATION NOTES FOR STEPS:\n";
      testSpec.steps.forEach((step: any, index: number) => {
        prompt += `- Step ${index + 1}: ${step.action} - Make sure to implement this exactly as specified\n`;
      });
      prompt += "\n";
    }
    
    if (hasAssertions) {
      prompt += "IMPLEMENTATION NOTES FOR ASSERTIONS:\n";
      testSpec.assertions.forEach((assertion: any, index: number) => {
        prompt += `- Assertion ${index + 1}: ${assertion.type} - Implement using appropriate Playwright expect() methods\n`;
      });
      prompt += "\n";
    }
      
    // Add documentation references
    prompt += "PLAYWRIGHT DOCUMENTATION REFERENCES:\n" +
      "- Page object: https://playwright.dev/docs/api/class-page\n" +
      "- Selectors: https://playwright.dev/docs/selectors\n" +
      "- Assertions: https://playwright.dev/docs/test-assertions\n" +
      "- Auto-waiting: https://playwright.dev/docs/actionability\n" +
      "- Test hooks: https://playwright.dev/docs/api/class-test\n" +
      "- Locators: https://playwright.dev/docs/api/class-locator\n\n";
      
    // Final output instructions
    prompt += "Return ONLY the executable Playwright test script without any explanations outside of code comments. Do not include markdown formatting in your response. The test script should be immediately runnable with Playwright.";
    
    console.log(prompt)
    return prompt;
  }
}
