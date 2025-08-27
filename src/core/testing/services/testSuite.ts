// child_process.spawn is imported dynamically inside executeTest
import fs from 'fs/promises';
import path from 'path';
import { createPlaywrightConfig, cleanupConfig } from '@/app/api/execute-test/create-config';
import { ReportsService } from './reports.service';
import { TestResult, DetailedError } from '@/types/test';

interface TestSuiteConfig {
  id: string;
  name: string;
  browserType: string;
  retries: number;
  timeout: number;
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
}

export class TestSuiteManager {
  private reportsService: ReportsService;
  private testSuites = new Map<string, TestSuiteConfig>();
  private configCleanupTimeout = 30 * 60 * 1000; // 30 minutes

  constructor(config: { apiKey: string; reportsDir: string }) {
    this.reportsService = new ReportsService(config);
    
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
      
      // Validate config file exists
      if (!suite.configPath || !(await fs.access(suite.configPath).then(() => true).catch(() => false))) {
        throw new Error(`Config file not found: ${suite.configPath}`);
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
      
      console.log(`[TestSuite] Executing test with suite ${suite.name}`);
      console.log(`[TestSuite] Test file path: ${testFilePath}`);
      console.log(`[TestSuite] Relative path: ${relativePath}`);
      console.log(`[TestSuite] Config path: ${configPath}`);

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
      
      if (suite.features.tracing) {
        args.push('--trace=on-first-retry');
      }
      
      if (!suite.headless) {
        args.push('--headed');
      }
      
      console.log(`[TestSuite] Args array:`, args);
      const child = require('child_process').spawn('npx', args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...(suite.headless ? { CI: 'true' } : {})
        },
        stdio: ['ignore', 'pipe', 'pipe']
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
          process.stderr.write(chunk);
        }
      });

      const exitCode: number = await new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', resolve);
      });

      const duration = Date.now() - startTime;

      const stdout = stdoutBuf;
      const stderr = stderrBuf;

      // Log only the essential information, not the full output
      console.log(`[TestSuite] Test completed with exit code: ${exitCode}`);
      
      // Simple success determination - if exit code is 0, test passed
      const success = exitCode === 0;
       
      // Read test script
      const testScript = await fs.readFile(path.resolve(process.cwd(), execution.testPath), 'utf8');

      // Generate AI analysis and save report (for both passed and failed tests)
      let summary: string | undefined;
      let suggestions: string | undefined;
      let reportId: string | undefined;
      
      if (process.env.OPENROUTER_API_KEY) {
        try {
          const savedReport = await this.reportsService.saveReport({
            timestamp: new Date().toISOString(),
            testPath: execution.testPath,
            testScript,
            // Send raw data directly to AI - no parsing layers
            rawPlaywrightOutput: stdout,
            rawPlaywrightError: stderr,
            exitCode: exitCode,
            durationMs: duration,
            status: success ? 'success' : 'failure'
          });
          
          summary = savedReport.summary;
          suggestions = savedReport.suggestions;
          reportId = savedReport.id;
          console.log(`[TestSuite] AI analysis completed and report saved: ${reportId}`);
        } catch (aiError) {
          console.error('[TestSuite] AI analysis failed:', aiError);
          summary = success ? 'Test passed successfully' : 'Test failed. AI analysis unavailable - check detailed results for error information.';
        }
      } else {
        summary = success ? 'Test passed successfully' : 'Test failed - no AI analysis available (API key not configured)';
      }

      return {
        success,
        results: { success, rawOutput: stdout, rawError: stderr },
        duration,
        resultFile: resultFileName, // Reference for UI, but actual file is saved by ReportsService
        summary,
        suggestions,
        reportId,
        needsAIAnalysis: !success
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
              timestamp: new Date().toISOString(),
              testPath: execution.testPath,
              testScript,
              rawPlaywrightOutput: stdout,
              rawPlaywrightError: stderr,
              exitCode: error.code || 1,
              durationMs: duration,
              status: 'failure'
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