import { getTestExecutor } from '@/core/testing';

export async function POST(req: Request) {
  try {
    const { prompt, node, config } = await req.json();
    
    // Get the API key from server environment or from the config
    const apiKey = process.env.OPENAI_API_KEY || config?.api?.openaiKey;
    
    if (!apiKey) {
      return Response.json({ error: 'OpenAI API key is required' }, { status: 400 });
    }
    
    // Create a test executor with the API key from the server environment
    const executor = getTestExecutor({
      apiKey,
      timeout: config?.playwright?.timeout || 30000,
      outputDir: './test-results'
    });
    
    // Generate the test script
    const script = await executor.generateScript(prompt, node);
    
    // Return the generated script
    return new Response(script);
  } catch (error) {
    console.error('Test generation error:', error);
    return Response.json({ error: 'Failed to generate test script' }, { status: 500 });
  }
} 