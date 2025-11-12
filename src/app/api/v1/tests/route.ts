import { NextRequest, NextResponse } from 'next/server';
import * as testFileManager from '@/core/testing/services/testFileManager';
import { TestSuiteManager } from '@/core/testing/services/testSuite';
import { localBridgeService } from '@/lib/local-bridge';
import { 
  ExecuteTestParams, 
  SaveTestParams, 
  DeleteTestParams, 
  DeleteReportParams 
} from '@/types/test-generation';
import { logger, generateRequestId } from '@/lib/logger';
import { ValidationError, TestExecutionError, BridgeError, FileSystemError } from '@/lib/errors';
import { handleError, validateRequired } from '@/lib/error-handler';

/**
 * Tests API Handler
 * Handles test execution, file management, and reporting
 * 
 * Actions:
 * - execute: Run a test file
 * - save: Save a test file
 * - list: List all test files
 * - delete: Delete a test file
 * - get-reports: Get test reports
 * - delete-report: Delete a test report
 * 
 * Note: Test generation is handled by /api/generate-test
 */

const testSuiteManager = new TestSuiteManager({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  reportsDir: 'test-results'
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const component = 'TestsAPI';
  
  try {
    logger.apiRequest(component, 'POST', '/api/v1/tests', { requestId });
    
    const body = await request.json();
    const { action, ...params } = body;

    validateRequired(action, 'action', { requestId });

    logger.info(component, `Processing ${action} request`, { requestId, action });

    switch (action) {
      case 'execute':
        return await handleExecuteTest(params, requestId);
      case 'save':
        return await handleSaveTest(params, requestId);
      case 'list':
        return await handleListTests(params, requestId);
      case 'delete':
        return await handleDeleteTest(params, requestId);
      case 'get-reports':
        return await handleGetReports(params, requestId);
      case 'delete-report':
        return await handleDeleteReport(params, requestId);
      default:
        logger.warn(component, 'Unknown action requested', { requestId, action });
        throw new ValidationError(`Unknown action: ${action}`, { action });
    }
  } catch (error) {
    return handleError(error, {
      requestId,
      component,
      operation: 'routeRequest',
      metadata: { endpoint: '/api/v1/tests', method: 'POST' }
    });
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const component = 'TestsAPI';

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'list';

    logger.apiRequest(component, 'GET', `/api/v1/tests?action=${action}`, { requestId });

    switch (action) {
      case 'list':
        return await handleListTests({}, requestId);
      case 'reports':
        return await handleGetReports({}, requestId);
      default:
        return await handleListTests({}, requestId);
    }
  } catch (error) {
    return handleError(error, {
      requestId,
      component,
      operation: 'getRequest',
      metadata: { endpoint: '/api/v1/tests', method: 'GET' }
    });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();
  const component = 'TestsAPI';

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const testPath = url.searchParams.get('path');
    const reportId = url.searchParams.get('id');

    logger.apiRequest(component, 'DELETE', `/api/v1/tests?${url.searchParams}`, { requestId });

    if (action === 'delete-report') {
      if (!reportId) {
        throw new ValidationError('Report ID is required');
      }
      return await handleDeleteReport({ id: reportId }, requestId);
    } else {
      // Default: delete test
      if (!testPath) {
        throw new ValidationError('Test path is required');
      }
      return await handleDeleteTest({ testPath }, requestId);
    }
  } catch (error) {
    return handleError(error, {
      requestId,
      component,
      operation: 'deleteRequest',
      metadata: { endpoint: '/api/v1/tests', method: 'DELETE' }
    });
  }
}

async function handleExecuteTest(params: ExecuteTestParams, requestId: string) {
  const component = 'TestExecution';
  
  const {
    testPath,
    browserType = 'chromium',
    headless = true,
    retries = 1,
    timeout = 30000,
    maxFailures = 1,
    parallel = false,
    workers = 1,
    features = {},
    outputDir = 'test-results',
    reporters = ['json', 'html']
  } = params;

  validateRequired(testPath, 'testPath', { requestId });

  try {
    logger.info(component, 'Starting test execution', {
      requestId,
      testPath,
      browserType,
      headless,
      retries,
      timeout
    });

    const startTime = Date.now();

    // Create a test suite with the user's configuration
    const suite = await testSuiteManager.createTestSuite({
      name: 'user-configured',
      browserType,
      headless,
      retries,
      timeout,
      maxFailures,
      features: {
        screenshots: features.screenshots !== false,
        video: features.video !== false,
        tracing: features.tracing !== false
      }
    });

    logger.debug(component, 'Test suite created', { requestId, suiteId: suite.id });
    
    const result = await testSuiteManager.executeTest({
      testPath,
      suiteId: suite.id
    });

    const duration = Date.now() - startTime;
    
    logger.performance(component, 'Test execution', duration, {
      requestId,
      testPath,
      success: result.success,
      suiteId: suite.id
    });

    return NextResponse.json({
      success: true,
      result,
      requestId,
      metadata: { executionTime: duration }
    });
    
  } catch (error) {
    logger.error(component, 'Test execution failed', error as Error, { requestId, testPath });
    throw new TestExecutionError(`Test execution failed for ${testPath}`, { testPath, requestId });
  }
}

async function handleSaveTest(params: SaveTestParams, requestId: string) {
  const component = 'TestSave';
  const { content, filename, tabId } = params;

  validateRequired(content, 'content', { requestId });
  validateRequired(filename, 'filename', { requestId });

  try {
    logger.info(component, 'Saving test file', {
      requestId,
      filename,
      contentLength: content.length,
      tabId
    });

    const startTime = Date.now();
    const result = await testFileManager.saveTestScript(filename, content, tabId);
    const duration = Date.now() - startTime;

    logger.performance(component, 'Test file save', duration, {
      requestId,
      filename,
      filePath: result
    });

    return NextResponse.json({
      success: true,
      filePath: result,
      requestId,
      metadata: { saveTime: duration }
    });
    
  } catch (error) {
    logger.error(component, 'Test file save failed', error as Error, { requestId, filename });
    throw new FileSystemError(`Failed to save test file: ${filename}`, { filename, requestId });
  }
}

async function handleListTests(params: Record<string, never>, requestId: string) {
  const component = 'TestList';
  
  try {
    logger.info(component, 'Loading test files', { requestId });

    // Try to load via local CLI first, then fallback to server
    const bridgeConnection = localBridgeService.getConnection();

    if (bridgeConnection && localBridgeService.isConnected()) {
      logger.debug(component, 'Attempting to load tests via local CLI', { requestId });
      
      const result = await localBridgeService.getTestFiles();
      
      if (result.success && result.files && Array.isArray(result.files)) {
        logger.info(component, 'Tests loaded via local CLI', { 
          requestId, 
          count: result.files.length,
          source: 'local-cli'
        });
        
        return NextResponse.json({
          success: true,
          files: result.files,
          source: 'local-cli',
          requestId
        });
      } else {
        logger.warn(component, 'Local CLI load failed, falling back to server', { 
          requestId, 
          error: result.error 
        });
      }
    } else {
      logger.debug(component, 'No bridge connection available, using server', { requestId });
    }
    
    // Fallback: Load via hosted server
    const files = await testFileManager.listTestScripts();
    
    logger.info(component, 'Tests loaded via server', { 
      requestId, 
      count: files.length,
      source: 'server'
    });

    return NextResponse.json({
      success: true,
      files,
      source: 'server',
      requestId
    });
    
  } catch (error) {
    logger.error(component, 'Failed to load test files', error as Error, { requestId });
    throw new FileSystemError('Failed to load test files', { requestId });
  }
}

async function handleDeleteTest(params: DeleteTestParams, requestId: string) {
  const component = 'TestDelete';
  const { testPath } = params;

  validateRequired(testPath, 'testPath', { requestId });

  try {
    logger.info(component, 'Deleting test file', { requestId, testPath });
    
    await testFileManager.deleteTestScript(testPath);
    
    logger.info(component, 'Test file deleted successfully', { requestId, testPath });
    
    return NextResponse.json({ 
      success: true,
      requestId 
    });
    
  } catch (error) {
    logger.error(component, 'Test deletion failed', error as Error, { requestId, testPath });
    throw new FileSystemError(`Failed to delete test: ${testPath}`, { testPath, requestId });
  }
}

/**
 * Extract a readable test name from a test file path
 */
function extractTestNameFromPath(testPath: string): string {
  if (!testPath) return 'Unknown Test';
  
  try {
    // Extract filename without extension
    const filename = testPath.split('/').pop()?.replace('.spec.ts', '') || '';
    
    // Handle tab-based filenames (e.g., "wakiti_login_test_tab_1757669967942_193")
    if (filename.includes('_tab_')) {
      const parts = filename.split('_tab_')[0];
      return parts
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Handle regular filenames
    return filename
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    console.warn('Failed to extract test name from path:', testPath, error);
    return 'Unknown Test';
  }
}

async function handleGetReports(params: Record<string, never>, requestId: string) {
  const component = 'ReportsGet';
  
  try {
    logger.info(component, 'Loading test reports', { requestId });
    
    let reports = [];
    let source = '';
    
    // Check if we should use local bridge
    if (localBridgeService.isConnected()) {
      logger.debug(component, 'Attempting to load reports via local CLI', { requestId });
      
      const bridgeResult = await localBridgeService.getReports();
      if (bridgeResult.success && bridgeResult.reports) {
        reports = bridgeResult.reports;
        source = 'local-cli';
        
        logger.info(component, 'Reports loaded via local CLI', { 
          requestId, 
          count: reports.length,
          source
        });
      } else {
        logger.warn(component, 'Local CLI reports load failed', { 
          requestId, 
          error: bridgeResult.error 
        });
      }
    }
    
    if (reports.length === 0) {
      // Fallback to Raiken's reports
      logger.debug(component, 'Loading reports via server', { requestId });
      
      const { testReportsService } = await import('@/core/testing/services/reports.service');
      reports = await testReportsService.getReports();
      source = 'server';
      
      logger.info(component, 'Reports loaded via server', { 
        requestId, 
        count: reports.length,
        source
      });
    }
    
    return NextResponse.json({
      success: true,
      reports,
      source,
      requestId,
      metadata: { count: reports.length }
    });
    
  } catch (error) {
    logger.error(component, 'Failed to get reports', error as Error, { requestId });
    throw new BridgeError('Failed to load test reports', { requestId });
  }
}

async function handleDeleteReport(params: DeleteReportParams, requestId: string) {
  const component = 'ReportsDelete';
  const { id } = params;

  validateRequired(id, 'id', { requestId });

  try {
    logger.info(component, 'Deleting test report', { requestId, reportId: id });

    // Check if we should use local bridge
    if (localBridgeService.isConnected()) {
      logger.debug(component, 'Deleting report via local CLI', { requestId, reportId: id });
      
      const bridgeResult = await localBridgeService.deleteReport(id);
      if (bridgeResult.success) {
        logger.info(component, 'Report deleted via local CLI', { requestId, reportId: id });
        
        return NextResponse.json({ 
          success: true,
          source: 'local-cli',
          requestId 
        });
      } else {
        logger.error(component, 'Local CLI report deletion failed', undefined, { 
          requestId, 
          reportId: id, 
          error: bridgeResult.error 
        });
        
        throw new BridgeError(`Failed to delete report via CLI: ${bridgeResult.error}`, { 
          reportId: id, 
          requestId 
        });
      }
    } else {
      // Fallback to Raiken's reports
      logger.debug(component, 'Deleting report via server', { requestId, reportId: id });
      
      const { testReportsService } = await import('@/core/testing/services/reports.service');
      const success = await testReportsService.deleteReport(id);
      
      if (success) {
        logger.info(component, 'Report deleted via server', { requestId, reportId: id });
        
        return NextResponse.json({ 
          success: true,
          source: 'server',
          requestId 
        });
      } else {
        logger.warn(component, 'Report not found for deletion', { requestId, reportId: id });
        
        throw new ValidationError('Report not found or cannot be deleted', { 
          reportId: id, 
          requestId 
        });
      }
    }
  } catch (error) {
    logger.error(component, 'Report deletion failed', error as Error, { requestId, reportId: id });
    
    if (error instanceof BridgeError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new BridgeError(`Failed to delete report: ${id}`, { reportId: id, requestId });
  }
}

