import { NextRequest, NextResponse } from 'next/server';
import { PlaywrightService } from '@/core/browser/playwright.service';

/**
 * Unified Browser API Handler
 * Handles all browser-related operations through a single endpoint
 */

const playwrightService = new PlaywrightService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'initialize':
        return handleInitialize(params);
      case 'navigate':
        return handleNavigate(params);
      case 'extract-dom':
        return handleExtractDOM(params);
      case 'take-screenshot':
        return handleScreenshot(params);
      case 'execute-test':
        return handleExecuteTest(params);
      case 'close':
        return handleClose(params);
      case 'get-page-info':
        return handleGetPageInfo(params);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Browser API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleInitialize(params: any) {
  const { headless = true, browserType = 'chromium', scriptId } = params;
  
  try {
    await playwrightService.initialize(scriptId, browserType, headless);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleNavigate(params: any) {
  const { url, scriptId } = params;
  
  if (!url) {
    return NextResponse.json(
      { success: false, error: 'URL is required' },
      { status: 400 }
    );
  }

  try {
    await playwrightService.navigate(url, scriptId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleExtractDOM(params: any) {
  const { scriptId } = params;
  
  try {
    const domTree = await playwrightService.extractDOM();
    return NextResponse.json({ success: true, domTree });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleScreenshot(params: any) {
  const { scriptId, clip } = params;
  
  try {
    const screenshot = await playwrightService.takeScreenshot({ clip });
    return NextResponse.json({ success: true, screenshot });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleExecuteTest(params: any) {
  const { script, config } = params;
  
  if (!script) {
    return NextResponse.json(
      { success: false, error: 'Test script is required' },
      { status: 400 }
    );
  }

  try {
    const result = await playwrightService.runTestScript(script, config);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleClose(params: any) {
  const { scriptId } = params;
  
  try {
    if (scriptId) {
      await playwrightService.close(scriptId);
    } else {
      await playwrightService.close();
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


async function handleGetPageInfo(params: any) {
  try {
    const pageInfo = await playwrightService.getPageInfo();
    return NextResponse.json({ success: true, pageInfo });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
