import fs from 'fs/promises';
import path from 'path';
import { TestReport } from '@/core/testing/services/reports.service';
import { UITestReport } from '@/types/test';

/**
 * Extract test name from test script content
 */
function extractTestName(testScript: string): string {
  const testMatch = testScript.match(/test\s*\(\s*["']([^"']+)["']/);
  if (testMatch) return testMatch[1];
  
  const describeMatch = testScript.match(/test\.describe\s*\(\s*["']([^"']+)["']/);
  if (describeMatch) return describeMatch[1];
  
  return 'Unknown Test';
}

/**
 * Extract errors from various result formats
 */
function extractErrors(data: any): Array<{ message: string; location?: any }> {
  const errors: Array<{ message: string; location?: any }> = [];
  
  if (!data) return errors;
  
  // Handle new simplified format - just use raw error if test failed
  if (data.status === 'failure' && data.rawPlaywrightError) {
    errors.push({
      message: data.rawPlaywrightError,
      stack: data.rawPlaywrightError // The whole stderr is the stack trace
    });
  }
   
  return errors;
}

/**
 * GET /api/test-reports
 * Returns list of test reports or specific report by ID
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');
    const resultsDir = path.join(process.cwd(), 'test-results');

    // Check if directory exists
    try {
      await fs.access(resultsDir);
    } catch {
      return Response.json([]);
    }

    // Return specific report
    if (reportId) {
      try {
        const reportPath = path.join(resultsDir, `${reportId}.json`);
        const content = await fs.readFile(reportPath, 'utf8');
        const report = JSON.parse(content);
        return Response.json(report);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return Response.json({ error: 'Report not found' }, { status: 404 });
        }
        return Response.json({ error: 'Failed to read report' }, { status: 500 });
      }
    }

    // Return all reports - ONLY process ReportsService files
    try {
      const files = await fs.readdir(resultsDir);
      
      // Filter to only ReportsService files (those starting with "report-")
      // This eliminates duplicates by ignoring basic result files from TestSuiteManager
      const reportFiles = files.filter(f => 
        f.endsWith('.json') && 
        !f.startsWith('.') && 
        f.startsWith('report-')
      );
      
      // Transform ReportsService data to match UI expectations
      
      const reports: UITestReport[] = [];
      
      for (const file of reportFiles) {
        try {
          const filePath = path.join(resultsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const data: TestReport = JSON.parse(content);
          
          // ReportsService files have the proper structure already
          // Extract test name from testScript
          let testName = 'Unknown Test';
          if (data.testScript) {
            testName = extractTestName(data.testScript);
          }
          
          // Extract errors from results
          const errors = extractErrors(data);
          
          // Determine status from ReportsService data
          let success = data.status === 'success';
          let status: 'passed' | 'failed' | 'skipped' = 
            data.status === 'success' ? 'passed' : 
            data.status === 'failure' ? 'failed' : 'skipped';
          
          // Create report with the three key pieces of information
          const report: UITestReport = {
            id: path.basename(file, '.json'),
            timestamp: data.timestamp || new Date().toISOString(),
            testPath: data.testPath || 'Unknown Path', // Now stored in ReportsService
            testName,
            success,
            status,
            duration: data.durationMs || 0,
            summary: data.summary, // Direct from AI analysis
            suggestions: data.suggestions, // Direct from AI analysis  
            resultFile: file,
            browser: 'chromium', // Default since not stored in ReportsService
            retries: 0,
            errors: errors.length > 0 ? errors : undefined,
            // Pass through raw Playwright output directly
            ...(data.rawPlaywrightError && { rawPlaywrightError: data.rawPlaywrightError }),
            ...(data.rawPlaywrightOutput && { rawPlaywrightOutput: data.rawPlaywrightOutput })
          };
          
          reports.push(report);
        } catch (err) {
          console.warn(`Skipping invalid report file: ${file}`, err);
        }
      }
      
      // Sort by timestamp (newest first)
      reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return Response.json(reports);
      
    } catch (error) {
      console.error('Error reading reports directory:', error);
      return Response.json({ error: 'Failed to read reports' }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/test-reports?id=<reportId>
 * Deletes a specific test report
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');
    
    if (!reportId) {
      return Response.json({ error: 'Report ID required' }, { status: 400 });
    }
    
    const resultsDir = path.join(process.cwd(), 'test-results');
    const reportPath = path.join(resultsDir, `${reportId}.json`);
    
    try {
      await fs.unlink(reportPath);
      return Response.json({ success: true });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return Response.json({ error: 'Report not found' }, { status: 404 });
      }
      console.error('Error deleting report:', error);
      return Response.json({ error: 'Failed to delete report' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 