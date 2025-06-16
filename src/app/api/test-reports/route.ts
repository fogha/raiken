import fs from 'fs';
import path from 'path';

/**
 * API endpoint to get test reports
 */
export async function GET(req: Request) {
  try {
    // Extract query parameters
    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');
    
    // Path to the test results directory
    const resultsDir = path.join(process.cwd(), 'test-results');
    
    // Check if the directory exists
    if (!fs.existsSync(resultsDir)) {
      return Response.json([]); // Return empty array if no results directory
    }
    
    // If a specific report ID is provided, return just that report
    if (reportId) {
      const reportPath = path.join(resultsDir, `${reportId}.json`);
      
      if (!fs.existsSync(reportPath)) {
        return Response.json({ error: 'Report not found' }, { status: 404 });
      }
      
      try {
        const content = fs.readFileSync(reportPath, 'utf8');
        const report = JSON.parse(content);
        return Response.json(report);
      } catch (error) {
        console.error(`Error reading report ${reportId}:`, error);
        return Response.json({ error: 'Error reading report' }, { status: 500 });
      }
    }
    
    // Otherwise return all reports
    try {
      // Read all JSON files in the directory
      const files = fs.readdirSync(resultsDir)
        .filter(file => file.endsWith('.json') && !file.startsWith('.')) // Exclude hidden files like .last-run.json
        .map(file => {
          const filePath = path.join(resultsDir, file);
          const stats = fs.statSync(filePath);
          return { 
            name: file, 
            path: filePath,
            createdAt: stats.birthtime
          };
        });
      
      // Sort by creation time (newest first)
      files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Read and parse each report file
      const reports = files.map(file => {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          const report = JSON.parse(content);
          
          // Determine actual success from test results
          let actualSuccess = report.success;
          if (report.results && typeof report.results === 'object') {
            const results = report.results;
            // Check Playwright stats if available
            if (results.stats) {
              actualSuccess = results.stats.unexpected === 0 && (results.stats.expected > 0 || results.stats.passed > 0);
            }
            // Check for suite results
            else if (results.suites && Array.isArray(results.suites)) {
              actualSuccess = results.suites.every((suite: any) => 
                suite.specs?.every((spec: any) => 
                  spec.tests?.every((test: any) => 
                    test.results?.every((result: any) => result.status === 'passed')
                  )
                )
              );
            }
          }

          // Transform the report to match the expected format
          return {
            id: path.basename(file.name, '.json'),
            timestamp: report.timestamp,
            testPath: report.testPath || 'Unknown',
            success: actualSuccess,
            status: actualSuccess ? 'success' : 'failure',
            duration: report.duration || 0,
            durationMs: report.duration || 0,
            results: report.results,
            summary: actualSuccess ? 'Test completed successfully' : 'Test failed',
            resultFile: file.name
          };
        } catch (error) {
          console.error(`Error parsing report ${file.name}:`, error);
          return null;
        }
      }).filter(Boolean); // Remove null entries
      
      return Response.json(reports);
      
    } catch (error) {
      console.error('Error reading test reports directory:', error);
      return Response.json({ 
        error: 'Failed to read test reports directory' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] Error retrieving test reports:', error);
    return Response.json({ 
      error: 'Failed to retrieve test reports' 
    }, { status: 500 });
  }
}

/**
 * API endpoint to delete a test report
 */
export async function DELETE(req: Request) {
  try {
    // Extract query parameters
    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');
    
    if (!reportId) {
      return Response.json({ 
        error: 'Report ID is required' 
      }, { status: 400 });
    }
    
    // Path to the test results directory
    const resultsDir = path.join(process.cwd(), 'test-results');
    const reportPath = path.join(resultsDir, `${reportId}.json`);
    
    // Check if the report file exists
    if (!fs.existsSync(reportPath)) {
      return Response.json({ 
        error: 'Report not found' 
      }, { status: 404 });
    }
    
    try {
      // Delete the report file
      fs.unlinkSync(reportPath);
      return Response.json({ success: true });
    } catch (error) {
      console.error(`Error deleting report ${reportId}:`, error);
      return Response.json({ 
        error: 'Failed to delete report file' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] Error deleting test report:', error);
    return Response.json({ 
      error: 'Failed to delete test report' 
    }, { status: 500 });
  }
}
