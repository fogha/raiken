import { NextRequest, NextResponse } from 'next/server';
import { PlaywrightService } from '@/core/browser/playwright.service';

/**
 * Browser API Handler
 * Handles browser automation for DOM extraction and page interaction
 * 
 * Actions:
 * - navigate: Navigate to a URL
 * - extract-dom: Extract DOM tree from current page
 */

const playwrightService = new PlaywrightService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'navigate':
        return handleNavigate(params);
      case 'extract-dom':
        return handleExtractDOM(params);
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
