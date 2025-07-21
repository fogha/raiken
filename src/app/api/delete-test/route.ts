import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { testPath } = await req.json();
    
    if (!testPath) {
      return NextResponse.json({ 
        error: 'Missing required parameter: testPath' 
      }, { status: 400 });
    }

    // Resolve the full path to the test file
    const fullPath = path.resolve(process.cwd(), testPath);
    
    // Security check: ensure the file is within the project directory
    const projectRoot = path.resolve(process.cwd());
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json({ 
        error: 'Invalid file path' 
      }, { status: 400 });
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ 
        error: 'Test file not found' 
      }, { status: 404 });
    }

    // Delete the file
    await fs.unlink(fullPath);
    
    console.log(`[Arten] Deleted test file: ${testPath}`);
    
    return NextResponse.json({
      success: true,
      message: `Test file ${testPath} deleted successfully`
    });

  } catch (error) {
    console.error('[API] Delete test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete test file' 
    }, { status: 500 });
  }
} 