import { TestGenerationPrompt } from '@/types/test';

// Define the API response structure
export interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Service to interact with OpenAI API for generating test scripts
 */
export class OpenAIService {
  private readonly apiUrl: string = 'https://api.openai.com/v1/chat/completions';
  private readonly model: string = 'gpt-3.5-turbo';
  
  /**
   * Create a new OpenAI service instance
   * @param apiKey Valid OpenAI API key starting with 'sk-'
   */
  constructor(private readonly apiKey: string) {
    // Validate API key format
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.warn('[Arten] OpenAI API key may be invalid - should start with sk-');
    }
  }
  
  /**
   * Generate a test script using the OpenAI API
   */
  /**
   * Generate a Playwright test script from a JSON test definition
   * @param prompt JSON test script or object to be stringified
   * @returns Generated Playwright test script as string
   */
  async generateTestScript(prompt: any): Promise<string> {
    // Convert prompt to JSON string if it's not already a string
    const jsonTestScript = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    console.log('[Arten] Starting OpenAI test script generation...');
    
    try {
      // Create context prompt from the JSON test script
      const contextPrompt = this.createContextPrompt(jsonTestScript);
      console.log('[Arten] Context prompt created, length:', contextPrompt.length);
      
      // Prepare request payload with optimized settings
      const requestPayload = {
        model: this.model,
        messages: [{ role: 'system', content: contextPrompt }],
        max_tokens: 1500,
        temperature: 0.7 // Balanced between creativity and determinism
      };
      
      // Make the API request
      console.log('[Arten] Sending request to OpenAI API...');
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('[Arten] Response received, status:', response.status);
      
      // Handle error responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Arten] OpenAI API error response:', errorText);
        throw new Error(`Failed to generate test script: ${response.status} ${response.statusText}`);
      }

      // Parse successful response
      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }
      
      console.log('[Arten] Test script generated successfully');
      return data.choices[0].message.content;
    } catch (error: unknown) {
      console.error('[Arten] Error generating test script:', error);
      
      // Enhanced error handling with useful debug information
      if (error instanceof Error) {
        // For network errors, provide helpful troubleshooting info
        if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
          console.log('[Arten] This appears to be a network connectivity issue with the OpenAI API.');
          if (!this.apiKey) {
            throw new Error('OpenAI API key is missing or undefined');
          } else if (!this.apiKey.startsWith('sk-')) {
            throw new Error('OpenAI API key appears to be invalid (should start with sk-)');
          }
        }
      } 
      
      // Rethrow with added context if needed
      throw error instanceof Error ? error : new Error(`Unknown error: ${String(error)}`);
    }
  }

  /**
   * Create a detailed context prompt for OpenAI
   */
  private createContextPrompt(
    jsonTestScript: string
  ): string {
    // Construct the prompt string manually to avoid template literal parsing issues
    return "You are a professional test automation engineer specializing in Playwright, tasked with creating high-quality, maintainable end-to-end tests.\n\n" +
      "TASK: Convert the provided JSON test script into a complete, executable Playwright test script.\n\n" +
      "The script must follow these requirements:\n" +
      "- Use TypeScript with proper typing\n" +
      "- Include all necessary imports (import { test, expect } from '@playwright/test')\n" +
      "- Create a complete, standalone test file that can run without any modifications\n" +
      "- Use Playwright's Page Object Model pattern where appropriate\n" +
      "- Implement proper error handling and retry mechanisms\n" +
      "- Use meaningful test names and descriptions\n" +
      "- Add thorough assertions to validate expected behavior\n" +
      "- Include helpful comments explaining test logic\n" +
      "- Implement proper waiting strategies (avoid arbitrary timeouts)\n" +
      "- Follow best practices for selector stability (prefer role, text, test-id over CSS/XPath)\n\n" +
      "HERE IS THE COMPLETE JSON TEST SCRIPT TO CONVERT:\n\n" +
      "```json\n" + jsonTestScript + "\n```\n\n" +
      "PLAYWRIGHT DOCUMENTATION REFERENCES:\n" +
      "- Page object: https://playwright.dev/docs/api/class-page\n" +
      "- Selectors: https://playwright.dev/docs/selectors\n" +
      "- Assertions: https://playwright.dev/docs/test-assertions\n" +
      "- Auto-waiting: https://playwright.dev/docs/actionability\n" +
      "- Test hooks: https://playwright.dev/docs/api/class-test\n" +
      "- Locators: https://playwright.dev/docs/api/class-locator\n\n" +
      "Return ONLY the executable Playwright test script without any explanations outside of code comments. Do not include markdown formatting in your response.";
  }
}
