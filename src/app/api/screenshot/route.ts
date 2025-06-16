import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');

    if (!imagePath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Security check: ensure the path is within the test-results directory
    const fullPath = path.resolve(imagePath);
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    
    if (!fullPath.startsWith(testResultsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(fullPath);
    
    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    }

    // Return the image
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error serving screenshot:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to serve screenshot' 
    }, { status: 500 });
  }
} 