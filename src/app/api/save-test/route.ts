import { NextResponse } from 'next/server';
import { saveTestScript } from '@/core/testing/services/testFileManager';

export async function POST(req: Request) {
  try {
    const { name, content, tabId } = await req.json();
    
    if (!name || !content) {
      return NextResponse.json({ 
        error: 'Missing required parameters: name and content' 
      }, { status: 400 });
    }

    // Save the test script using the server-side file manager with unique naming
    const filePath = await saveTestScript(name, content, tabId);
    
    return NextResponse.json({
      success: true,
      filePath,
      message: 'Test script saved successfully'
    });

  } catch (error) {
    console.error('[API] Error saving test script:', error);
    return NextResponse.json({ 
      error: 'Failed to save test script' 
    }, { status: 500 });
  }
} 