import { getTestExecutor } from '@/core/testing';

/**
 * API endpoint to generate Playwright test scripts from JSON test specifications
 * @security This endpoint requires a valid OpenRouter API key in environment variables
 */
export async function POST(req: Request) {
  try {
    // Validate request content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return Response.json({ 
        error: 'Invalid content type. Expected application/json' 
      }, { status: 415 });
    }
    
    // Extract and validate test specification from request body
    const { prompt } = await req.json();
    
    if (!prompt) {
      return Response.json({ 
        error: 'Missing required parameter: prompt' 
      }, { status: 400 });
    }
    
    // Get config from localStorage if available (client-side) or use environment variables (server-side)
    let apiKey, model;
    
    try {
      // Try to get settings from localStorage
      if (typeof window !== 'undefined') {
        const savedConfig = localStorage.getItem('artenConfig');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          apiKey = config.api.apiKey;
          model = config.api.model;
        }
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
    
    // Fall back to environment variables if settings not found in localStorage
    if (!apiKey) {
      apiKey = process.env.OPENROUTER_API_KEY;
      model = 'anthropic/claude-3-sonnet'; // Default model
    }
    
    if (!apiKey) {
      return Response.json({ 
        error: 'Server configuration error: No API key found for OpenRouter' 
      }, { status: 500 });
    }
    
    // Create test executor with secure API key handling
    const executor = getTestExecutor({
      apiKey,
      model,
      timeout: 30000,
      outputDir: './test-results'
    });
    
    // Generate the test script
    const script = await executor.generateScript(prompt);
    
    // Return the generated script
    return new Response(script, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('[API] Test generation error:', error instanceof Error ? error.message : String(error));
    
    // Provide a sanitized error response that doesn't leak implementation details
    return Response.json({ 
      error: 'Failed to generate test script. Please verify your test specification.' 
    }, { status: 500 });
  }
}