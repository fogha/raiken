import { getTestExecutor } from '@/core/testing';

/**
 * API endpoint to get test reports
 */
export async function GET(req: Request) {
  try {
    // Extract query parameters
    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');
    
    // Get config from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = 'anthropic/claude-3-sonnet'; // Default model
    
    if (!apiKey) {
      return Response.json({ 
        error: 'Server configuration error: No API key found for OpenRouter' 
      }, { status: 500 });
    }
    
    // Create test executor
    const executor = getTestExecutor({
      apiKey,
      model,
      timeout: 30000,
      outputDir: './test-results'
    });
    
    // If a specific report ID is provided, return just that report
    if (reportId) {
      const report = executor.getTestReportById(reportId);
      
      if (!report) {
        return Response.json({ error: 'Report not found' }, { status: 404 });
      }
      
      return Response.json(report);
    }
    
    // Otherwise return all reports
    const reports = executor.getTestReports();
    return Response.json(reports);
    
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
    
    // Get config from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = 'anthropic/claude-3-sonnet'; // Default model
    
    if (!apiKey) {
      return Response.json({ 
        error: 'Server configuration error: No API key found for OpenRouter' 
      }, { status: 500 });
    }
    
    // Create test executor
    const executor = getTestExecutor({
      apiKey,
      model,
      timeout: 30000,
      outputDir: './test-results'
    });
    
    // Delete the report
    const success = executor.deleteTestReport(reportId);
    
    if (!success) {
      return Response.json({ 
        error: 'Failed to delete report or report not found' 
      }, { status: 404 });
    }
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('[API] Error deleting test report:', error);
    return Response.json({ 
      error: 'Failed to delete test report' 
    }, { status: 500 });
  }
}
