// child_process.spawn is imported dynamically inside executeTest
import fs from 'fs/promises';
import path from 'path';
import { createPlaywrightConfig, cleanupConfig, validateConfig } from '@/utils/playwright-config';
import { testReportsService } from './reports.service';

interface TestSuiteConfig {
  id: string;
  name: string;
  browserType: string;
  retries: number;
  timeout: number;
  maxFailures: number;
  features: {
    screenshots: boolean;
    video: boolean;
    tracing: boolean;
  };
  headless: boolean;
  configPath?: string; // Cached config file path
  createdAt: Date;
  lastUsed: Date;
}

interface TestExecution {
  testPath: string;
  suiteId: string;
  priority?: 'high' | 'medium' | 'low';
}

interface TestExecutionResult {
  success: boolean;
  results: any;
  duration: number;
  resultFile: string;
  summary?: string;
  error?: string;
  needsAIAnalysis: boolean; // Only true for failed tests
  suggestions?: string; // Added for AI analysis suggestions
  reportId?: string; // Added for AI analysis report ID
  // Enhanced debugging information
  detailedErrors?: Array<{
    message: string;
    stack?: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
    testName?: string;
    step?: string;
  }>;
  screenshots?: Array<{
    name: string;
    path: string;
    timestamp: string;
  }>;
  videos?: Array<{
    name: string;
    path: string;
    timestamp: string;
  }>;
  browserLogs?: Array<{
    level: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    timestamp: string;
  }>;
  networkLogs?: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
  }>;
  testPath?: string;
  exitCode?: number;
}

export class TestSuiteManager {
  private testSuites = new Map<string, TestSuiteConfig>();
  private configCleanupTimeout = 30 * 60 * 1000; // 30 minutes
  private reportsService = testReportsService;

  /**
   * Parse Playwright error output to extract structured debugging information
   */
  private parsePlaywrightErrors(stdout: string, stderr: string): Array<{
    message: string;
    stack?: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
    testName?: string;
    step?: string;
  }> {
    const errors: Array<{
      message: string;
      stack?: string;
      location?: { file: string; line: number; column: number };
      testName?: string;
      step?: string;
    }> = [];

    const combinedOutput = `${stdout}\n${stderr}`;
    
    // Enhanced Playwright error patterns
    const errorPatterns = [
      // Standard test failure format
      {
        regex: /(\d+)\)\s+(.+?)\s+›\s+(.+?)\n([\s\S]*?)(?=\n\s*\d+\)|$)/g,
        extract: (match: RegExpExecArray) => {
          const [, testNumber, testFile, testName, errorDetails] = match;
          const errorMessageMatch = errorDetails.match(/Error:\s*(.+?)(?:\n|$)/);
          const errorMessage = errorMessageMatch ? errorMessageMatch[1].trim() : 'Test failed';
          
          const locationMatch = errorDetails.match(/at\s+.*?([^/\s]+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)/);
          let location;
          if (locationMatch) {
            location = {
              file: locationMatch[1],
              line: parseInt(locationMatch[2]),
              column: parseInt(locationMatch[3])
            };
          }
          
          const stepMatch = errorDetails.match(/(\d+\s+\|\s+.*?)(?:\n|$)/);
          const step = stepMatch ? stepMatch[1].trim() : undefined;
          
          return {
            message: errorMessage,
            stack: errorDetails.trim(),
            location,
            testName: testName.trim(),
            step
          };
        }
      },
      
      // Timeout errors
      {
        regex: /TimeoutError:\s*(.+?)(?:\n|$)/g,
        extract: (match: RegExpExecArray) => ({
          message: `Timeout: ${match[1].trim()}`,
          stack: match[0]
        })
      },
      
      // Selector errors
      {
        regex: /Error:\s*(?:waiting for|locator\.|page\.).*?(?:selector|element).*?(?:\n|$)/gi,
        extract: (match: RegExpExecArray) => ({
          message: match[0].replace(/^Error:\s*/, '').trim(),
          stack: match[0]
        })
      },
      
      // Navigation errors
      {
        regex: /Error:\s*(?:page\.goto|navigation|net::ERR_).*?(?:\n|$)/gi,
        extract: (match: RegExpExecArray) => ({
          message: match[0].replace(/^Error:\s*/, '').trim(),
          stack: match[0]
        })
      },
      
      // Assertion errors
      {
        regex: /expect\(.*?\)\..*?(?:\n|$)/gi,
        extract: (match: RegExpExecArray) => ({
          message: `Assertion failed: ${match[0].trim()}`,
          stack: match[0]
        })
      },
      
      // JavaScript errors in browser
      {
        regex: /(?:TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+?)(?:\n|$)/g,
        extract: (match: RegExpExecArray) => ({
          message: match[0].trim(),
          stack: match[0]
        })
      }
    ];
    
    // Apply all error patterns
    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.regex.exec(combinedOutput)) !== null) {
        const error = pattern.extract(match);
        if (error && !errors.some(e => e.message === error.message)) {
          errors.push(error);
        }
      }
    }
    
    // If no structured errors found, try to extract general error information
    if (errors.length === 0) {
      const generalErrorMatch = combinedOutput.match(/Error:\s*(.+?)(?:\n|$)/);
      if (generalErrorMatch) {
        errors.push({
          message: generalErrorMatch[1].trim(),
          stack: combinedOutput.trim()
        });
      }
    }
    
    return errors;
  }

  /**
   * Collect screenshots generated during test execution
   */
  private async collectScreenshots(testPath: string): Promise<Array<{
    name: string;
    path: string;
    timestamp: string;
  }> | undefined> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Playwright typically saves screenshots in test-results directory
      const testResultsDir = path.resolve(process.cwd(), 'test-results');
      
      try {
        const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
        const screenshots: Array<{ name: string; path: string; timestamp: string }> = [];
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const testDir = path.join(testResultsDir, entry.name);
            try {
              const files = await fs.readdir(testDir);
              const screenshotFiles = files.filter(file => 
                file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
              );
              
              for (const file of screenshotFiles) {
                const filePath = path.join(testDir, file);
                const stats = await fs.stat(filePath);
                screenshots.push({
                  name: file,
                  path: filePath,
                  timestamp: stats.mtime.toISOString()
                });
              }
            } catch (dirError) {
              // Skip directories we can't read
              continue;
            }
          }
        }
        
        return screenshots.length > 0 ? screenshots : undefined;
      } catch (dirError) {
        return undefined;
      }
    } catch (error) {
      console.warn('[TestSuite] Failed to collect screenshots:', error);
      return undefined;
    }
  }

  /**
   * Collect videos generated during test execution
   */
  private async collectVideos(testPath: string): Promise<Array<{
    name: string;
    path: string;
    timestamp: string;
  }> | undefined> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Playwright typically saves videos in test-results directory
      const testResultsDir = path.resolve(process.cwd(), 'test-results');
      
      try {
        const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
        const videos: Array<{ name: string; path: string; timestamp: string }> = [];
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const testDir = path.join(testResultsDir, entry.name);
            try {
              const files = await fs.readdir(testDir);
              const videoFiles = files.filter(file => 
                file.endsWith('.webm') || file.endsWith('.mp4')
              );
              
              for (const file of videoFiles) {
                const filePath = path.join(testDir, file);
                const stats = await fs.stat(filePath);
                videos.push({
                  name: file,
                  path: filePath,
                  timestamp: stats.mtime.toISOString()
                });
              }
            } catch (dirError) {
              // Skip directories we can't read
              continue;
            }
          }
        }
        
        return videos.length > 0 ? videos : undefined;
      } catch (dirError) {
        return undefined;
      }
    } catch (error) {
      console.warn('[TestSuite] Failed to collect videos:', error);
      return undefined;
    }
  }

  /**
   * Extract browser console logs from Playwright output
   */
  private extractBrowserLogs(stdout: string, stderr: string): Array<{
    level: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    timestamp: string;
  }> | undefined {
    const logs: Array<{
      level: 'error' | 'warning' | 'info' | 'debug';
      message: string;
      timestamp: string;
    }> = [];
    
    const combinedOutput = `${stdout}\n${stderr}`;
    
    // Enhanced console log patterns
    const consolePatterns = [
      // Standard console methods
      { regex: /console\.(log|error|warn|info|debug)\s+(.+)/g, type: 'console' },
      
      // Browser errors
      { regex: /Uncaught\s+(TypeError|ReferenceError|SyntaxError|Error):\s*(.+)/g, type: 'error' },
      
      // Page errors
      { regex: /page\.on\('pageerror'\)\s*(.+)/g, type: 'error' },
      
      // Network errors in console
      { regex: /Failed to load resource:\s*(.+)/g, type: 'error' },
      
      // Promise rejections
      { regex: /Uncaught \(in promise\)\s*(.+)/g, type: 'error' },
      
      // CORS errors
      { regex: /Access to .+ from origin .+ has been blocked by CORS policy:\s*(.+)/g, type: 'error' },
      
      // 404 and other HTTP errors
      { regex: /GET .+ (404|500|403|401) \(.+\)/g, type: 'error' },
      
      // JavaScript runtime errors
      { regex: /(TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+?)(?:\n|$)/g, type: 'error' }
    ];
    
    for (const pattern of consolePatterns) {
      let match;
      while ((match = pattern.regex.exec(combinedOutput)) !== null) {
        if (pattern.type === 'console') {
          const [, level, message] = match;
          logs.push({
            level: level === 'warn' ? 'warning' : (level as 'error' | 'info' | 'debug'),
            message: message.trim(),
            timestamp: new Date().toISOString()
          });
        } else {
          logs.push({
            level: pattern.type as 'error',
            message: match[0].trim(),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return logs.length > 0 ? logs : undefined;
  }

  /**
   * Extract network request logs from Playwright output
   */
  private extractNetworkLogs(stdout: string, stderr: string): Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
  }> | undefined {
    const logs: Array<{
      url: string;
      method: string;
      status: number;
      timestamp: string;
    }> = [];
    
    const combinedOutput = `${stdout}\n${stderr}`;
    
    // Enhanced network request patterns
    const networkPatterns = [
      // Standard HTTP requests with status codes
      { regex: /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(https?:\/\/[^\s]+)\s+(\d{3})/g, type: 'request' },
      
      // Failed requests with error codes
      { regex: /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(https?:\/\/[^\s]+)\s+net::ERR_(\w+)/g, type: 'error' },
      
      // Timeout requests
      { regex: /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(https?:\/\/[^\s]+)\s+timeout/gi, type: 'timeout' },
      
      // CORS blocked requests
      { regex: /Access to fetch at '(https?:\/\/[^']+)' from origin .+ has been blocked by CORS/g, type: 'cors' },
      
      // 404 and other HTTP error responses
      { regex: /Failed to load resource: the server responded with a status of (\d{3}) .+ (https?:\/\/[^\s]+)/g, type: 'http_error' },
      
      // Network errors
      { regex: /Failed to load resource:\s*(.+)/g, type: 'network_error' },
      
      // Request failed patterns
      { regex: /Request failed|NetworkError|net::ERR_/g, type: 'general_error' }
    ];
    
    for (const pattern of networkPatterns) {
      let match;
      while ((match = pattern.regex.exec(combinedOutput)) !== null) {
        switch (pattern.type) {
          case 'request':
            const [, method, url, status] = match;
            logs.push({
              method,
              url,
              status: parseInt(status),
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'error':
            const [, errorMethod, errorUrl, errorCode] = match;
            logs.push({
              method: errorMethod,
              url: errorUrl,
              status: 0,
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'timeout':
            const [, timeoutMethod, timeoutUrl] = match;
            logs.push({
              method: timeoutMethod,
              url: timeoutUrl,
              status: 408, // Request Timeout
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'cors':
            const [, corsUrl] = match;
            logs.push({
              method: 'UNKNOWN',
              url: corsUrl,
              status: 0, // CORS blocked
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'http_error':
            const [, httpStatus, httpUrl] = match;
            logs.push({
              method: 'UNKNOWN',
              url: httpUrl,
              status: parseInt(httpStatus),
              timestamp: new Date().toISOString()
            });
            break;
            
          default:
            logs.push({
              method: 'UNKNOWN',
              url: 'Network error detected',
              status: 0,
              timestamp: new Date().toISOString()
            });
        }
      }
    }
    
    return logs.length > 0 ? logs : undefined;
  }

  constructor(config: { apiKey: string; reportsDir: string }) {
    // Clean up unused configs periodically
    setInterval(() => {
      this.cleanupUnusedConfigs();
    }, this.configCleanupTimeout);
  }

  /**
   * Create or get a test suite with specific configuration
   */
  async createTestSuite(config: {
    name: string;
    browserType: string;
    retries: number;
    timeout: number;
    maxFailures?: number;
    features: {
      screenshots: boolean;
      video: boolean;
      tracing: boolean;
    };
    headless: boolean;
  }): Promise<TestSuiteConfig> {
    // Generate a unique ID based on config
    const configHash = this.generateConfigHash(config);
    
    // Check if suite already exists
    if (this.testSuites.has(configHash)) {
      const existingSuite = this.testSuites.get(configHash)!;
      existingSuite.lastUsed = new Date();
      return existingSuite;
    }

    // Create new test suite
    const suite: TestSuiteConfig = {
      id: configHash,
      name: config.name,
      browserType: config.browserType,
      retries: config.retries,
      timeout: config.timeout,
      maxFailures: config.maxFailures || 1,
      features: config.features,
      headless: config.headless,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    // Generate and cache the Playwright config
    suite.configPath = await createPlaywrightConfig(
      config.features,
      config.browserType,
      config.timeout
    );
    
    // Validate the generated config
    const isValidConfig = await validateConfig(suite.configPath);
    if (!isValidConfig) {
      await cleanupConfig(suite.configPath);
      throw new Error(`Generated Playwright config is invalid for suite: ${config.name}`);
    }

    this.testSuites.set(configHash, suite);
    
    console.log(`[TestSuite] Created new test suite: ${suite.name} (${suite.id})`);
    return suite;
  }

  /**
   * Execute a test using an existing test suite
   */
  async executeTest(execution: TestExecution): Promise<TestExecutionResult> {
    const suite = this.testSuites.get(execution.suiteId);
    if (!suite) {
      throw new Error(`Test suite not found: ${execution.suiteId}`);
    }

    // Update last used timestamp
    suite.lastUsed = new Date();

    const startTime = Date.now();
    
    try {
      // Validate test file exists
      await fs.access(path.resolve(process.cwd(), execution.testPath));
      
      // Validate config file exists and is readable
      if (!suite.configPath) {
        throw new Error(`No config path set for suite: ${suite.id}`);
      }
      
      try {
        await fs.access(suite.configPath);
        const stats = await fs.stat(suite.configPath);
        if (stats.size === 0) {
          throw new Error(`Config file is empty: ${suite.configPath}`);
        }
      } catch (error) {
        console.error(`[TestSuite] Config file validation failed:`, error);
        throw new Error(`Config file not accessible: ${suite.configPath}`);
      }

      // Create results directory
      const resultsDir = path.join(process.cwd(), 'test-results');
      await fs.mkdir(resultsDir, { recursive: true });

      // Generate result filename (for return value only, not saved)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const testName = path.basename(execution.testPath, '.spec.ts');
      const resultFileName = `${testName}-${timestamp}.json`;

      // Build command using the suite's cached config
      // Ensure we use the correct test file path
      const testFilePath = path.isAbsolute(execution.testPath) 
        ? execution.testPath 
        : path.resolve(process.cwd(), execution.testPath);
      const relativePath = path.relative(process.cwd(), testFilePath);
      // suite.configPath is already an absolute path from createPlaywrightConfig
      const configPath = suite.configPath!;
      

      // --- STREAMING EXECUTION ---------------------------------------------------
      // Build args array manually to avoid shell parsing issues with quotes
      const args = [
        'playwright', 'test',
        relativePath,
        `--config=${configPath}`,
        '--reporter=json',
        `--project=${suite.browserType}`
      ];
      
      // Add suite-specific options to args
      if (suite.retries > 0) {
        args.push(`--retries=${suite.retries}`);
      }
      
      // Enhanced debugging options
      args.push(`--max-failures=${suite.maxFailures}`); // User-configurable max failures
      
      // Note: Output directory is configured in the Playwright config file
            
      if (!suite.headless) {
        args.push('--headed');
      }
      
      console.log(`[TestSuite] Executing test: ${execution.testPath}`);
      
      const child = require('child_process').spawn('npx', args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...(suite.headless ? { CI: 'true' } : {}),
          // Ensure NODE_ENV is set for better error reporting
          NODE_ENV: process.env.NODE_ENV || 'development'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Handle spawn errors
      child.on('error', (spawnError: Error) => {
        console.error(`[TestSuite] Failed to spawn Playwright process:`, spawnError);
        throw new Error(`Failed to start Playwright: ${spawnError.message}`);
      });

      let stdoutBuf = '';
      let stderrBuf = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString();
        // Stream errors to console in real-time for quicker feedback
        if (process.env.NODE_ENV !== 'test') {
          process.stderr.write(chunk.toString());
        }
      });

      const exitCode: number = await new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', resolve);
      });

      const duration = Date.now() - startTime;

      const stdout = stdoutBuf;
      const stderr = stderrBuf;

      console.log(`[TestSuite] Test completed with exit code: ${exitCode}`);
      
      // Simple success determination - if exit code is 0, test passed
      const success = exitCode === 0;
       
      // Read test script
      const testScript = await fs.readFile(path.resolve(process.cwd(), execution.testPath), 'utf8');

      // Generate AI analysis and save report (for both passed and failed tests)
      let summary: string | undefined;
      let suggestions: string | undefined;
      let reportId: string | undefined;
      
      // Save report using simplified service
      try {
        const savedReport = await testReportsService.saveReport({
          testName: path.basename(execution.testPath, '.spec.ts'),
          testPath: execution.testPath,
          exitCode: exitCode,
          duration: duration,
          rawOutput: stdout,
          rawError: stderr,
          summary: success ? 'Test passed successfully' : 'Test failed - check details below',
          suggestions: success ? undefined : 'Review the error details and screenshots for debugging information'
        });
        
        summary = savedReport.summary;
        suggestions = savedReport.suggestions;
        reportId = savedReport.id;
        console.log(`[TestSuite] Report saved: ${reportId}`);
      } catch (reportError) {
        console.error('[TestSuite] Failed to save report:', reportError);
        summary = success ? 'Test passed successfully' : 'Test failed - report save failed';
      }

      // Parse detailed error information
      const detailedErrors = !success ? this.parsePlaywrightErrors(stdout, stderr) : undefined;

      return {
        success,
        results: { success, rawOutput: stdout, rawError: stderr },
        duration,
        resultFile: resultFileName, // Reference for UI, but actual file is saved by ReportsService
        summary,
        suggestions,
        reportId,
        needsAIAnalysis: !success,
        // Enhanced debugging information
        detailedErrors,
        testPath: execution.testPath,
        exitCode
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Handle execution errors
      const isTestFailure = error.code === 1 && (error.stdout || error.stderr);
      
      if (isTestFailure) {
        // This is a test failure, not an execution error
        const stdout = error.stdout || '';
        const stderr = error.stderr || '';
        
        // Generate AI analysis for failed test
        let summary: string | undefined;
        let suggestions: string | undefined;
        let reportId: string | undefined;
        
        if (process.env.OPENROUTER_API_KEY) {
          try {
            const testScript = await fs.readFile(path.resolve(process.cwd(), execution.testPath), 'utf8');
            
            const savedReport = await this.reportsService.saveReport({
              testName: path.basename(execution.testPath, '.spec.ts'),
              testPath: execution.testPath,
              exitCode: error.code || 1,
              duration: duration,
              rawOutput: stdout,
              rawError: stderr,
              summary: 'Test execution failed',
              suggestions: 'Check the error output for debugging information'
            });
            
            summary = savedReport.summary;
            suggestions = savedReport.suggestions;
            reportId = savedReport.id;
          } catch (aiError) {
            console.error('[TestSuite] AI analysis failed for execution error:', aiError);
            summary = `Test execution failed: ${error.message}. Check test configuration and dependencies.`;
          }
        }
        
        return {
          success: false,
          results: { success: false, rawOutput: stdout, rawError: stderr },
          duration,
          resultFile: '',
          summary,
          suggestions,
          reportId,
          error: error.message,
          needsAIAnalysis: true
        };
      }
      
      // This is an actual execution error (not a test failure)
      throw error;
    }
  }

  /**
   * Get test suite by ID
   */
  getTestSuite(suiteId: string): TestSuiteConfig | undefined {
    return this.testSuites.get(suiteId);
  }

  /**
   * List all test suites
   */
  listTestSuites(): TestSuiteConfig[] {
    return Array.from(this.testSuites.values());
  }

  /**
   * Delete a test suite and cleanup its config
   */
  async deleteTestSuite(suiteId: string): Promise<boolean> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      return false;
    }

    // Cleanup config file
    if (suite.configPath) {
      try {
        await cleanupConfig(suite.configPath);
      } catch (error) {
        console.warn(`[TestSuite] Failed to cleanup config for suite ${suiteId}:`, error);
      }
    }

    this.testSuites.delete(suiteId);
    console.log(`[TestSuite] Deleted test suite: ${suite.name} (${suiteId})`);
    return true;
  }



  /**
   * Generate a unique hash for test suite configuration
   */
  private generateConfigHash(config: any): string {
    const configString = JSON.stringify({
      browserType: config.browserType,
      retries: config.retries,
      timeout: config.timeout,
      features: config.features,
      headless: config.headless
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `suite-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Clean up unused test suite configs
   */
  private async cleanupUnusedConfigs(): Promise<void> {
    const cutoffTime = Date.now() - this.configCleanupTimeout;
    const suitesToDelete: string[] = [];
    
    this.testSuites.forEach((suite, suiteId) => {
      if (suite.lastUsed.getTime() < cutoffTime) {
        suitesToDelete.push(suiteId);
      }
    });
    
    for (const suiteId of suitesToDelete) {
      await this.deleteTestSuite(suiteId);
    }
    
    if (suitesToDelete.length > 0) {
      console.log(`[TestSuite] Cleaned up ${suitesToDelete.length} unused test suites`);
    }
  }

  /**
   * Get statistics about test suites
   */
  getStatistics(): {
    totalSuites: number;
    activeSuites: number;
    configsByBrowser: Record<string, number>;
    oldestSuite: Date | null;
    newestSuite: Date | null;
  } {
    const suites = Array.from(this.testSuites.values());
    const recentCutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    const configsByBrowser: Record<string, number> = {};
    let oldestSuite: Date | null = null;
    let newestSuite: Date | null = null;
    
    suites.forEach(suite => {
      // Count by browser
      configsByBrowser[suite.browserType] = (configsByBrowser[suite.browserType] || 0) + 1;
      
      // Track oldest and newest
      if (!oldestSuite || suite.createdAt < oldestSuite) {
        oldestSuite = suite.createdAt;
      }
      if (!newestSuite || suite.createdAt > newestSuite) {
        newestSuite = suite.createdAt;
      }
    });
    
    return {
      totalSuites: suites.length,
      activeSuites: suites.filter(s => s.lastUsed.getTime() > recentCutoff).length,
      configsByBrowser,
      oldestSuite,
      newestSuite
    };
  }


  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('[TestSuite] Cleaning up all test suites...');
    
    const suiteIds = Array.from(this.testSuites.keys());
    for (const suiteId of suiteIds) {
      await this.deleteTestSuite(suiteId);
    }
    
    console.log(`[TestSuite] Cleaned up ${suiteIds.length} test suites`);
  }
} 