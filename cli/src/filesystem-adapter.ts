import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectInfo, ensureTestDirectory } from './project-detector';
import { AIService, AIAnalysisRequest } from './ai-service';

interface TestFile {
  name: string;
  path: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
}

export class LocalFileSystemAdapter {
  private projectPath: string;
  private projectInfo: ProjectInfo;
  private testDirectory: string;
  private aiService: AIService;

  constructor(projectPath: string, projectInfo: ProjectInfo) {
    this.projectPath = projectPath;
    this.projectInfo = projectInfo;
    this.testDirectory = path.join(projectPath, projectInfo.testDir);
    this.aiService = new AIService();
  }

  async getTestFiles(): Promise<TestFile[]> {
    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const testPattern = path.join(this.testDirectory, '**/*.{spec,test}.{ts,js}');
    const testFilePaths = await glob(testPattern);

    const testFiles: TestFile[] = [];

    for (const filePath of testFilePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        const relativePath = path.relative(this.projectPath, filePath);

        testFiles.push({
          name: path.basename(filePath),
          path: relativePath,
          content,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        });
      } catch (error) {
        console.error(`Failed to read test file ${filePath}:`, error);
      }
    }

    return testFiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveTestFile(content: string, filename: string, tabId?: string): Promise<string> {
    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    // Ensure filename has proper extension
    if (!filename.endsWith('.spec.ts') && !filename.endsWith('.test.ts')) {
      filename = filename.replace(/\.(js|ts)$/, '') + '.spec.ts';
    }

    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Create new file
    const fullPath = path.join(this.testDirectory, sanitizedFilename);
    await fs.writeFile(fullPath, content, 'utf-8');
    
    const relativePath = path.relative(this.projectPath, fullPath);
    console.log(`✅ Test saved: ${relativePath}`);
    return relativePath;
  }

  async deleteTestFile(testPath: string): Promise<void> {
    // Security check - ensure path is within project directory
    const fullPath = path.resolve(this.projectPath, testPath);
    const normalizedProjectPath = path.resolve(this.projectPath);
    
    if (!fullPath.startsWith(normalizedProjectPath)) {
      throw new Error('Invalid test path - outside project directory');
    }

    await fs.unlink(fullPath);
    console.log(`🗑️ Test deleted: ${testPath}`);
  }

  async executeTest(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string; reportId?: string }> {
    try {
      const { spawn } = require('child_process');
      
      // Resolve test path - handle various path formats
      let resolvedTestPath = testPath;
      
      console.log(`🔍 Resolving test path: "${testPath}"`);
      console.log(`📁 Project path: ${this.projectPath}`);
      console.log(`📁 Test directory: ${this.testDirectory}`);
      
      // Extract just the filename from the path (remove any directory prefixes)
      const filename = path.basename(testPath);
      console.log(`📄 Extracted filename: "${filename}"`);
      
      // Try to find the test file in the project's test directory
      const testFileInTestDir = path.join(this.testDirectory, filename);
      console.log(`🎯 Looking for test file at: ${testFileInTestDir}`);
      
      try {
        await fs.access(testFileInTestDir);
        // File exists in test directory, use relative path from project root
        resolvedTestPath = path.relative(this.projectPath, testFileInTestDir);
        console.log(`✅ Found test file! Using resolved path: "${resolvedTestPath}"`);
      } catch (accessError: any) {
        console.log(`❌ Test file not found at: ${testFileInTestDir}`);
        console.log(`   Access error:`, accessError?.code || accessError);
        
        // List all files in the test directory to see what's actually there
        try {
          const testDirContents = await fs.readdir(this.testDirectory);
          console.log(`📂 Files in test directory (${this.testDirectory}):`);
          testDirContents.forEach(file => console.log(`   - ${file}`));
          
          // Check if there's a similar filename (case-insensitive or partial match)
          const similarFiles = testDirContents.filter(file => 
            file.toLowerCase().includes(filename.toLowerCase().substring(0, 20)) ||
            filename.toLowerCase().includes(file.toLowerCase().substring(0, 20))
          );
          
          if (similarFiles.length > 0) {
            console.log(`🔍 Found similar files:`, similarFiles);
            // Use the first similar file
            resolvedTestPath = path.relative(this.projectPath, path.join(this.testDirectory, similarFiles[0]));
            console.log(`✅ Using similar file: "${resolvedTestPath}"`);
          } else {
            // Try to find the file anywhere in the project
            const glob = require('glob');
            const searchPattern = `**/${filename}`;
            console.log(`🔍 Searching for file with pattern: ${searchPattern}`);
            
            try {
              const matches = glob.sync(searchPattern, { cwd: this.projectPath });
              console.log(`🔍 Glob search results:`, matches);
              
              if (matches.length > 0) {
                resolvedTestPath = matches[0];
                console.log(`✅ Found test file via glob search: "${resolvedTestPath}"`);
              } else {
                console.log(`❌ No test file found matching: ${filename}`);
                
                // Try a broader search with just the first part of the filename
                const shortName = filename.split('_')[0];
                const broadPattern = `**/*${shortName}*.spec.ts`;
                console.log(`🔍 Trying broader search with pattern: ${broadPattern}`);
                
                const broadMatches = glob.sync(broadPattern, { cwd: this.projectPath });
                console.log(`🔍 Broad search results:`, broadMatches);
                
                if (broadMatches.length > 0) {
                  resolvedTestPath = broadMatches[0];
                  console.log(`✅ Found test file via broad search: "${resolvedTestPath}"`);
                } else {
                  // Keep original path and let Playwright handle the error
                  resolvedTestPath = filename;
                  console.log(`❌ All search attempts failed, using original filename: "${resolvedTestPath}"`);
                }
              }
            } catch (globError) {
              console.log(`❌ Glob search failed:`, globError);
              resolvedTestPath = filename;
            }
          }
        } catch (readdirError) {
          console.log(`❌ Could not read test directory:`, readdirError);
          resolvedTestPath = filename;
        }
      }
      
      // Ensure test-results directory exists
      const testResultsDir = path.join(this.projectPath, 'test-results');
      const reportsDir = path.join(testResultsDir, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      // Build Playwright command with JSON reporter
      const args = ['playwright', 'test', resolvedTestPath, '--reporter=json'];
      
      if (config.headless === false) {
        args.push('--headed');
      }
      
      // Always specify browser project to avoid running all browsers
      const browserType = config.browserType || 'chromium';
      args.push(`--project=${browserType}`);
      
      // Force single worker to prevent parallel execution
      args.push('--workers=1');
      
      // Also add --grep to ensure we only run the specific test
      const testName = path.basename(resolvedTestPath, '.spec.ts');
      args.push(`--grep=${testName}`);

      console.log(`Executing: npx ${args.join(' ')}`);
      console.log(`Working directory: ${this.projectPath}`);
      console.log(`Original test path: ${testPath}`);
      console.log(`Resolved test path: ${resolvedTestPath}`);
      console.log(`Test directory: ${this.testDirectory}`);
      
      const startTime = Date.now();
      
      return new Promise((resolve) => {
        const child = spawn('npx', args, {
          cwd: this.projectPath,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', async (code: number | null) => {
          const success = code === 0;
          const duration = Date.now() - startTime;
          
          // Generate report ID
          const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          try {
            // Parse Playwright JSON output to extract artifacts
            let playwrightResult: any = {};
            try {
              playwrightResult = JSON.parse(stdout);
            } catch {
              // If JSON parsing fails, create a basic structure
              playwrightResult = {
                config: {},
                suites: [],
                errors: stderr ? [{ message: stderr }] : [],
                stats: { duration: duration }
              };
            }
            
            // Collect artifacts (screenshots, videos, traces)
            const artifacts = await this.collectTestArtifacts(testResultsDir, resolvedTestPath);
            
            // Perform AI analysis for failed tests
            let aiAnalysis = null;
            if (!success) {
              console.log('🤖 Analyzing test failure with AI...');
              try {
                const analysisRequest: AIAnalysisRequest = {
                  testName: path.basename(testPath, '.spec.ts'),
                  testPath: resolvedTestPath,
                  rawOutput: stdout,
                  rawError: stderr,
                  playwrightResult: playwrightResult,
                  detailedErrors: this.parsePlaywrightErrors(playwrightResult, stderr),
                  screenshots: artifacts.screenshots,
                  videos: artifacts.videos
                };
                
                aiAnalysis = await this.aiService.analyzeTestFailure(analysisRequest);
                console.log(`✅ AI analysis completed (confidence: ${aiAnalysis.confidence}%)`);
              } catch (error) {
                console.warn('⚠️ AI analysis failed:', error);
              }
            }

            // Create comprehensive report
            const report = {
              id: reportId,
              testName: path.basename(testPath, '.spec.ts'),
              testPath: resolvedTestPath,
              timestamp: new Date().toISOString(),
              success: success,
              duration: duration,
              exitCode: code || 0,
              rawOutput: stdout,
              rawError: stderr,
              playwrightResult: playwrightResult,
              summary: aiAnalysis?.summary || (success ? 'Test passed successfully' : 'Test failed - check details below'),
              suggestions: aiAnalysis?.suggestions || (success ? undefined : 'Review the error details, screenshots, and videos for debugging information'),
              rootCause: aiAnalysis?.rootCause,
              fixRecommendations: aiAnalysis?.fixRecommendations,
              aiConfidence: aiAnalysis?.confidence,
              detailedErrors: this.parsePlaywrightErrors(playwrightResult, stderr),
              screenshots: artifacts.screenshots,
              videos: artifacts.videos,
              traces: artifacts.traces,
              browserLogs: artifacts.browserLogs,
              networkLogs: artifacts.networkLogs,
              needsAIAnalysis: !success && !aiAnalysis
            };
            
            // Save report to project directory
            // Ensure reports directory exists (double-check)
            await fs.mkdir(reportsDir, { recursive: true });
            const reportPath = path.join(reportsDir, `${reportId}.json`);
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`📊 Test report saved: ${reportPath}`);
            
            resolve({
              success,
              output: stdout,
              error: stderr,
              reportId: reportId
            });
          } catch (reportError) {
            console.error('Failed to generate test report:', reportError);
            resolve({
              success,
              output: stdout,
              error: stderr
            });
          }
        });

        child.on('error', (error: Error) => {
          resolve({
            success: false,
            error: error.message
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async collectTestArtifacts(testResultsDir: string, testPath: string): Promise<{
    screenshots: any[];
    videos: any[];
    traces: any[];
    browserLogs: any[];
    networkLogs: any[];
  }> {
    const artifacts = {
      screenshots: [] as any[],
      videos: [] as any[],
      traces: [] as any[],
      browserLogs: [] as any[],
      networkLogs: [] as any[]
    };

    try {
      // Look for test result directories
      const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'reports') {
          const artifactDir = path.join(testResultsDir, entry.name);
          const artifactFiles = await fs.readdir(artifactDir);
          
          for (const file of artifactFiles) {
            const filePath = path.join(artifactDir, file);
            const relativePath = path.relative(testResultsDir, filePath);
            
            if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
              artifacts.screenshots.push({
                name: file,
                path: filePath,
                relativePath: relativePath,
                url: `/api/artifacts/${relativePath}`
              });
            } else if (file.endsWith('.webm') || file.endsWith('.mp4')) {
              artifacts.videos.push({
                name: file,
                path: filePath,
                relativePath: relativePath,
                url: `/api/artifacts/${relativePath}`
              });
            } else if (file.endsWith('.zip') && file.includes('trace')) {
              artifacts.traces.push({
                name: file,
                path: filePath,
                relativePath: relativePath,
                url: `/api/artifacts/${relativePath}`
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to collect test artifacts:', error);
    }

    return artifacts;
  }

  private parsePlaywrightErrors(playwrightResult: any, stderr: string): any[] {
    const errors = [];

    // Extract errors from Playwright JSON result
    if (playwrightResult.errors && Array.isArray(playwrightResult.errors)) {
      errors.push(...playwrightResult.errors.map((error: any) => ({
        message: error.message || 'Configuration error',
        stack: error.stack || error.message,
        type: 'configuration'
      })));
    }

    // Extract errors from test results with more detail
    if (playwrightResult.suites && Array.isArray(playwrightResult.suites)) {
      for (const suite of playwrightResult.suites) {
        if (suite.specs) {
          for (const spec of suite.specs) {
            if (spec.tests) {
              for (const test of spec.tests) {
                if (test.results) {
                  for (const result of test.results) {
                    if (result.error) {
                      errors.push({
                        message: result.error.message || 'Test execution error',
                        stack: result.error.stack || result.error.message,
                        type: 'test_execution',
                        testTitle: test.title,
                        specFile: spec.file,
                        status: result.status,
                        duration: result.duration,
                        retry: result.retry || 0
                      });
                    }
                    
                    // Also capture failed assertions and timeouts
                    if (result.status === 'failed' || result.status === 'timedOut') {
                      const errorMessage = result.error?.message || 
                        (result.status === 'timedOut' ? 'Test timed out' : 'Test failed');
                      
                      errors.push({
                        message: errorMessage,
                        stack: result.error?.stack || stderr,
                        type: result.status === 'timedOut' ? 'timeout' : 'assertion_failure',
                        testTitle: test.title,
                        specFile: spec.file,
                        status: result.status,
                        duration: result.duration,
                        retry: result.retry || 0
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Parse stderr for additional context if no structured errors found
    if (errors.length === 0 && stderr) {
      const stderrErrors = this.parseStderrErrors(stderr);
      errors.push(...stderrErrors);
    }

    return errors;
  }

  private parseStderrErrors(stderr: string): any[] {
    const errors = [];
    
    if (stderr.includes('No tests found')) {
      errors.push({
        message: 'No tests found. Make sure that arguments are regular expressions matching test files.',
        stack: stderr,
        type: 'no_tests_found'
      });
    }
    
    if (stderr.includes('Error: browserType.launch: Executable doesn\'t exist')) {
      errors.push({
        message: 'Browser executable not found. Run "npx playwright install" to install browsers.',
        stack: stderr,
        type: 'browser_not_installed'
      });
    }
    
    if (stderr.includes('ECONNREFUSED') || stderr.includes('connection refused')) {
      const urlMatch = stderr.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : 'target server';
      errors.push({
        message: `Connection refused to ${url}. Make sure the server is running.`,
        stack: stderr,
        type: 'connection_refused',
        url: url
      });
    }
    
    if (stderr.includes('timeout') || stderr.includes('timed out')) {
      const timeoutMatch = stderr.match(/timeout (\d+)ms/);
      const timeout = timeoutMatch ? timeoutMatch[1] : 'unknown';
      errors.push({
        message: `Test timed out after ${timeout}ms. Consider increasing timeout or optimizing test performance.`,
        stack: stderr,
        type: 'timeout',
        timeout: timeout
      });
    }
    
    if (stderr.includes('net::ERR_')) {
      const networkErrorMatch = stderr.match(/net::(ERR_[A-Z_]+)/);
      const networkError = networkErrorMatch ? networkErrorMatch[1] : 'NETWORK_ERROR';
      errors.push({
        message: `Network error: ${networkError.replace(/_/g, ' ')}`,
        stack: stderr,
        type: 'network_error',
        networkError: networkError
      });
    }
    
    // Generic fallback
    if (errors.length === 0) {
      errors.push({
        message: 'Test execution failed - see raw output for details',
        stack: stderr,
        type: 'generic_failure'
      });
    }
    
    return errors;
  }

  async getReports(): Promise<any[]> {
    try {
      const reportsDir = path.join(this.projectPath, 'test-results', 'reports');
      
      try {
        await fs.access(reportsDir);
      } catch {
        // Reports directory doesn't exist yet
        return [];
      }

      const reportFiles = await fs.readdir(reportsDir);
      const reports = [];

      for (const file of reportFiles) {
        if (file.endsWith('.json')) {
          try {
            const reportPath = path.join(reportsDir, file);
            const reportContent = await fs.readFile(reportPath, 'utf-8');
            const report = JSON.parse(reportContent);
            
            // Update artifact paths to be relative to the bridge server
            if (report.screenshots) {
              report.screenshots = report.screenshots.map((screenshot: any) => ({
                ...screenshot,
                url: `/api/artifacts/${screenshot.relativePath}`
              }));
            }
            
            if (report.videos) {
              report.videos = report.videos.map((video: any) => ({
                ...video,
                url: `/api/artifacts/${video.relativePath}`
              }));
            }
            
            if (report.traces) {
              report.traces = report.traces.map((trace: any) => ({
                ...trace,
                url: `/api/artifacts/${trace.relativePath}`
              }));
            }
            
            reports.push(report);
          } catch (error) {
            console.warn(`Failed to read report file ${file}:`, error);
          }
        }
      }

      // Sort by timestamp (newest first)
      return reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get reports:', error);
      return [];
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      const reportsDir = path.join(this.projectPath, 'test-results', 'reports');
      const reportFiles = await fs.readdir(reportsDir);
      
      for (const file of reportFiles) {
        if (file.endsWith('.json')) {
          const reportPath = path.join(reportsDir, file);
          const reportContent = await fs.readFile(reportPath, 'utf-8');
          const report = JSON.parse(reportContent);
          
          if (report.id === reportId) {
            await fs.unlink(reportPath);
            console.log(`Deleted report: ${reportId}`);
            return;
          }
        }
      }
      
      throw new Error(`Report not found: ${reportId}`);
    } catch (error) {
      console.error(`Failed to delete report ${reportId}:`, error);
      throw error;
    }
  }
} 