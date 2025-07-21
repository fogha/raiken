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

/**
 * GET - List all test suites and their statistics
 */
export async function GET(req: Request) {
  try {
    const manager = getTestSuiteManager();
    const suites = manager.listTestSuites();
    const statistics = manager.getStatistics();
    
    return NextResponse.json({
      suites,
      statistics,
      message: `Found ${suites.length} test suites`
    });
  } catch (error) {
    console.error('[API] Failed to list test suites:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to list test suites'
    }, { status: 500 });
  }
}

/**
 * POST - Create a new test suite
 */
export async function POST(req: Request) {
  try {
    const config = await req.json();
    
    // Validate required fields
    const requiredFields = ['name', 'browserType', 'retries', 'timeout', 'features', 'headless'];
    for (const field of requiredFields) {
      if (!(field in config)) {
        return NextResponse.json({
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }
    
    const manager = getTestSuiteManager();
    const testSuite = await manager.createTestSuite(config);
    
    return NextResponse.json({
      suite: testSuite,
      message: `Test suite created: ${testSuite.name}`
    });
  } catch (error) {
    console.error('[API] Failed to create test suite:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create test suite'
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete a test suite
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const suiteId = url.searchParams.get('id');
    
    if (!suiteId) {
      return NextResponse.json({
        error: 'Missing required parameter: id'
      }, { status: 400 });
    }
    
    const manager = getTestSuiteManager();
    const success = await manager.deleteTestSuite(suiteId);
    
    if (success) {
      return NextResponse.json({
        message: `Test suite deleted: ${suiteId}`
      });
    } else {
      return NextResponse.json({
        error: `Test suite not found: ${suiteId}`
      }, { status: 404 });
    }
  } catch (error) {
    console.error('[API] Failed to delete test suite:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete test suite'
    }, { status: 500 });
  }
} 