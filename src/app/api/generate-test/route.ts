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
    const { prompt, domTree } = await req.json();
    
    if (!prompt) {
      return Response.json({ 
        error: 'Missing required parameter: prompt' 
      }, { status: 400 });
    }
    
    // Resolve API key / model exclusively from server-side env (no client localStorage)
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model  = 'anthropic/claude-3-sonnet'; // Default model
    
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
    
    // Generate the test script with DOM context
    const script = await executor.generateScript({
      prompt,
      domTree
    });
    
    // Return the generated script as JSON for easier client parsing
    return Response.json({ script });
    
  } catch (error) {
    console.error('[API] Test generation error:', error instanceof Error ? error.message : String(error));
    
    // Provide a sanitized error response that doesn't leak implementation details
    return Response.json({ 
      error: 'Failed to generate test script. Please verify your test specification.' 
    }, { status: 500 });
  }
}