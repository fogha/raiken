import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectInfo, TestFile, TestReport } from './project-detector';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class LocalFileSystemAdapter {
  public readonly projectPath: string;
  private projectInfo: ProjectInfo;
  public readonly testDirectory: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private fileWatchers: Map<string, any> = new Map();
  
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TEST_FILES_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly REPORTS_TTL = 1 * 60 * 1000; // 1 minute

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
          if (filename && this.isTestFile(filename)) {
            this.invalidateCache('test-files');
          }
        });
        
        this.fileWatchers.set('test-directory', watcher);
      }
    } catch (error) {
      // Silent fail - file watching is not critical
    }
  }

  private isTestFile(filename: string): boolean {
    return filename.endsWith('.spec.ts') || 
           filename.endsWith('.test.ts') || 
           filename.endsWith('.spec.js') || 
           filename.endsWith('.test.js');
  }

  private getCacheKey(operation: string, ...params: any[]): string {
    return `${operation}:${params.join(':')}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async getTestFiles(): Promise<TestFile[]> {
    const cacheKey = this.getCacheKey('test-files');
    
    const cached = this.getFromCache<TestFile[]>(cacheKey);
    if (cached) {
      return cached;
    }

    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const testPattern = path.join(this.testDirectory, '**/*.{spec,test}.{ts,js}');
    const glob = require('glob');
    const testFilePaths = glob.sync(testPattern);

    const testFiles: TestFile[] = [];

    for (const filePath of testFilePaths) {
      try {
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
      } catch (error) {
        continue;
      }
    }

    const sortedFiles = testFiles.sort((a, b) => a.name.localeCompare(b.name));
    this.setCache(cacheKey, sortedFiles, this.TEST_FILES_TTL);
    
    return sortedFiles;
  }

  async saveTestFile(content: string, filename: string, tabId?: string): Promise<string> {
    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const normalizedFilename = this.normalizeTestFilename(filename);
    const fullPath = path.join(this.testDirectory, normalizedFilename);
    
    await fs.writeFile(fullPath, content, 'utf-8');
    this.invalidateCache('test-files');
    
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
    this.invalidateCache('test-files');
  }

  async executeTest(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string; reportId?: string }> {
    console.log(`[CLI] Starting test execution for: ${testPath}`);
    
    try {
      const resolvedTestPath = await this.resolveTestPath(testPath);
      console.log(`[CLI] Resolved test path: ${resolvedTestPath}`);
      
      // Check if test file exists
      const fullTestPath = path.resolve(this.projectPath, resolvedTestPath);
      try {
        await fs.access(fullTestPath);
        console.log(`[CLI] Test file exists: ${fullTestPath}`);
      } catch {
        console.error(`[CLI] Test file not found: ${fullTestPath}`);
        return {
          success: false,
          error: `Test file not found: ${resolvedTestPath}`,
          reportId: 'file-not-found'
        };
      }
      
      // Ensure directories exist
      const testResultsDir = path.join(this.projectPath, 'test-results');
      const reportsDir = path.join(testResultsDir, 'reports');
      
      try {
        // Create both test-results and reports directories
        await fs.mkdir(testResultsDir, { recursive: true });
        console.log(`[CLI] Created test-results directory: ${testResultsDir}`);
        await fs.mkdir(reportsDir, { recursive: true });
        console.log(`[CLI] Created reports directory: ${reportsDir}`);
        
        // Verify directories exist
        await fs.access(testResultsDir);
        await fs.access(reportsDir);
        console.log(`[CLI] Verified directories exist`);
      } catch (dirError) {
        console.error(`[CLI] Failed to create reports directory:`, dirError);
        
        // Try to create report in a fallback location
        const testBaseName = path.basename(resolvedTestPath, path.extname(resolvedTestPath));
        const reportId = `report_${testBaseName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        try {
          const tempReportsDir = path.join(this.projectPath, 'temp-reports');
          await fs.mkdir(tempReportsDir, { recursive: true });
          
          const failureReport = {
            id: reportId,
            testPath: resolvedTestPath,
            timestamp: new Date().toISOString(),
            success: false,
            output: '',
            error: `Failed to create reports directory: ${dirError}`,
            config,
            results: null,
          };
          const reportPath = path.join(tempReportsDir, `${reportId}.json`);
          await fs.writeFile(reportPath, JSON.stringify(failureReport, null, 2));
          console.log(`[CLI] Created directory failure report in temp location: ${reportId}`);
        } catch (reportError) {
          console.error(`[CLI] Failed to create directory failure report:`, reportError);
        }
        
        return {
          success: false,
          error: `Failed to create reports directory: ${dirError}`,
          reportId
        };
      }
      
      // Check if Playwright is available
    try {
      const { spawn } = require('child_process');
        console.log(`[CLI] Checking Playwright availability...`);
        
        const checkProcess = spawn('npx', ['playwright', '--version'], {
          cwd: this.projectPath,
          stdio: 'pipe'
        });
        
        const playwrightCheck = await new Promise((resolve, reject) => {
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
          }, 10000);
        });
      } catch (error) {
        console.error(`[CLI] Playwright check failed:`, error);
        
        // Create a report for Playwright availability failure
        const testBaseName = path.basename(resolvedTestPath, path.extname(resolvedTestPath));
        const reportId = `report_${testBaseName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        try {
          // Ensure the reports directory exists
          await fs.mkdir(reportsDir, { recursive: true });
          
          const failureReport = {
            id: reportId,
            testPath: resolvedTestPath,
            timestamp: new Date().toISOString(),
            success: false,
            output: '',
            error: `Playwright not available: ${error}`,
            config,
            results: null,
          };
          const reportPath = path.join(reportsDir, `${reportId}.json`);
          await fs.writeFile(reportPath, JSON.stringify(failureReport, null, 2));
          console.log(`[CLI] Created Playwright failure report: ${reportId}`);
        } catch (reportError) {
          console.error(`[CLI] Failed to create Playwright failure report:`, reportError);
        }
        
        return {
          success: false,
          error: `Playwright not available: ${error}`,
          reportId
        };
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
        console.error(`[CLI] Playwright process failed:`, processError);
        result = {
          success: false,
          output: '',
          error: `Playwright process failed: ${processError}`
        };
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
      
      this.invalidateCache('reports');
      
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
        try {
          const testDirContents = await fs.readdir(this.testDirectory);
          const similarFiles = testDirContents.filter(file => 
            file.toLowerCase().includes(filename.toLowerCase().substring(0, 20)) ||
            filename.toLowerCase().includes(file.toLowerCase().substring(0, 20))
          );
          
          if (similarFiles.length > 0) {
          return path.relative(this.projectPath, path.join(this.testDirectory, similarFiles[0]));
        }
        
            const glob = require('glob');
        const matches = glob.sync(`**/${filename}`, { cwd: this.projectPath });
              
              if (matches.length > 0) {
          return matches[0];
        }
        
                const shortName = filename.split('_')[0];
        const broadMatches = glob.sync(`**/*${shortName}*.spec.ts`, { cwd: this.projectPath });
        
        return broadMatches.length > 0 ? broadMatches[0] : filename;
      } catch {
        return filename;
      }
    }
  }

  private buildPlaywrightArgs(testPath: string, config: any): string[] {
    const args = ['playwright', 'test', testPath, '--reporter=json'];
      
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
      env: { ...process.env }
        });

    let output = '';
    let errorOutput = '';

        child.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      console.log(`[CLI] STDOUT: ${chunk.trim()}`);
        });

        child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.log(`[CLI] STDERR: ${chunk.trim()}`);
    });

    return new Promise((resolve, reject) => {
      let isResolved = false;
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (!isResolved) {
          console.log(`[CLI] Process timeout - killing child process`);
          child.kill('SIGTERM');
          isResolved = true;
          resolve({
            success: false,
            output: output || errorOutput,
            error: 'Test execution timeout (2 minutes)'
          });
        }
      }, 120000); // 2 minute timeout

      child.on('close', (code: number | null) => {
        if (!isResolved) {
          clearTimeout(timeout);
          isResolved = true;
          console.log(`[CLI] Process exited with code: ${code}`);
          const success = code === 0;
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
            output: '',
            error: `Process error: ${error.message}`
          });
        }
      });

      // Handle process spawn errors
      child.on('spawn', () => {
        console.log(`[CLI] Process spawned successfully`);
      });

      // Clean up event listeners on process exit
      child.on('exit', () => {
        child.removeAllListeners();
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
    
    try {
      const jsonMatch = result.output.match(/\{[\s\S]*"stats"[\s\S]*\}/);
      if (jsonMatch) {
        testResults = JSON.parse(jsonMatch[0]);
        console.log(`[CLI] Parsed test results:`, testResults.stats || 'No stats found');
      } else {
        console.log(`[CLI] No JSON results found in output`);
      }
    } catch (error) {
      console.log(`[CLI] Failed to parse test results:`, error);
    }
    
    // Use test path to create a consistent report ID (one report per test)
    const testBaseName = path.basename(testPath, path.extname(testPath));
    const reportId = `report_${testBaseName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
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
        hasSummary: !!analysis.summary, 
        confidence: analysis.confidence 
      });
      
      return {
        summary: analysis.summary,
        rootCause: analysis.rootCause || 'Unable to determine root cause',
        suggestions: analysis.suggestions,
        recommendations: analysis.fixRecommendations || ['Review test manually'],
        confidence: analysis.confidence || 0
      };
    } catch (error) {
      console.error('[CLI] AI analysis error:', error);
      console.error('[CLI] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        summary: 'AI analysis unavailable',
        rootCause: 'Unable to analyze failure',
        suggestions: 'Review test manually',
        recommendations: ['Check selectors', 'Verify timing', 'Review logs'],
        confidence: 0
      };
    }
  }

  private extractErrorInfo(result: any, testResults: any): { hasErrors: boolean; errorSummary: string; errorCount: number } {
    const errors: string[] = [];

    // Check main error
    if (result.error) {
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
    const cacheKey = this.getCacheKey('reports');
    
    const cached = this.getFromCache<TestReport[]>(cacheKey);
    if (cached) {
      return cached;
    }

      const reportsDir = path.join(this.projectPath, 'test-results', 'reports');
      
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

    this.setCache(cacheKey, sortedReports, this.REPORTS_TTL);
    
    return sortedReports;
  }

  async deleteReport(reportId: string): Promise<void> {
    const reportsDir = path.join(this.projectPath, 'test-results', 'reports');
    const reportPath = path.join(reportsDir, `${reportId}.json`);
    
    try {
            await fs.unlink(reportPath);
      this.invalidateCache('reports');
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
    this.cache.clear();
  }
} 

async function ensureTestDirectory(projectPath: string, testDir: string): Promise<void> {
  const testDirectory = path.join(projectPath, testDir);
  await fs.mkdir(testDirectory, { recursive: true });
} 