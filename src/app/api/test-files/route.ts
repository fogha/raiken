import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEST_SCRIPTS_DIR = 'generated-tests';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const directory = url.searchParams.get('directory');
    const filename = url.searchParams.get('filename');

    // If specific file requested
    if (directory && filename) {
      const filePath = path.join(directory, filename);
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ 
          error: 'File not found' 
        }, { status: 404 });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json({
        name: filename.replace('.spec.ts', ''),
        path: filePath,
        content
      });
    }

    // List all test files
    if (!fs.existsSync(TEST_SCRIPTS_DIR)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(TEST_SCRIPTS_DIR)
      .filter(file => file.endsWith('.spec.ts'))
      .map(file => {
        const filePath = path.join(TEST_SCRIPTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        
        return {
          name: file.replace('.spec.ts', ''),
          path: filePath,
          content,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ files });

  } catch (error) {
    console.error('[API] Error listing test files:', error);
    return NextResponse.json({ 
      error: 'Failed to list test files' 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const directory = url.searchParams.get('directory');
    const filename = url.searchParams.get('filename');

    if (!directory || !filename) {
      return NextResponse.json({ 
        error: 'Missing directory or filename parameter' 
      }, { status: 400 });
    }

    const filePath = path.join(directory, filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    
    return NextResponse.json({ 
      success: true,
      message: 'File deleted successfully' 
    });

  } catch (error) {
    console.error('[API] Error deleting test file:', error);
    return NextResponse.json({ 
      error: 'Failed to delete test file' 
    }, { status: 500 });
  }
} 