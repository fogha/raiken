import fs from 'fs/promises';
import path from 'path';

// Size/scope limits to keep reports lean (override via env)
const MAX_SCREENSHOTS = parseInt(process.env.RAIKEN_REPORT_MAX_SCREENSHOTS || '10');
const MAX_VIDEOS = parseInt(process.env.RAIKEN_REPORT_MAX_VIDEOS || '5');
const MAX_TRACES = parseInt(process.env.RAIKEN_REPORT_MAX_TRACES || '5');
const MAX_ERRORS = parseInt(process.env.RAIKEN_REPORT_MAX_ERRORS || '50');
const MAX_BROWSER_LOGS = parseInt(process.env.RAIKEN_REPORT_MAX_BROWSER_LOGS || '200');
const AI_STDIO_MAX = parseInt(process.env.RAIKEN_AI_STDIO_MAX || '4000');
const ENABLE_AI_ANALYSIS = (process.env.RAIKEN_ENABLE_AI_ANALYSIS || 'true').toLowerCase() !== 'false';

export interface TestReport {
  id: string;
  timestamp: string;
  testName: string;
  testPath: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  exitCode: number;
  
  // Test artifacts
  screenshots: Array<{
    name: string;
    path: string;
    relativePath: string; // For serving via API
  }>;
  videos: Array<{
    name: string;
    path: string;
    relativePath: string; // For serving via API
  }>;
  traces: Array<{
    name: string;
    path: string;
    relativePath: string; // For serving via API
  }>;
  
  // Test output
  rawOutput: string;
  rawError: string;
  
  // AI Analysis (optional)
  summary?: string;
  suggestions?: string;
  
  // Parsed errors for better display
  errors: Array<{
    message: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
    stack?: string;
  }>;
  
  // Browser logs
  browserLogs: Array<{
    level: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    timestamp?: string;
  }>;
}

/**
 * Test Reports Service
 */
export class TestReportsService {
  private reportsDir: string;

  constructor(customReportsDir?: string) {
    this.reportsDir = customReportsDir || path.resolve(process.cwd(), 'test-reports');
  }

  /**
   * Update the reports directory (for project-centric storage)
   */
  setReportsDirectory(reportsDir: string) {
    this.reportsDir = reportsDir;
  }

  /**
   * Save a test report with all artifacts
   */
  async saveReport(data: {
    testName: string;
    testPath: string;
    exitCode: number;
    duration: number;
    rawOutput: string;
    rawError: string;
    summary?: string;
    suggestions?: string;
  }): Promise<TestReport> {
    
    const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Ensure directories exist
    await fs.mkdir(this.reportsDir, { recursive: true });
    
    // Collect artifacts
    const screenshots = await this.collectScreenshots(data.testPath);
    const videos = await this.collectVideos(data.testPath);
    const traces = await this.collectTraces(data.testPath);
    
    // Parse errors and logs
    const errors = this.parseErrors(data.rawOutput, data.rawError);
    const browserLogs = this.parseBrowserLogs(data.rawOutput, data.rawError);
    
    // Generate AI analysis for failed tests
    let summary = data.summary;
    let suggestions = data.suggestions;
    
    if (data.exitCode !== 0 && ENABLE_AI_ANALYSIS && process.env.OPENROUTER_API_KEY) {
      try {
        const aiAnalysis = await this.generateAIAnalysis({
          testName: this.extractTestName(data.testPath),
          testPath: data.testPath,
          duration: data.duration,
          errors,
          browserLogs,
          screenshots,
          videos,
          traces,
          rawOutput: data.rawOutput,
          rawError: data.rawError
        });
        summary = aiAnalysis.summary;
        suggestions = aiAnalysis.suggestions;
      } catch (aiError) {
        console.warn('[TestReports] AI analysis failed:', aiError);
        // Leave summary/suggestions undefined to avoid showing a generic AI section
      }
    }
    
    const passed = data.exitCode === 0;
    const report: TestReport = {
      id,
      timestamp,
      testName: data.testName || this.extractTestName(data.testPath),
      testPath: data.testPath,
      status: passed ? 'passed' : 'failed',
      duration: data.duration,
      exitCode: data.exitCode,
      // Enforce limits to prevent bloated JSON
      screenshots: screenshots.slice(-MAX_SCREENSHOTS),
      videos: videos.slice(-MAX_VIDEOS),
      traces: traces.slice(-MAX_TRACES),
      rawOutput: data.rawOutput,
      rawError: data.rawError,
      // Only include AI summary/suggestions when available or for passed tests
      summary: passed ? 'Test passed successfully' : summary,
      suggestions: passed ? undefined : suggestions,
      errors: errors.slice(0, MAX_ERRORS),
      browserLogs: browserLogs.slice(-MAX_BROWSER_LOGS)
    };
    
    // Save report
    const reportPath = path.join(this.reportsDir, `${id}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`[TestReports] Saved report: ${id}`);
    return report;
  }

  /**
   * Get all reports sorted by timestamp (newest first)
   */
  async getReports(): Promise<TestReport[]> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files.filter(file => file.endsWith('.json'));
      
      const reports = await Promise.all(
        reportFiles.map(async (file) => {
          const filePath = path.join(this.reportsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          return JSON.parse(content) as TestReport;
        })
      );
      
      // Sort by timestamp (newest first)
      return reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('[TestReports] Error getting reports:', error);
      return [];
    }
  }

  /**
   * Delete a specific report and its artifacts
   */
  async deleteReport(id: string): Promise<boolean> {
    try {
      const reportPath = path.join(this.reportsDir, `${id}.json`);
      await fs.unlink(reportPath);
      console.log(`[TestReports] Deleted report: ${id}`);
      return true;
    } catch (error) {
      console.error(`[TestReports] Error deleting report ${id}:`, error);
      return false;
    }
  }

  /**
   * Collect screenshots from test results
   */
  private async collectScreenshots(testPath: string): Promise<TestReport['screenshots']> {
    const screenshots: TestReport['screenshots'] = [];
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    
    try {
      // Look for screenshot directories
      const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(testResultsDir, entry.name);
          
          try {
            const files = await fs.readdir(dirPath);
            const screenshotFiles = files.filter(file => 
              file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
            );
            
            for (const file of screenshotFiles) {
              const fullPath = path.join(dirPath, file);
              const relativePath = path.relative(process.cwd(), fullPath);
              
              screenshots.push({
                name: file,
                path: fullPath,
                relativePath
              });
            }
          } catch (dirError) {
            // Skip directories we can't read
            continue;
          }
        }
      }
    } catch (error) {
      console.warn('[TestReports] Error collecting screenshots:', error);
    }
    
    return screenshots;
  }

  /**
   * Collect videos from test results
   */
  private async collectVideos(testPath: string): Promise<TestReport['videos']> {
    const videos: TestReport['videos'] = [];
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    
    try {
      // Look for video directories
      const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(testResultsDir, entry.name);
          
          try {
            const files = await fs.readdir(dirPath);
            const videoFiles = files.filter(file => 
              file.endsWith('.webm') || file.endsWith('.mp4')
            );
            
            for (const file of videoFiles) {
              const fullPath = path.join(dirPath, file);
              const relativePath = path.relative(process.cwd(), fullPath);
              
              videos.push({
                name: file,
                path: fullPath,
                relativePath
              });
            }
          } catch (dirError) {
            // Skip directories we can't read
            continue;
          }
        }
      }
    } catch (error) {
      console.warn('[TestReports] Error collecting videos:', error);
    }
    
    return videos;
  }

  /**
   * Collect traces from test results
   */
  private async collectTraces(testPath: string): Promise<TestReport['traces']> {
    const traces: TestReport['traces'] = [];
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    
    try {
      // Look for trace files
      const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(testResultsDir, entry.name);
          
          try {
            const files = await fs.readdir(dirPath);
            const traceFiles = files.filter(file => 
              file.endsWith('.zip') && file.includes('trace')
            );
            
            for (const file of traceFiles) {
              const fullPath = path.join(dirPath, file);
              const relativePath = path.relative(process.cwd(), fullPath);
              
              traces.push({
                name: file,
                path: fullPath,
                relativePath
              });
            }
          } catch (dirError) {
            // Skip directories we can't read
            continue;
          }
        }
      }
    } catch (error) {
      console.warn('[TestReports] Error collecting traces:', error);
    }
    
    return traces;
  }

  /**
   * Extract a readable test name from the test path
   */
  private extractTestName(testPath: string): string {
    const basename = path.basename(testPath, '.spec.ts');
    
    // Convert kebab-case or snake_case to Title Case
    return basename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Parse errors from Playwright output
   */
  private parseErrors(rawOutput: string, rawError: string): TestReport['errors'] {
    const errors: TestReport['errors'] = [];
    const combinedOutput = `${rawOutput}\n${rawError}`;
    
    // Try to parse JSON output first (Playwright JSON format)
    try {
      const jsonOutput = JSON.parse(rawOutput);
      if (jsonOutput.errors && Array.isArray(jsonOutput.errors)) {
        for (const error of jsonOutput.errors) {
          errors.push({
            message: error.message || 'Unknown error',
            stack: error.stack || undefined
          });
        }
      }
    } catch (jsonError) {
      // Not JSON, continue with text parsing
    }
    
    // Common Playwright error patterns
    const errorPatterns = [
      // No tests found error
      /Error: No tests found\./g,
      // Timeout errors
      /Test timeout of (\d+)ms exceeded/g,
      // Selector errors
      /Error: (?:Locator|Element) .* not found/g,
      // Navigation errors
      /Error: Navigation failed because .*/g,
      // Assertion errors
      /Error: expect\(.*\)\..*\n.*\n.*at .*/g,
      // General errors with stack traces
      /Error: (.*)\n.*at (.*):(\d+):(\d+)/g
    ];
    
    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(combinedOutput)) !== null) {
        const error: TestReport['errors'][0] = {
          message: match[1] || match[0],
        };
        
        // Try to extract location information
        if (match[2] && match[3] && match[4]) {
          error.location = {
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4])
          };
        }
        
        errors.push(error);
      }
    }
    
    // If no specific errors found, but we have error output, create a general error
    if (errors.length === 0 && (rawError.trim() || rawOutput.includes('Error'))) {
      errors.push({
        message: 'Test execution failed - see details below',
        stack: rawOutput.length > rawError.length ? rawOutput : rawError
      });
    }
    
    return errors;
  }

  /**
   * Parse browser logs from Playwright output
   */
  private parseBrowserLogs(rawOutput: string, rawError: string): TestReport['browserLogs'] {
    const logs: TestReport['browserLogs'] = [];
    const combinedOutput = `${rawOutput}\n${rawError}`;
    
    // Look for browser console logs
    const logPatterns = [
      // Console errors
      /console\.error: (.*)/g,
      // Console warnings
      /console\.warn: (.*)/g,
      // Console info
      /console\.info: (.*)/g,
      // Console log
      /console\.log: (.*)/g,
      // JavaScript errors
      /JavaScript error: (.*)/g,
    ];
    
    for (const pattern of logPatterns) {
      let match;
      while ((match = pattern.exec(combinedOutput)) !== null) {
        let level: 'error' | 'warning' | 'info' | 'debug' = 'info';
        
        if (pattern.source.includes('error')) {
          level = 'error';
        } else if (pattern.source.includes('warn')) {
          level = 'warning';
        } else if (pattern.source.includes('info')) {
          level = 'info';
        }
        
        logs.push({
          level,
          message: match[1] || match[0],
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return logs;
  }

  /**
   * Generate AI analysis for failed tests
   */
  private async generateAIAnalysis(context: {
    testName: string;
    testPath: string;
    duration: number;
    errors: TestReport['errors'];
    browserLogs: TestReport['browserLogs'];
    screenshots: TestReport['screenshots'];
    videos: TestReport['videos'];
    traces: TestReport['traces'];
    rawOutput: string;
    rawError: string;
  }): Promise<{ summary: string; suggestions: string; }> {
    const { OpenRouterService } = await import('./openrouter.service');
    
    const openRouter = new OpenRouterService({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: 'anthropic/claude-3.5-sonnet'
    });

    const truncate = (text: string, max = AI_STDIO_MAX) => text?.slice(0, max) || '';
    const topErrors = (context.errors || []).slice(0, 3);
    const recentLogs = (context.browserLogs || []).slice(-10);
    const artifacts = {
      screenshots: (context.screenshots || []).slice(-3).map(a => a.name),
      videos: (context.videos || []).slice(-2).map(a => a.name),
      traces: (context.traces || []).slice(-2).map(a => a.name)
    };

    const analysisPrompt = `You are an expert Playwright test analyst. Analyze this failed test and return STRICT JSON only.

Context:
- Test Name: ${context.testName}
- Test Path: ${context.testPath}
- Duration: ${context.duration}ms

Top Parsed Errors (up to 3):
${JSON.stringify(topErrors, null, 2)}

Recent Browser Logs (up to 10):
${JSON.stringify(recentLogs, null, 2)}

Artifacts:
${JSON.stringify(artifacts, null, 2)}

STDOUT (truncated):
${truncate(context.rawOutput)}

STDERR (truncated):
${truncate(context.rawError)}

Respond ONLY with JSON matching this schema:
{
  "issue": string,              // What likely failed and why
  "rootCause": string,          // The underlying cause
  "fix": string,                // Specific fix steps (selectors, waits, config)
  "nextSteps": string,          // What to try next if fix fails
  "confidence": number,         // 0-100
  "failingStep": string|null,   // Optional step/selector if evident
  "selectorHints": string|null  // Better selector strategies if relevant
}`;

    try {
      const response = await openRouter.generateTestScript(analysisPrompt);
      if (response) {
        // Try to parse JSON from response (support fenced code blocks or raw JSON)
        const codeBlockMatch = response.match(/```json[\s\S]*?```/i);
        const jsonText = codeBlockMatch ? codeBlockMatch[0].replace(/```json|```/gi, '') : response;
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const issue = parsed.issue || parsed.summary;
          const fix = parsed.fix || parsed.suggestions || parsed.nextSteps;
          if (issue || fix) {
            return {
              summary: issue || 'Test failed - see analysis below',
              suggestions: fix || 'Review logs, selectors, and waits suggested by the analysis'
            };
          }
        }
      }
    } catch (error) {
      console.warn('[TestReports] AI analysis parsing failed:', error);
    }

    // Fallback
    return {
      summary: 'Test failed - check error details below',
      suggestions: 'Review the error messages, screenshots, and browser logs for debugging information'
    };
  }
}

// Export singleton instance
export const testReportsService = new TestReportsService();