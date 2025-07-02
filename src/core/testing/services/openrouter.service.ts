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
  // OpenRouter Models - Latest and Most Capable
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Latest Claude model with enhanced coding capabilities (Default)',
    contextSize: 200000
  },
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
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient Claude model for simple test generation',
    contextSize: 200000
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
  },
  {
    id: 'openai/gpt-4',
    name: 'GPT-4',
    description: 'Reliable OpenAI model for test generation',
    contextSize: 8192
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    description: 'Google\'s latest model with excellent code generation',
    contextSize: 1000000
  },
  {
    id: 'google/gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced model with good code generation',
    contextSize: 30720
  },
  {
    id: 'meta-llama/llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B',
    description: 'Meta\'s most powerful open model, excellent for complex coding',
    contextSize: 32768
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    description: 'Meta\'s large open model, great for code tasks',
    contextSize: 32768
  },
  {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B',
    description: 'Meta\'s proven open model, excellent for code tasks',
    contextSize: 8192
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
        model: 'anthropic/claude-3.5-sonnet' // Default model
      };
    } else {
      this.config = {
        model: configOrApiKey.model || 'anthropic/claude-3.5-sonnet',
        apiKey: configOrApiKey.apiKey
      };
    }
    
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
  async generateTestScript(input: any): Promise<string> {
    console.log(`[Arten] Starting test script generation with OpenRouter`);

    // Validate API key before making request
    if (!this.validateApiKey()) {
      throw new Error('Invalid or missing OpenRouter API key. Keys should start with sk-or-');
    }

    // Handle both old format (string) and new format (object with DOM context)
    let prompt: string;
    let domTree: any = null;

    if (typeof input === 'string') {
      prompt = input;
    } else if (input && typeof input === 'object') {
      prompt = input.prompt || JSON.stringify(input);
      domTree = input.domTree;
    } else {
      prompt = JSON.stringify(input);
    }

    try {
      // Create enhanced system and user prompts with DOM information
      const { systemPrompt, userPrompt } = this.createEnhancedPrompts(prompt, domTree);
      console.log('[Arten] Enhanced prompts created - System:', systemPrompt.length, 'User:', userPrompt.length);
      
      // Debug: Display the actual prompts being sent to OpenRouter
      console.log('[Arten] System Prompt:', systemPrompt);
      console.log('[Arten] User Prompt:', userPrompt);

      // Prepare request payload with optimized settings
      const requestPayload = this.buildRequestPayload(userPrompt, systemPrompt);

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
  private buildRequestPayload(userPrompt: string, systemPrompt: string) {
    return {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
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
      'HTTP-Referer': '',
      'X-Title': 'Arten Test Generator'
    };
  }
  
  /**
   * Create enhanced system and user prompts with DOM context for better selector generation
   */
  private createEnhancedPrompts(prompt: string, domTree: any = null): { systemPrompt: string; userPrompt: string } {
    try {
      // Check if the prompt is a natural language description or JSON
      const isNaturalLanguage = !prompt.trim().startsWith('{') && !prompt.trim().startsWith('[');
      
      // Build comprehensive system prompt with DOM context and instructions
      let systemPrompt = `
        You are an expert Playwright test automation engineer. 
        Your task is to create a complete, executable Playwright test script.
      `;

      let userPrompt = '';

      // Add DOM context if available
      if (domTree) {
        systemPrompt += `
          DOM STRUCTURE CONTEXT:
          This is the ONLY DOM context you should use.
          DOM JSON:
          ${JSON.stringify(domTree, null, 2)}
        `;
      }
      
      // Add detailed test generation guidelines to system prompt
      systemPrompt += this.getEnhancedTestGenerationGuidelines(domTree !== null);
      
      if (isNaturalLanguage) {
        userPrompt = `Create a Playwright test for this description:
          ${prompt}
          Return only the executable TypeScript test code.
        `;
      } else {
        // Try to parse as JSON for structured input
        try {
          const testSpec = JSON.parse(prompt);
            userPrompt = `Create a Playwright test for this JSON specification:
            ${testSpec}
            Return only the executable TypeScript test code.
          `;
        } catch {
          userPrompt = `Create a Playwright test for this specification:
            ${prompt}
            Return only the executable TypeScript test code.
          `;
        }
      }
      
      return { systemPrompt, userPrompt };
    } catch (error) {
      console.warn('[Arten] Error in createEnhancedPrompts:', error);
      // Fallback to legacy method
      const fallbackPrompt = this.createContextPrompt(prompt);
      return {
        systemPrompt: 'You are an expert Playwright test automation engineer who creates high-quality, maintainable test scripts.',
        userPrompt: fallbackPrompt
      };
    }
  }

  /**
   * Get enhanced test generation guidelines
   */
  private getEnhancedTestGenerationGuidelines(hasDOMContext: boolean): string {
    let guidelines = `ENHANCED TEST GENERATION GUIDELINES:`;
    
    if (hasDOMContext) {
      guidelines += `

1. CRITICAL: ENGLISH SELECTOR TRANSLATION
   **The test specification will contain selectors written in plain English. You MUST translate these to proper Playwright selectors using the DOM context provided.**
   
   Examples of English selectors you'll encounter:
   - "login button" → Find button with "login" text in DOM → page.getByRole('button', { name: 'Login' })
   - "email field" → Find input with email-related attributes → page.getByLabel('Email') or page.getByPlaceholder('Enter email')
   - "purple save button" → Find button with save text and purple styling → page.getByRole('button', { name: 'Save' })
   - "submit form" → Find form or submit button → page.getByRole('button', { name: 'Submit' })

2. SELECTOR STRATEGY WITH DOM CONTEXT:
   - **ONLY use the DOM structure provided above** - do not assume elements exist
   - Prefer data-testid attributes when available in the DOM
   - Use ARIA roles and labels for accessibility
   - Match text content for buttons and links exactly as shown in DOM
   - For natural language descriptions, search the DOM JSON for matching elements
   - Example: If DOM shows <button data-testid="login-btn">Login</button>, use page.getByTestId('login-btn')
   - Example: If DOM shows <input placeholder="Enter email">, use page.getByPlaceholder('Enter email')

3. ENGLISH TO PLAYWRIGHT SELECTOR MAPPING:
   - "button" descriptions → Look for <button> tags or role="button" in DOM
   - "input" or "field" descriptions → Look for <input>, <textarea>, or form elements
   - Color descriptions ("red", "blue", "purple") → Look for class names or style attributes
   - Action descriptions ("save", "submit", "cancel") → Match against button text or aria-labels
   - Generic terms ("form", "menu", "dialog") → Look for semantic HTML or ARIA roles
   - **Always verify the element exists in the provided DOM before creating selectors**

4. JSON STEPS INTERPRETATION:
   **When the user prompt contains JSON with a "steps" array, analyze the structure and interpret each step:**
   
   **WHAT TO LOOK FOR in JSON steps:**
   - An "action" field indicating the type of interaction (click, fill, wait, hover, select, etc.)
   - A "selector" or similar field with English descriptions of UI elements
   - Optional "value" fields for input data
   - Optional timing fields ("ms", "timeout", "delay")
   - Optional "element" type hints (button, input, select, etc.)
   
   **COMMON JSON PATTERNS (these are examples, adapt to actual structure):**
   
   Pattern A - Action/Selector:
   {
     "action": "click",
     "selector": "login button"
   }
   
   Pattern B - Detailed Structure:
   {
     "action": "fill",
     "element": "input",
     "selector": "email field",
     "value": "user@example.com"
   }
   
   Pattern C - With Timing:
   {
     "action": "wait",
     "ms": 2000
   }
   
   **TRANSLATION APPROACH:**
   1. **Identify the action type** from any action-related field
   2. **Extract the selector description** (may be in "selector", "target", "element", etc.)
   3. **Find the DOM element** using the provided DOM context
   4. **Generate robust Playwright code** with proper selectors
   5. **Add appropriate waiting and error handling**
   
   **EXAMPLE TRANSLATION:**
   JSON: { "action": "click", "selector": "purple save button" }
   
   Becomes:
   // Click the save button (identified by purple styling)
   await page.getByRole('button', { name: /save/i }).click();

      `;
    }
    
    guidelines += `2. NATURAL LANGUAGE INTERPRETATION:
          - Convert natural language descriptions to specific Playwright actions
          - "Click the login button" → await page.getByRole('button', { name: 'Login' }).click()
          - "Fill in the email field" → await page.getByLabel('Email').fill('test@example.com')
          - "Check if success message appears" → await expect(page.getByText('Success')).toBeVisible()

      3. ROBUST TEST STRUCTURE:
          - Include proper imports and TypeScript typing
          - Add meaningful test descriptions
          - Implement proper waiting strategies
          - Include error handling and recovery
          - Add comprehensive assertions

      4. BEST PRACTICES:
          - Use Page Object Model for complex tests
          - Implement proper setup and teardown
          - Add retry mechanisms for flaky operations
          - Include accessibility checks where relevant
          - Log important steps for debugging

      EXAMPLE OUTPUT FORMAT:
      \`\`\`typescript
      import { test, expect } from '@playwright/test';

      test.describe('Generated Test Suite', () => {
        test('should perform the requested actions', async ({ page }) => {
          // Navigate to the application
          await page.goto('URL_HERE');
          
          // Wait for page to load
          await page.waitForLoadState('networkidle');
          
          // Perform test actions based on description
          // ... generated test steps ...
          
          // Verify expected outcomes
          // ... generated assertions ...
        });
      });
      \`\`\`

      Return ONLY the executable Playwright test script without any explanations outside of code comments.
    `;

  guidelines += `\n\nIMPORTANT GUIDELINES FOR TEST GENERATION:

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
    
    return guidelines;
  }

  /**
   * Create a detailed context prompt for the OpenRouter API (legacy method)
   */
  private createContextPrompt(jsonInput: string): string {
    try {
      // Parse the JSON input to extract test details
      const testSpec = JSON.parse(jsonInput);
      
      // Build the prompt with detailed instructions
      let prompt = `
        You are an expert Playwright test automation engineer. 
        Your task is to create a complete, executable Playwright test script based on the provided JSON test specification provided below:

        JSON TEST SPECIFICATION:
        ${testSpec}

        For detailed API reference and best practices, refer to the official Playwright documentation: https://playwright.dev/docs/intro
        Return ONLY the executable Playwright test script without any explanations outside of code comments. The script should be immediately runnable with Playwright.
      `;

      return prompt;
    } catch (error) {
      console.warn('[Arten] Error parsing JSON in createContextPrompt:', error);
      return '[Arten] Error parsing JSON in createContextPrompt:' + error;
    }
  }
}
