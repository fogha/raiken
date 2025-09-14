import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterService } from '@/core/testing/services/openrouter.service';
import * as testFileManager from '@/core/testing/services/testFileManager';
import { TestSuiteManager } from '@/core/testing/services/testSuite';
import { localBridge } from '@/lib/local-bridge';

/**
 * Unified Tests API Handler
 * Handles all test-related operations through a single endpoint
 */

const testSuiteManager = new TestSuiteManager({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  reportsDir: 'test-results'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate':
        return handleGenerateTest(params);
      case 'execute':
        return handleExecuteTest(params);
      case 'save':
        return handleSaveTest(params);
      case 'list':
        return handleListTests(params);
      case 'delete':
        return handleDeleteTest(params);
      case 'get-reports':
        return handleGetReports(params);
      case 'delete-report':
        return handleDeleteReport(params);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Tests API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'list':
        return handleListTests({});
      case 'reports':
        return handleGetReports({});
      default:
        return handleListTests({});
    }
  } catch (error) {
    console.error('Tests API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const testPath = url.searchParams.get('path');
    const reportId = url.searchParams.get('id');

    if (action === 'delete-report') {
      if (!reportId) {
        return NextResponse.json(
          { success: false, error: 'Report ID is required' },
          { status: 400 }
        );
      }
      return handleDeleteReport({ id: reportId });
    } else {
      // Default: delete test
      if (!testPath) {
        return NextResponse.json(
          { success: false, error: 'Test path is required' },
          { status: 400 }
        );
      }
      return handleDeleteTest({ testPath });
    }
  } catch (error) {
    console.error('Tests API DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGenerateTest(params: any) {
  const { prompt, domTree, url, config } = params;

  if (!prompt) {
    return NextResponse.json(
      { success: false, error: 'Test generation prompt is required' },
      { status: 400 }
    );
  }

  try {
    const openRouterService = new OpenRouterService({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: config?.model || 'anthropic/claude-3.5-sonnet'
    });

    const testScript = await openRouterService.generateTestScript(
      prompt,
    );

    if (!testScript) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate test script' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      testScript,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleExecuteTest(params: any) {
  const {
    testPath,
    browserType = 'chromium',
    headless = true,
    retries = 1,
    timeout = 30000,
    maxFailures = 1,
    parallel = false,
    workers = 1,
    features = {},
    outputDir = 'test-results',
    reporters = ['json', 'html']
  } = params;

  if (!testPath) {
    return NextResponse.json(
      { success: false, error: 'Test path is required' },
      { status: 400 }
    );
  }

  try {
    // Create a test suite with the user's configuration
    const suite = await testSuiteManager.createTestSuite({
      name: 'user-configured',
      browserType,
      headless,
      retries,
      timeout,
      maxFailures,
      features: {
        screenshots: features.screenshots !== false,
        video: features.video !== false,
        tracing: features.tracing !== false
      }
    });
    
    const result = await testSuiteManager.executeTest({
      testPath,
      suiteId: suite.id
    });

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleSaveTest(params: any) {
  const { content, filename, tabId } = params;

  if (!content || !filename) {
    return NextResponse.json(
      { success: false, error: 'Content and filename are required' },
      { status: 400 }
    );
  }

  try {
    const result = await testFileManager.saveTestScript(filename, content, tabId);
    return NextResponse.json({
      success: true,
      filePath: result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleListTests(params: any) {
  try {
    // Try to load via local CLI first, then fallback to server
    let bridgeConnection = localBridge.getConnectionInfo();
    if (!bridgeConnection) {
      console.log(`[Raiken] No bridge connection found, attempting to detect local CLI...`);
      bridgeConnection = await localBridge.detectLocalCLI();
    }

    if (bridgeConnection && localBridge.isConnected()) {
      console.log('[Raiken] 📁 Loading tests via local CLI...');
      const result = await localBridge.getLocalTestFiles();
      
      if (result.success && result.files && Array.isArray(result.files)) {
        console.log(`[Raiken] ✅ Loaded ${result.files.length} tests from local project`);
        return NextResponse.json({
          success: true,
          files: result.files
        });
      } else {
        console.warn('[Raiken] ⚠️ Local CLI load failed or returned invalid data, falling back to server:', result.error);
        // Continue to fallback below
      }
    }
    
    // Fallback: Load via hosted server (existing behavior)
    console.log('[Raiken] 📁 Loading tests via hosted server...');
    const files = await testFileManager.listTestScripts();
    return NextResponse.json({
      success: true,
      files
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleDeleteTest(params: any) {
  const { testPath } = params;

  if (!testPath) {
    return NextResponse.json(
      { success: false, error: 'Test path is required' },
      { status: 400 }
    );
  }

  try {
    await testFileManager.deleteTestScript(testPath);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Extract a readable test name from a test file path
 */
function extractTestNameFromPath(testPath: string): string {
  if (!testPath) return 'Unknown Test';
  
  try {
    // Extract filename without extension
    const filename = testPath.split('/').pop()?.replace('.spec.ts', '') || '';
    
    // Handle tab-based filenames (e.g., "wakiti_login_test_tab_1757669967942_193")
    if (filename.includes('_tab_')) {
      const parts = filename.split('_tab_')[0];
      return parts
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Handle regular filenames
    return filename
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    console.warn('Failed to extract test name from path:', testPath, error);
    return 'Unknown Test';
  }
}

async function handleGetReports(params: any) {
  try {
    const { testReportsService } = await import('@/core/testing/services/reports.service');
    const reports = await testReportsService.getReports();
    
    return NextResponse.json({
      success: true,
      reports
    });
  } catch (error: any) {
    console.error('Failed to get reports:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleDeleteReport(params: any) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Report ID is required' },
      { status: 400 }
    );
  }

  try {
    const { testReportsService } = await import('@/core/testing/services/reports.service');
    const success = await testReportsService.deleteReport(id);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Report not found or cannot be deleted' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
