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
 * Configuration options for the AI service
 */
export interface AIServiceConfig {
  model?: string;
  apiKey: string;
}

// Temporary hard-coded catalogue (until live /models endpoint is wired)
export const SUPPORTED_MODELS = [
  // Anthropic Claude Models
  'anthropic/claude-3.5-sonnet',     // Latest and most capable
  'anthropic/claude-3.5-haiku',      // Fast and efficient
  'anthropic/claude-3-opus',         // Most powerful Claude 3
  'anthropic/claude-3-sonnet',       // Balanced performance
  'anthropic/claude-3-haiku',        // Fastest Claude 3
  
  // OpenAI GPT Models
  'openai/gpt-4o',                   // Latest GPT-4 Omni
  'openai/gpt-4o-mini',              // Smaller, faster GPT-4o
  'openai/gpt-4-turbo',              // GPT-4 Turbo
  'openai/gpt-4',                    // Standard GPT-4
  'openai/gpt-3.5-turbo',            // GPT-3.5 Turbo
  
  // Google Models
  'google/gemini-pro-1.5',           // Gemini Pro 1.5
  'google/gemini-pro',               // Gemini Pro
  'google/gemini-flash-1.5',         // Gemini Flash 1.5
  
  // Meta Llama Models
  'meta-llama/llama-3.1-405b-instruct', // Largest Llama 3.1
  'meta-llama/llama-3.1-70b-instruct',  // Llama 3.1 70B
  'meta-llama/llama-3.1-8b-instruct',   // Llama 3.1 8B
  'meta-llama/llama-3-70b-instruct',    // Llama 3 70B
  'meta-llama/llama-3-8b-instruct',     // Llama 3 8B
  
  // Mistral Models
  'mistralai/mistral-large',         // Mistral Large
  'mistralai/mistral-medium',        // Mistral Medium
  'mistralai/mistral-small',         // Mistral Small
  'mistralai/mixtral-8x7b-instruct', // Mixtral 8x7B
  'mistralai/mixtral-8x22b-instruct', // Mixtral 8x22B
  
  // Cohere Models
  'cohere/command-r-plus',           // Command R+
  'cohere/command-r',                // Command R
  'cohere/command',                  // Command
  
  // Other Notable Models
  'perplexity/llama-3.1-sonar-large-128k-online', // Perplexity Sonar
  'qwen/qwen-2-72b-instruct',        // Qwen 2 72B
  'databricks/dbrx-instruct',        // DBRX Instruct
  'microsoft/wizardlm-2-8x22b',      // WizardLM 2
] as const;
export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

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
    const defaultModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    if (typeof configOrApiKey === 'string') {
      this.config = {
        apiKey: configOrApiKey,
        model: defaultModel
      };
    } else {
      this.config = {
        model: configOrApiKey.model || defaultModel,
        apiKey: configOrApiKey.apiKey
      };
    }
    
    console.log(`[Raiken] Initialized OpenRouter service with model: ${this.config.model}`);
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
    console.log(`[Raiken] Starting test script generation with OpenRouter`);

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
      console.log('[Raiken] Enhanced prompts created - System:', systemPrompt.length, 'User:', userPrompt.length);
      
      // Prepare request payload with optimized settings
      const requestPayload = this.buildRequestPayload(userPrompt, systemPrompt);

      // Make the API request
      console.log(`[Raiken] Sending request to OpenRouter API...`);
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
      
      console.log('[Raiken] Test script generated successfully');
      return generatedScript;
    } catch (error) {
      console.error('[Raiken] Error generating test script:', error);
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
    const referer = process.env.NEXT_PUBLIC_OPENROUTER_REFERRER || process.env.OPENROUTER_REFERRER || 'https://raiken.app';
    const title = process.env.NEXT_PUBLIC_OPENROUTER_TITLE || process.env.OPENROUTER_TITLE || 'Raiken';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': referer,
      'X-Title': title
    };
  }
  
  /**
   * Create enhanced system and user prompts with DOM context for better selector generation
   */
  private createEnhancedPrompts(prompt: string, domTree: any = null): { systemPrompt: string; userPrompt: string } {
    // ---------- 1. Prepare DOM snippet (truncate if huge) ----------
    let domSnippet = '';
    if (domTree) {
      const raw = JSON.stringify(domTree, null, 2);
      const max = 8000; // keep system prompt well below 32k tokens
      domSnippet = raw.length > max ? `${raw.slice(0, max)}\n... [truncated ${raw.length - max} chars]` : raw;
    }

    // ---------- 2. Build SYSTEM prompt ----------
    const systemPrompt = this.buildSystemPrompt(domSnippet);

    // ---------- 3. Build USER prompt ----------
    let userPrompt: string;
    let testSpecJson = prompt.trim();
    const isJson = testSpecJson.startsWith('{') || testSpecJson.startsWith('[');

    if (!isJson) {
      // Wrap natural language into minimal instruction
      userPrompt = `Generate a Playwright test that automates the following scenario:\n\n"""\n${testSpecJson}\n"""`;
    } else {
      // Enhanced JSON spec processing with proper context
      userPrompt = this.createEnhancedJSONPrompt(testSpecJson);
    }

    return { systemPrompt, userPrompt };
  }

  /**
   * Create enhanced user prompt for JSON test specifications
   */
  private createEnhancedJSONPrompt(testSpecJson: string): string {
    return `TASK: Generate a comprehensive Playwright test based on the JSON specification below.

IMPORTANT: All examples and patterns provided below are for DIRECTIONAL GUIDANCE ONLY. 
Always adapt implementations based on your specific DOM context and application requirements.

CONTEXT: This JSON contains a structured test definition with:
- Test metadata (name, description, type)
- Step-by-step actions to perform in the "steps" array
- Assertions to verify success in the "assertions" array
- Error handling expectations

CRITICAL REQUIREMENTS:
1. Convert each JSON step to proper Playwright actions using the provided DOM context
2. Translate English selector descriptions to robust Playwright selectors
3. Include proper waits and error handling between actions
4. Support multilingual interfaces (English/French for international sites)
5. Add comprehensive assertions for all verification points
6. Return ONLY executable TypeScript code with proper imports

ENGLISH SELECTOR TRANSLATION GUIDELINES:
(Note: These are generic examples for directional guidance only - adapt based on your specific DOM context)
- "action button" → page.getByRole('button', { name: /action|action_french/i })
- "input field" → page.getByLabel(/field|field_label/i) or page.getByPlaceholder(/placeholder_text/i)
- "text input" → page.getByLabel(/input_description/i)
- "form button" → page.getByRole('button', { name: /button_text|button_text_alt/i })
- Always use flexible regex matching for multilingual compatibility

ACTION MAPPING FOR JSON STEPS:
(Note: These are pattern examples - implement based on your actual JSON structure)
- "navigate" action → await page.goto(url) + await page.waitForLoadState('networkidle')
- "click" action → await element.click() (locate element using provided selector description)
- "type"/"fill" action → await element.fill(value) (use value from JSON)
- "wait" action → prefer await expect(element).toBeVisible() over arbitrary timeouts
- "hover" action → await element.hover()
- "select" action → await element.selectOption(value)

ASSERTION MAPPING FOR JSON ASSERTIONS:
(Note: These are common patterns - adapt to your specific assertion requirements)
- "element" type → await expect(element).toBeVisible() or .toContainText()
- "url" type with "equals" → await expect(page).toHaveURL(expectedUrl)
- "text" type → await expect(element).toContainText(expectedText)
- Error handling → await expect(errorElement).not.toBeVisible()

GENERAL GUIDANCE:
- Analyze the provided DOM context to understand the actual page structure
- Use semantic selectors that work with the specific application being tested
- Support multilingual interfaces when relevant to the target platform
- Implement appropriate waits and error handling for the specific user flow

JSON TEST SPECIFICATION:

${testSpecJson}

Generate the complete, executable Playwright test with proper TypeScript typing:`;
  }

  /**
   * Compose the full SYSTEM prompt once, with clearly marked sections.
   */
  private buildSystemPrompt(domSnippet: string): string {
    const baseRules = `### ROLE\nYou are an expert Playwright-Test engineer. Produce clear, maintainable TypeScript tests.\n\n`;

    const quickRules = `### QUICK RULES
1. NEVER use page.waitForTimeout; rely on auto-waiting or expect()
2. Selector preference: data-test-id → role/label → visible text → css
3. For JSON specs: Convert "selector" fields from English to proper Playwright selectors
4. Add assertions proving success (URL change, success message, element visibility)
5. Support multilingual UI: use regex like { name: /login|connexion/i }
6. Return ONLY valid TypeScript code with imports and proper test structure
`;

    const domSection = domSnippet
      ? `\n### DOM CONTEXT (read-only)\n${domSnippet}\n`
      : '';

    const detailedGuidelines = `\n### DETAILED GUIDELINES\n${this.getEnhancedTestGenerationGuidelines(Boolean(domSnippet))}`;

    return baseRules + quickRules + domSection + detailedGuidelines;
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
   
   Examples of English selector patterns (adapt to your specific DOM):
   - "action button" → Find button with action text in DOM → page.getByRole('button', { name: 'ActionText' })
   - "input field" → Find input with relevant attributes → page.getByLabel('FieldLabel') or page.getByPlaceholder('Placeholder')
   - "styled button" → Find button with specific text and styling → page.getByRole('button', { name: 'ButtonText' })
   - "form element" → Find form or form control → page.getByRole('button', { name: 'SubmitText' })

2. SELECTOR STRATEGY WITH DOM CONTEXT:
   - **ONLY use the DOM structure provided above** - do not assume elements exist
   - Prefer data-testid attributes when available in the DOM
   - Use ARIA roles and labels for accessibility
   - Match text content for buttons and links exactly as shown in DOM
   - For natural language descriptions, search the DOM JSON for matching elements
   - Example: If DOM shows <button data-testid="action-btn">ActionText</button>, use page.getByTestId('action-btn')
   - Example: If DOM shows <input placeholder="Enter value">, use page.getByPlaceholder('Enter value')

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
          - Use **test.beforeEach** to handle common navigation / login setup so each test block contains only the unique steps
          - Implement **explicit waits** (waitForSelector, expect(locator)...toBeVisible) rather than arbitrary timeouts
          - **Avoid page.waitForTimeout unless absolutely unavoidable**
          - Include error handling and recovery
          - Add comprehensive assertions

      4. BEST PRACTICES:
          - Use Page Object Model for complex tests
          - Implement proper setup and teardown
          - Add retry mechanisms for flaky operations
          - Include accessibility checks where relevant
          - Log important steps for debugging

      EXAMPLE OUTPUT FORMAT:
      import { test, expect } from '@playwright/test';

      test.describe('Generated Test Suite', () => {
        test('should perform the requested actions', async ({ page }) => {
          // Navigate to the application
          await page.goto('https://example.com');
          
          // Wait for page to load
          await page.waitForLoadState('networkidle');
          
          // Perform test actions based on description
          await page.getByRole('button', { name: 'Login' }).click();
          await page.getByLabel('Email').fill('test@example.com');
          
          // Verify expected outcomes
          await expect(page.getByText('Welcome')).toBeVisible();
        });
      });
      
      CRITICAL: Use concrete values, NOT template strings or placeholders like URL_HERE, {{variable}}.

      Return ONLY the executable Playwright test script without any explanations outside of code comments.
      
      CRITICAL: Tests should NOT contain template strings, variables, or placeholders like {{URL}}, {{variable}}, or URL_HERE. All values must be concrete and ready to execute.
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
}
