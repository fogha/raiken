import { generateTest } from '../openai';
import { TestGenerationPrompt } from '@/types/test';

describe('OpenAI Test Generation', () => {
  // Store original env var
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    // Ensure API key is set for tests
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY must be set to run tests');
    }
  });

  afterAll(() => {
    // Restore original env var
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  it('should generate a valid test script', async () => {
    const prompt: TestGenerationPrompt = {
      description: "Test the login form submission",
      requirements: [
        "Navigate to login page",
        "Fill in email and password",
        "Click submit button",
        "Verify successful login"
      ],
      expectations: [
        "User should be redirected to dashboard",
        "Welcome message should be visible",
        "Error message should show for invalid credentials"
      ],
      url: "https://example.com/login"
    };

    const result = await generateTest(prompt);

    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    expect(result.code).toContain('test(');
    expect(result.code).toContain('page.goto');
    expect(result.code).toContain('expect(');
  });

  it('should handle missing API key', async () => {
    // Temporarily remove API key
    process.env.OPENAI_API_KEY = '';

    const prompt: TestGenerationPrompt = {
      description: "Simple test",
      requirements: ["Click button"],
      expectations: ["Button clicked"],
      url: "https://example.com"
    };

    const result = await generateTest(prompt);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should generate test with proper selectors', async () => {
    const prompt: TestGenerationPrompt = {
      description: "Test the submit button click",
      requirements: [
        "Find submit button",
        "Click the button",
        "Verify success message"
      ],
      expectations: [
        "Button should be clickable",
        "Success message should appear"
      ],
      url: "https://example.com/form"
    };

    const result = await generateTest(prompt);

    expect(result.success).toBe(true);
    expect(result.code).toContain('data-testid=');
    expect(result.code).toContain('toBeVisible');
  });
}); 