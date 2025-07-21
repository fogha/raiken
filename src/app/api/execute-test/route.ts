import { NextResponse } from 'next/server';
import path from 'path';
import { TestSuiteManager } from '@/core/testing/services/testSuite';

// Global test suite manager instance
let testSuiteManager: TestSuiteManager | null = null;

function getTestSuiteManager(): TestSuiteManager {
  if (!testSuiteManager) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }
    
    testSuiteManager = new TestSuiteManager({
      apiKey,
      reportsDir: path.join(process.cwd(), 'test-results')
    });
  }
  return testSuiteManager;
}

// Interfaces moved to testSuite.ts - no longer needed here

export async function POST(req: Request) {
  try {
    const { testPath, config = {} } = await req.json();
    
    // Extract configuration settings
    const browserType = config.browserType || 'chromium';
    const retries = config.retries !== undefined ? config.retries : 0;
    const timeout = config.timeout || 30000;
    const features = config.features || {};
    const headless = config.headless !== undefined ? config.headless : true;
    
    if (!testPath) {
      return NextResponse.json({ 
        error: 'Missing required parameter: testPath' 
      }, { status: 400 });
    }

    console.log(`[Arten] Starting test execution for: ${testPath}`);
    console.log(`[Arten] Config: ${browserType}, retries: ${retries}, timeout: ${timeout}ms, headless: ${headless}`);
    console.log(`[Arten] Features: video: ${features.video}, screenshots: ${features.screenshots}, tracing: ${features.tracing}`);
    
    try {
      const manager = getTestSuiteManager();
      
      // Create or get test suite for this configuration
      const testSuite = await manager.createTestSuite({
        name: `${browserType}-${retries}r-${timeout}ms`,
        browserType,
        retries,
        timeout,
        features,
        headless
      });
      
      console.log(`[Arten] Using test suite: ${testSuite.name} (${testSuite.id})`);
      
      // Execute the test using the test suite
      const result = await manager.executeTest({
        testPath,
        suiteId: testSuite.id
      });
      
      console.log(`[Arten] Test execution completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`[Arten] AI Analysis needed: ${result.needsAIAnalysis ? 'YES' : 'NO'}`);
      
      return NextResponse.json({
        success: result.success,
        results: result.results,
        resultFile: result.resultFile,
        duration: result.duration,
        summary: result.summary,
        needsAIAnalysis: result.needsAIAnalysis,
        suiteId: testSuite.id,
        message: result.success ? 'Test executed successfully' : 'Test failed - AI analysis provided'
      });

    } catch (error: any) {
      console.error('[Arten] Test execution failed:', error);
      
      return NextResponse.json({
        success: false,
        error: `Test execution failed: ${error.message}`,
        message: 'Test execution error - check logs for details'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[API] Test execution error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to execute test' 
    }, { status: 500 });
  }
} 