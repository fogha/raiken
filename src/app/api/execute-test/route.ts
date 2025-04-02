import { NextResponse } from 'next/server';
import { getTestExecutor } from '@/core/testing';

interface TestConfig {
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
  timeout?: number;
}

export async function POST(req: Request) {
  try {
    const { script, config } = await req.json();
    
    // Inject the OpenAI API key from server environment if not provided in config
    const apiKey = config?.api?.openaiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required. Please add it in the configuration or .env file.' },
        { status: 400 }
      );
    }
    
    // Prepare the browser configuration
    const testConfig: TestConfig = {
      headless: config?.headless !== undefined ? config.headless : true,
      browserType: config?.browserType || 'chromium',
      timeout: config?.timeout || 30000
    };
    
    // Configure the Playwright environment variables based on the browser type
    process.env.PLAYWRIGHT_BROWSER = testConfig.browserType;
    process.env.PLAYWRIGHT_HEADLESS = testConfig.headless ? 'true' : 'false';
    
    console.log(`[Arten] Executing test with config:`, {
      browserType: testConfig.browserType,
      headless: testConfig.headless,
      timeout: testConfig.timeout
    });
    
    try {
      // Create a test executor with the API key and configuration
      const executor = getTestExecutor({
        apiKey,
        timeout: testConfig.timeout,
        outputDir: './test-results'
      });
      
      // Execute the test with the provided script
      const testResults = await executor.runTest(script);
      
      console.log(`[Arten] Test execution completed with ${testResults.results.length} results`);
      
      // Return the test results
      return NextResponse.json(testResults);
    } catch (error) {
      console.error('[Arten] Error in test execution:', error);
      return NextResponse.json({ 
        results: [],
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Arten] API route error:', error);
    return NextResponse.json({ 
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}