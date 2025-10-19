import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectInfo, TestFile, TestReport } from './project-detector';


enum ReportIdError {
  FILE_NOT_FOUND = 'file-not-found',
  EXECUTION_FAILED = 'execution-failed',
  PLAYWRIGHT_NOT_AVAILABLE = 'playwright-not-available',
  PLAYWRIGHT_CHECK_TIMEOUT = 'playwright-check-timeout',
  PLAYWRIGHT_PROCESS_FAILED = 'playwright-process-failed',
  SAVE_REPORT_FAILED = 'save-report-failed',
  FALLBACK_REPORT_CREATION_FAILED = 'fallback-report-creation-failed',
  INVALID_TEST_PATH = 'invalid-test-path',
  REPORT_CREATION_FAILED = 'report-creation-failed',
  REPORT_DELETION_FAILED = 'report-deletion-failed',
  REPORT_NOT_FOUND = 'report-not-found',
  AI_ANALYSIS_FAILED = 'ai-analysis-failed',
  AI_ANALYSIS_TIMEOUT = 'ai-analysis-timeout',
  AI_ANALYSIS_SERVICE_UNAVAILABLE = 'ai-analysis-service-unavailable',
  AI_ANALYSIS_SERVICE_TIMEOUT = 'ai-analysis-service-timeout',
  AI_ANALYSIS_SERVICE_ERROR = 'ai-analysis-service-error',
}

export class LocalFileSystemAdapter {
  public readonly projectPath: string;
  private projectInfo: ProjectInfo;
  public readonly testDirectory: string;
  private fileWatchers: Map<string, any> = new Map();

  constructor(projectPath: string, projectInfo: ProjectInfo) {
    this.projectPath = projectPath;
    this.projectInfo = projectInfo;
    this.testDirectory = path.join(projectPath, projectInfo.testDir);

    this.setupFileWatcher();
  }

  private setupFileWatcher(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.testDirectory)) {
        const watcher = fs.watch(this.testDirectory, { recursive: true }, (eventType: string, filename: string) => {
          // File watcher for potential future use
        });

        this.fileWatchers.set('test-directory', watcher);
      }
    } catch (error) {
      // Silent fail - file watching is not critical
    }
  }

  async getTestFiles(): Promise<TestFile[]> {

    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const testPattern = path.join(this.testDirectory, '**/*.{spec,test}.{ts,js}');
    const glob = require('glob');
    const testFilePaths = glob.sync(testPattern);

    const testFiles: TestFile[] = [];

    for (const filePath of testFilePaths) {
      const [content, stats] = await Promise.all([
        fs.readFile(filePath, 'utf-8'),
        fs.stat(filePath)
      ]);

      const relativePath = path.relative(this.projectPath, filePath);

      testFiles.push({
        name: path.basename(filePath),
        path: relativePath,
        content,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      });
    }

    const sortedFiles = testFiles.sort((a, b) => a.name.localeCompare(b.name));
    return sortedFiles;
  }

  async saveTestFile(content: string, filename: string, tabId?: string): Promise<string> {
    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const normalizedFilename = this.normalizeTestFilename(filename);
    const fullPath = path.join(this.testDirectory, normalizedFilename);

    await fs.writeFile(fullPath, content, 'utf-8');

    return path.relative(this.projectPath, fullPath);
  }

  private normalizeTestFilename(filename: string): string {
    // Remove any existing test extensions first
    let normalizedName = filename
      .replace(/\.(spec|test)\.(ts|js)$/, '')
      .replace(/\.(ts|js)$/, '');

    // Sanitize the base name
    normalizedName = normalizedName.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Add the .spec.ts extension
    return `${normalizedName}.spec.ts`;
  }

  async deleteTestFile(testPath: string): Promise<void> {
    const fullPath = path.resolve(this.projectPath, testPath);
    const normalizedProjectPath = path.resolve(this.projectPath);

    if (!fullPath.startsWith(normalizedProjectPath)) {
      throw new Error('Invalid test path - outside project directory');
    }

    await fs.unlink(fullPath);
  }

  async executeTest(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string; reportId?: string }> {
    console.log(`[CLI] Starting test execution for: ${testPath}`);

    try {
      // 1. Validate inputs
      if (!testPath || typeof testPath !== 'string' || testPath.trim() === '') {
        throw new Error('Test path must be a non-empty string');
      }

      if (!config || typeof config !== 'object') {
        throw new Error('Config must be a valid object');
      }

      // 2. Resolve and verify test path
      const resolvedTestPath = await this.resolveTestPath(testPath);
      const fullTestPath = path.resolve(this.projectPath, resolvedTestPath);

      try {
        await fs.access(fullTestPath);
      } catch {
        throw new Error(`Test file not found: ${resolvedTestPath}`);
      }

      // Use dedicated test-reports directory (separate from test-results)
      // This prevents Playwright from cleaning our reports when it cleans test-results
      const reportsDir = path.join(this.projectPath, 'test-reports');

      try {
        await fs.mkdir(reportsDir, { recursive: true });
        console.log(`[CLI] Reports directory ready: ${reportsDir}`);
      } catch (mkdirError) {
        console.error(`[CLI] Failed to create reports directory:`, mkdirError);
        throw new Error(`Failed to create reports directory: ${mkdirError}`);
      }

      // Check if Playwright is available
      try {
        const { spawn } = require('child_process');
        console.log(`[CLI] Checking Playwright availability...`);

        const checkProcess = spawn('npx', ['playwright', '--version'], {
          cwd: this.projectPath,
          stdio: 'pipe'
        });

        await new Promise((resolve, reject) => {
          let output = '';
          checkProcess.stdout.on('data', (data: Buffer) => {
            output += data.toString();
          });

          checkProcess.on('close', (code: number | null) => {
            if (code === 0) {
              console.log(`[CLI] Playwright is available: ${output.trim()}`);
              resolve(true);
            } else {
              reject(new Error(`Playwright not available (exit code: ${code})`));
            }
          });

          checkProcess.on('error', reject);

          // Timeout for the check
          setTimeout(() => {
            checkProcess.kill('SIGTERM');
            reject(new Error('Playwright check timeout'));
          }, 5000);
        });
      } catch (error) {
        throw new Error(`[CLI]Playwright check failed: ${error}. Please ensure Playwright is installed and available in the project.`);
      }

      const args = this.buildPlaywrightArgs(resolvedTestPath, config);
      console.log(`[CLI] Playwright command: npx ${args.join(' ')}`);

      let result;
      try {
        result = await this.runPlaywrightProcess(args);
        console.log(`[CLI] Playwright result:`, {
          success: result.success,
          outputLength: result.output?.length || 0,
          hasError: !!result.error
        });
      } catch (processError) {
        throw new Error(`[CLI] Playwright process failed: ${processError}. Please ensure Playwright is installed and available in the project.`);
      }

      // Always create a report, even for failed tests
      let reportId;
      try {
        reportId = await this.saveTestReport(resolvedTestPath, result, config, reportsDir);
        console.log(`[CLI] Saved report: ${reportId}`);
      } catch (reportError) {
        console.error(`[CLI] Failed to save report:`, reportError);
        // Create a minimal report even if saving fails
        const testBaseName = path.basename(resolvedTestPath, path.extname(resolvedTestPath));
        reportId = `report_${testBaseName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        try {
          // Ensure the reports directory exists for fallback
          await fs.mkdir(reportsDir, { recursive: true });

          const fallbackReport = {
            id: reportId,
            testPath: resolvedTestPath,
            timestamp: new Date().toISOString(),
            success: false,
            output: result.output || '',
            error: result.error || 'Unknown error',
            config,
            results: null,
            saveError: reportError instanceof Error ? reportError.message : String(reportError)
          };
          const reportPath = path.join(reportsDir, `${reportId}.json`);
          await fs.writeFile(reportPath, JSON.stringify(fallbackReport, null, 2));
          console.log(`[CLI] Created fallback report: ${reportId}`);
        } catch (fallbackError) {
          console.error(`[CLI] Even fallback report creation failed:`, fallbackError);
          reportId = 'report-creation-failed';
        }
      }

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        reportId
      };

    } catch (error: any) {
      console.error(`[CLI] Test execution failed with unhandled error:`, error);
      console.error(`[CLI] Error stack:`, error.stack);
      return {
        success: false,
        error: `Test execution failed: ${error.message || 'Unknown error'}`,
        reportId: 'execution-failed'
      };
    }
  }

  private async resolveTestPath(testPath: string): Promise<string> {
    const filename = path.basename(testPath);
    const testFileInTestDir = path.join(this.testDirectory, filename);

    try {
      await fs.access(testFileInTestDir);
      return path.relative(this.projectPath, testFileInTestDir);
    } catch {
      throw new Error(`Test file not found: ${testPath}`);
    }
  }

  private buildPlaywrightArgs(testPath: string, config: any): string[] {
    const args = ['playwright', 'test', testPath, '--reporter=json'];

    // Note: Reports are stored in test-reports/ (separate from test-results/)
    // This prevents Playwright from cleaning our reports when it cleans test-results/

    if (config.headless === false) {
      args.push('--headed');
    }

    return args;
  }

  private async runPlaywrightProcess(args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
    const { spawn } = require('child_process');

    console.log(`[CLI] Spawning process: npx ${args.join(' ')}`);
    console.log(`[CLI] Working directory: ${this.projectPath}`);

    const child = spawn('npx', args, {
      cwd: this.projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      detached: false
    });

    let output = '';
    let errorOutput = '';
    let jsonComplete = false;

    child.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      
      // Check if we have complete JSON with stats (indicates test completion)
      if (!jsonComplete && output.includes('"stats"') && output.includes('"duration"')) {
        try {
          JSON.parse(output);
          jsonComplete = true;
          console.log(`[CLI] Complete JSON output detected, waiting for process to exit...`);
          // Give it 5 seconds to clean up, then force kill
          setTimeout(() => {
            if (child.exitCode === null) {
              console.log(`[CLI] Process still running after JSON completion, force killing...`);
              child.kill('SIGKILL');
            }
          }, 5000);
        } catch (e) {
          // JSON not complete yet, continue collecting
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      errorOutput += chunk;
    });

    return new Promise((resolve, reject) => {
      let isResolved = false;

      // Add timeout to prevent hanging (3 minutes for safety)
      const timeout = setTimeout(() => {
        if (!isResolved) {
          console.log(`[CLI] Process timeout after 3 minutes - killing child process`);
          child.kill('SIGKILL');
          isResolved = true;
          
          // If we have complete JSON, treat as success despite timeout
          if (jsonComplete) {
            console.log(`[CLI] JSON was complete, treating as success`);
            resolve({
              success: true,
              output: output || errorOutput,
              error: undefined
            });
          } else {
            resolve({
              success: false,
              output: output || errorOutput,
              error: 'Test execution timeout (3 minutes)'
            });
          }
        }
      }, 180000); // 3 minutes

      child.on('exit', (code: number | null, signal: string | null) => {
        if (!isResolved) {
          clearTimeout(timeout);
          isResolved = true;
          console.log(`[CLI] Process exited with code: ${code}, signal: ${signal}`);
          const success = code === 0 || (code === null && jsonComplete);
          resolve({
            success,
            output: output || errorOutput,
            error: success ? undefined : (errorOutput || 'Test execution failed')
          });
        }
      });

      child.on('error', (error: Error) => {
        if (!isResolved) {
          clearTimeout(timeout);
          isResolved = true;
          console.error(`[CLI] Process error: ${error.message}`);
          resolve({
            success: false,
            output: output || errorOutput,
            error: `Process error: ${error.message}`
          });
        }
      });
    });
  }

  private async saveTestReport(
    testPath: string,
    result: { success: boolean; output: string; error?: string },
    config: any,
    reportsDir: string
  ): Promise<string> {
    let testResults: any = null;

    console.log(`[CLI] Parsing test results from output (${result.output?.length || 0} chars)`);
    
    // Try to parse the entire output as JSON first (Playwright outputs complete JSON)
    try {
      testResults = JSON.parse(result.output);
      console.log(`[CLI] Successfully parsed complete JSON output`);
    } catch (error) {
      // Fallback: try to extract JSON from mixed output
      const jsonMatch = result.output.match(/\{[\s\S]*"stats"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          testResults = JSON.parse(jsonMatch[0]);
          console.log(`[CLI] Successfully parsed JSON from regex match`);
        } catch (parseError) {
          console.log(`[CLI] Failed to parse JSON from regex match:`, parseError);
        }
      }
    }

    // If we still don't have results, create a basic structure
    if (!testResults) {
      console.log(`[CLI] No JSON results found, creating basic report structure`);
      testResults = {
        stats: {
          expected: result.success ? 1 : 0,
          unexpected: result.success ? 0 : 1,
          duration: 0
        },
        suites: [],
        errors: result.error ? [{ message: result.error }] : []
      };
    }

    const testBaseName = path.basename(testPath, path.extname(testPath));
    const timestamp = Date.now();
    const reportId = `report_${testBaseName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

    // Process test results to add URLs to artifacts and extract artifact list
    const artifacts = await this.extractArtifacts(testResults, this.projectPath);

    // Generate AI analysis for failed tests
    const aiAnalysis = result.success ? null : await this.generateAIAnalysis(result, testResults, config);

    const reportData = {
      id: reportId,
      testPath,
      timestamp: new Date().toISOString(),
      success: result.success,
      output: result.output,
      error: result.error,
      config,
      results: testResults, // Now contains URLs in attachments
      artifacts, // Simplified artifact list for easy access
      aiAnalysis,
      summary: {
        duration: testResults?.stats?.duration || 0
      }
    };

    const reportPath = path.join(reportsDir, `${reportId}.json`);
    console.log(`[CLI] Saving report to: ${reportPath}`);

    // Ensure the reports directory exists before writing
    try {
      await fs.access(reportsDir);
    } catch {
      console.log(`[CLI] Reports directory doesn't exist, creating it: ${reportsDir}`);
      await fs.mkdir(reportsDir, { recursive: true });
    }

    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`[CLI] Report saved successfully`);

    return reportId;
  }

  private async extractArtifacts(testResults: any, projectPath: string): Promise<Array<{
    name: string;
    contentType: string;
    path: string;
    relativePath: string;
    url: string;
  }>> {
    if (!testResults) return [];

    const artifacts: Array<{
      name: string;
      contentType: string;
      path: string;
      relativePath: string;
      url: string;
    }> = [];

    // Simple recursive function to find and process attachments
    const processAttachments = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach(processAttachments);
        return;
      }

      // If this is an attachment with a path, process it
      if (obj.path && obj.name && typeof obj.path === 'string') {
        try {
          const relativePath = path.relative(projectPath, obj.path);
          const url = `/api/artifacts/${encodeURIComponent(relativePath)}`;

          // Add URL to the original object
          obj.url = url;

          // Add to artifacts array
          artifacts.push({
            name: obj.name,
            contentType: obj.contentType || 'application/octet-stream',
            path: obj.path,
            relativePath,
            url
          });
        } catch (error) {
          console.error('[CLI] Error processing attachment:', obj.path, error);
        }
      }

      // Recursively process all object properties
      Object.values(obj).forEach(processAttachments);
    };

    try {
      processAttachments(testResults);
    } catch (error) {
      console.error('[CLI] Error extracting artifacts:', error);
    }

    return artifacts;
  }

  private async generateAIAnalysis(result: any, testResults: any, config: any): Promise<any> {
    try {
      console.log('[CLI] Starting AI analysis...');
      console.log('[CLI] OPENROUTER_API_KEY present:', !!process.env.OPENROUTER_API_KEY);

      const { AIService } = require('./ai-service');
      const aiService = new AIService();

      // Extract error information
      const errorInfo = this.extractErrorInfo(result, testResults);
      console.log('[CLI] Error info extracted:', { hasErrors: errorInfo.hasErrors, errorCount: errorInfo.errorCount });

      if (!errorInfo.hasErrors) {
        console.log('[CLI] No errors found, skipping AI analysis');
        return null;
      }

      // Create AI analysis request
      const request = {
        testName: 'Test Execution',
        testPath: 'unknown',
        rawOutput: result.output || '',
        rawError: result.error || '',
        playwrightResult: testResults || {},
        detailedErrors: errorInfo.errorSummary.split('\n').map(msg => ({ message: msg })),
        screenshots: [],
        videos: []
      };

      console.log('[CLI] Calling AI service with request...');
      const analysis = await aiService.analyzeTestFailure(request);
      console.log('[CLI] AI analysis completed:', {
        hasRootCause: !!analysis.rootCause,
        confidence: analysis.confidence
      });

      return {
        rootCause: analysis.rootCause,
        recommendations: analysis.fixRecommendations,
        confidence: analysis.confidence
      };
    } catch (error) {
      console.error('[CLI] AI analysis error:', error);
      console.error('[CLI] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        rootCause: 'AI analysis service unavailable - unable to analyze test failure automatically',
        recommendations: [
          'Review the raw test output and error messages manually',
          'Check if selectors are correct and elements are present on the page',
          'Verify test timing and add appropriate waits if needed',
          'Ensure the test environment and application are properly configured'
        ],
        confidence: 0
      };
    }
  }

  private extractErrorInfo(result: any, testResults: any): { hasErrors: boolean; errorSummary: string; errorCount: number } {
    const errors: string[] = [];

    // Only check main error if it's not a timeout error (timeout errors are misleading)
    if (result.error && !result.error.includes('timeout')) {
      errors.push(`Main Error: ${result.error}`);
    }

    // Simple recursive function to find all errors
    const findErrors = (obj: any, path: string = '') => {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => findErrors(item, `${path}[${index}]`));
        return;
      }

      // If this object has errors array, extract them
      if (obj.errors && Array.isArray(obj.errors)) {
        obj.errors.forEach((error: any) => {
          if (error.message) {
            errors.push(error.message.replace(/\u001b\[[0-9;]*m/g, '')); // Remove ANSI codes
            if (error.location) {
              errors.push(`  at ${error.location.file}:${error.location.line}:${error.location.column}`);
            }
          }
        });
      }

      // If this object has an error property, extract it
      if (obj.error && obj.error.message) {
        errors.push(obj.error.message.replace(/\u001b\[[0-9;]*m/g, '')); // Remove ANSI codes
      }

      // Recursively check all properties
      Object.values(obj).forEach(value => findErrors(value, path));
    };

    if (testResults) {
      findErrors(testResults);
    }

    return {
      hasErrors: errors.length > 0,
      errorSummary: errors.join('\n'),
      errorCount: errors.length
    };
  }

  async getReports(): Promise<TestReport[]> {

    const reportsDir = path.join(this.projectPath, 'test-reports');

    try {
      await fs.access(reportsDir);
    } catch {
      return [];
    }

    const reportFiles = await fs.readdir(reportsDir);
    const jsonFiles = reportFiles.filter(file => file.endsWith('.json'));

    const reports: TestReport[] = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(reportsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const reportData = JSON.parse(content);

        reports.push({
          id: reportData.id || path.basename(file, '.json'),
          testPath: reportData.testPath || 'unknown',
          timestamp: reportData.timestamp || new Date().toISOString(),
          success: reportData.success || false,
          output: reportData.output || '',
          error: reportData.error,
          config: reportData.config || {},
          results: reportData.results,
          artifacts: reportData.artifacts || [],
          aiAnalysis: reportData.aiAnalysis,
          summary: reportData.summary
        });
      } catch (error) {
        continue;
      }
    }

    const sortedReports = reports.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedReports;
  }

  async deleteReport(reportId: string): Promise<void> {
    const reportsDir = path.join(this.projectPath, 'test-reports');
    const reportPath = path.join(reportsDir, `${reportId}.json`);

    try {
      await fs.unlink(reportPath);
    } catch (error) {
      throw new Error(`Failed to delete report: ${reportId}`);
    }
  }

  cleanup(): void {
    for (const [, watcher] of this.fileWatchers) {
      try {
        watcher.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.fileWatchers.clear();
  }
}

async function ensureTestDirectory(projectPath: string, testDir: string): Promise<void> {
  const testDirectory = path.join(projectPath, testDir);
  await fs.mkdir(testDirectory, { recursive: true });
} 