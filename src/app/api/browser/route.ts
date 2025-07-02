import { NextRequest, NextResponse } from 'next/server';
import PlaywrightService from '@/core/browser/playwright.service';

export async function POST(request: NextRequest) {
  try {
    // Get request body and log it for debugging
    const requestBody = await request.json();
    console.log('API Request Body:', requestBody);
    const { action, url, script, selector, value, type, property, scriptId, config } = requestBody;
    console.log('Parsed params:', { action, url, selector, type, property });
    
    if (action === 'initialize') {
      console.log('Initializing browser...');
      try {
        await PlaywrightService.initialize();
        console.log('Browser initialized successfully');
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Browser initialization failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
      }
    }
    
    if (action === 'navigate' && url) {
      console.log('Navigating to URL:', url);
      try {
        await PlaywrightService.navigate(url);
        console.log('Navigation successful');
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Navigation failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
      }
    }
    
    if (action === 'extractDOM') {
      console.log('Extracting DOM tree...');
      try {
        const domTree = await PlaywrightService.extractDOM();
        console.log('DOM extraction successful');
        return NextResponse.json({ success: true, domTree });
      } catch (error) {
        console.error('DOM extraction failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
      }
    }
    
    if (action === 'executeAction' && selector) {
      console.log('Executing action:', { type, selector, property, value });
      try {
        // Execute the action with all needed parameters
        const result = await PlaywrightService.executeAction({ 
          type, 
          selector, 
          value, 
          property 
        });
        console.log('Action executed successfully');
        return NextResponse.json({ success: true, result });
      } catch (error) {
        console.error('Action execution failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
      }
    }
    
        if (action === 'runTest' && script) {
      console.log(`[Arten API] Running test script for ID ${scriptId || 'default'} with config:`, config);
      
      // Run test with script ID and configuration if provided
      const result = await PlaywrightService.runTestScript(
        script, 
        scriptId, 
        config || { headless: true, browserType: 'chromium' }
      );
      
      return NextResponse.json({ success: true, result });
    }
    
    if (action === 'close') {
      // Check if a specific script ID was provided
      if (scriptId) {
        console.log(`[Arten API] Closing browser for script ${scriptId}`);
        await PlaywrightService.close(scriptId);
      } else {
        console.log('[Arten API] Closing all browser instances');
        await PlaywrightService.close();
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Browser API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
