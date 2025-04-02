import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to fetch test results
 * 
 * Query parameters:
 * - testId: Optional ID of the test to fetch results for
 */
export async function GET(req: Request) {
  try {
    // Get the test ID from the URL query parameters
    const url = new URL(req.url);
    const testId = url.searchParams.get('testId');
    
    // Path to the test results directory
    const resultsDir = path.join(process.cwd(), 'test-results');
    
    // Check if the directory exists
    if (!fs.existsSync(resultsDir)) {
      return NextResponse.json({ 
        results: [],
        message: 'No test results found' 
      });
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.json')) // Only include JSON files
      .map(file => {
        const filePath = path.join(resultsDir, file);
        const stats = fs.statSync(filePath);
        return { 
          name: file, 
          path: filePath,
          createdAt: stats.birthtime
        };
      });
    
    // If no files are found
    if (files.length === 0) {
      return NextResponse.json({ 
        results: [],
        message: 'No test results found' 
      });
    }
    
    // Sort files by creation time (newest first)
    files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // If a test ID is provided, try to find the most recent file for that test
    let targetFile;
    if (testId) {
      // First check for any file that contains the test ID in its contents
      for (const file of files) {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          const data = JSON.parse(content);
          
          // Check if this file contains data for the requested test ID
          if (data.testId === testId || data.id === testId) {
            targetFile = file;
            break;
          }
        } catch (error) {
          console.error(`Error reading file ${file.path}:`, error);
          // Continue to the next file if there's an error
          continue;
        }
      }
    }
    
    // If no specific file was found for the test ID, use the most recent file
    if (!targetFile) {
      targetFile = files[0];
    }
    
    // Read and parse the target file
    try {
      const content = fs.readFileSync(targetFile.path, 'utf8');
      const data = JSON.parse(content);
      
      return NextResponse.json({
        results: data.results || [],
        timestamp: targetFile.createdAt.toISOString(),
        fileName: targetFile.name,
        testId: data.testId || data.id
      });
    } catch (error) {
      console.error(`Error reading or parsing file ${targetFile.path}:`, error);
      return NextResponse.json({ 
        error: 'Error reading test results',
        results: [] 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error retrieving test results:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve test results',
      results: [] 
    }, { status: 500 });
  }
}
