import { NextRequest, NextResponse } from 'next/server';
import PlaywrightService from '@/core/browser/playwright.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fullPage = searchParams.get('fullPage') !== 'false';
    const type = searchParams.get('type') as 'png' | 'jpeg' || 'png';
    const quality = parseInt(searchParams.get('quality') || '90');

    console.log('Taking screenshot with options:', { fullPage, type, quality });
    
    const screenshotOptions: any = {
      fullPage,
      type
    };
    
    // Only add quality for JPEG screenshots
    if (type === 'jpeg') {
      screenshotOptions.quality = quality;
    }

    const screenshot = await PlaywrightService.takeScreenshot(screenshotOptions);
    
    console.log('Screenshot taken successfully');
    
    return NextResponse.json({ 
      success: true, 
      screenshot,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Screenshot API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { screenshotOptions } = await request.json();
    console.log('Taking screenshot with options:', screenshotOptions);
    const screenshot = await PlaywrightService.takeScreenshot(screenshotOptions || {});
    console.log('Screenshot taken successfully');
    
    return NextResponse.json({ 
      success: true, 
      screenshot,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Screenshot API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 