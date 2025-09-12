import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterService } from '@/core/testing/services/openrouter.service';
import * as testFileManager from '@/core/testing/services/testFileManager';
import { TestSuiteManager } from '@/core/testing/services/testSuite';

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
    const testPath = url.searchParams.get('path');

    if (!testPath) {
      return NextResponse.json(
        { success: false, error: 'Test path is required' },
        { status: 400 }
      );
    }

    return handleDeleteTest({ testPath });
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
    features = {}
  } = params;

  if (!testPath) {
    return NextResponse.json(
      { success: false, error: 'Test path is required' },
      { status: 400 }
    );
  }

  try {
    // Create a default test suite with the config
    const suite = await testSuiteManager.createTestSuite({
      name: 'default',
      browserType,
      headless,
      retries,
      timeout,
      features
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

async function handleGetReports(params: any) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const reportsDir = path.resolve(process.cwd(), 'test-results');
    
    try {
      const files = await fs.readdir(reportsDir);
      const reportFiles = files.filter(file => file.startsWith('report-') && file.endsWith('.json'));
      
      const reports = await Promise.all(
        reportFiles.map(async (file) => {
          const filePath = path.join(reportsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          return JSON.parse(content);
        })
      );
      
      return NextResponse.json({
        success: true,
        reports: reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      });
    } catch (dirError) {
      // Reports directory doesn't exist or is empty
      return NextResponse.json({
        success: true,
        reports: []
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
