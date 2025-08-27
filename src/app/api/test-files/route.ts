import { NextResponse } from 'next/server';
import fs from 'fs/promises';
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
      const projectRoot = path.resolve(process.cwd());
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(projectRoot)) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
      }

      try {
        await fs.access(filePath);
      } catch {
        return NextResponse.json({
          error: 'File not found'
        }, { status: 404 });
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({
        name: filename.replace('.spec.ts', ''),
        path: filePath,
        content
      });
    }

    // List all test files
    try {
      await fs.access(TEST_SCRIPTS_DIR);
    } catch {
      return NextResponse.json({ files: [] });
    }

    const fileNames = await fs.readdir(TEST_SCRIPTS_DIR);
    const entries = await Promise.all(
      fileNames
        .filter((file) => file.endsWith('.spec.ts'))
        .map(async (file) => {
          const filePath = path.join(TEST_SCRIPTS_DIR, file);
          const [content, stats] = await Promise.all([
            fs.readFile(filePath, 'utf-8'),
            fs.stat(filePath)
          ]);
          return {
            name: file.replace('.spec.ts', ''),
            path: filePath,
            content,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString()
          };
        })
    );

    const files = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    // Prefer JSON body with a full testPath to unify API shape
    let testPath: string | null = null;
    try {
      const body = await req.json();
      testPath = body?.testPath || null;
    } catch {
      // Ignore body parse errors and fallback to query params below
    }

    if (!testPath) {
      const url = new URL(req.url);
      const directory = url.searchParams.get('directory');
      const filename = url.searchParams.get('filename');
      if (directory && filename) {
        testPath = path.join(directory, filename);
      }
    }

    if (!testPath) {
      return NextResponse.json({
        error: 'Missing required parameter: testPath'
      }, { status: 400 });
    }

    const projectRoot = path.resolve(process.cwd());
    const filePath = path.resolve(process.cwd(), testPath);
    if (!filePath.startsWith(projectRoot)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({
        error: 'File not found'
      }, { status: 404 });
    }

    await fs.unlink(filePath);
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