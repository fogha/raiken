import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { getTestExecutor } from '@/core/testing';


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
    
    // Update the config with the API key from environment
    if (config?.api) {
      config.api.openaiKey = apiKey;
    }

    const browser = await chromium.launch({
      headless: config.execution.mode === 'service'
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Execute test and collect results
    const results: any[] = [];
    let error = null;

    try {
      // Create a test executor with the API key
      const executor = getTestExecutor({
        apiKey,
        timeout: config?.playwright?.timeout || 30000,
        outputDir: './test-results'
      });
      
      // Execute the test
      const testResults = await executor.runTest(script);
      return NextResponse.json(testResults);
    } catch (e) {
      error = e;
    }

    await context.close();
    await browser.close();

    return NextResponse.json({ results, error });
  } catch (error) {
    return NextResponse.json({ error: 'Test execution failed' }, { status: 500 });
  }
} 