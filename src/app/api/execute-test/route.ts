import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { createPlaywrightConfig, cleanupConfig } from './create-config';

const execAsync = promisify(exec);

interface TestResult {
  testPath: string;
  timestamp: string;
  success: boolean;
  results: any;
  duration: number;
  resultFile: string;
}

export async function POST(req: Request) {
  try {
    const { testPath, config = {} } = await req.json();
    
    // Extract browser and retry settings from config
    const browserType = config.browserType || 'chromium';
    const retries = config.retries !== undefined ? config.retries : 0;
    const timeout = config.timeout || 30000;
    const features = config.features || {};
    
    if (!testPath) {
      return NextResponse.json({ 
        error: 'Missing required parameter: testPath' 
      }, { status: 400 });
    }

    // Ensure test file exists and normalize path
    const fullTestPath = path.resolve(process.cwd(), testPath);
    if (!fs.existsSync(fullTestPath)) {
      return NextResponse.json({ 
        error: `Test file not found at: ${fullTestPath}` 
      }, { status: 404 });
    }

    // Create test-results directory if it doesn't exist
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Generate unique result filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testName = path.basename(testPath, '.spec.ts');
    const resultFile = path.join(resultsDir, `${testName}-${timestamp}.json`);

    console.log(`[Arten] Starting test execution for: ${testPath}`);
    console.log(`[Arten] Browser: ${browserType}, Retries: ${retries}, Timeout: ${timeout}`);
    
    let configPath: string | null = null;
    const startTime = Date.now();
    
    try {
      
      // Create temporary Playwright config with user settings
      configPath = createPlaywrightConfig(features, browserType, timeout);
      
      // Build the command to run the specific test
      const relativePath = path.relative(process.cwd(), fullTestPath);
      let command = `npx playwright test "${relativePath}" --config="${configPath}" --reporter=json --project=${browserType} --retries=${retries}`;
      
      // Add trace flag if enabled
      if (features.tracing) {
        command += ' --trace=on-first-retry';
      }
      
      console.log(`[Arten] Executing command: ${command}`);
      
      // Execute the test
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 120000, // 2 minute timeout
        env: {
          ...process.env,
          CI: 'true' // Force headless mode
        }
      });

      const duration = Date.now() - startTime;
      
      console.log(`[Arten] Test completed in ${duration}ms`);
      if (stderr) {
        console.log(`[Arten] Test stderr:`, stderr);
      }

      // Parse the results
      let testResults;
      let success = true;
      
      try {
        // Try to parse JSON output from Playwright
        if (stdout.trim()) {
          testResults = JSON.parse(stdout);
          success = testResults.stats?.failed === 0;
        } else {
          // Fallback if no JSON output
          testResults = {
            stats: { passed: 1, failed: 0, total: 1 },
            message: 'Test completed successfully',
            rawOutput: stdout
          };
        }
      } catch (parseError) {
        console.log(`[Arten] Failed to parse JSON output, creating fallback result`);
        success = !stderr;
        testResults = {
          stats: { passed: success ? 1 : 0, failed: success ? 0 : 1, total: 1 },
          message: success ? 'Test completed' : 'Test failed',
          rawOutput: stdout,
          error: stderr,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        };
      }

      // Create comprehensive result data
      const resultData: TestResult = {
        testPath,
        timestamp: new Date().toISOString(),
        success,
        results: testResults,
        duration,
        resultFile: path.basename(resultFile)
      };

      // Save results to file
      fs.writeFileSync(resultFile, JSON.stringify(resultData, null, 2));
      
      // Update the last run file
      const lastRunFile = path.join(resultsDir, '.last-run.json');
      const lastRunData = {
        status: success ? 'passed' : 'failed',
        failedTests: success ? [] : [testPath],
        timestamp: new Date().toISOString(),
        resultFile: path.basename(resultFile)
      };
      fs.writeFileSync(lastRunFile, JSON.stringify(lastRunData, null, 2));

      console.log(`[Arten] Test results saved to: ${resultFile}`);
      
      // Cleanup temporary config file  
      if (configPath) {
        cleanupConfig(configPath);
      }

      return NextResponse.json({
        success,
        results: testResults,
        resultFile: path.basename(resultFile),
        duration,
        message: 'Test executed successfully'
      });

    } catch (execError: any) {
      console.error('[Arten] Test execution failed:', execError);
      
      // Check if this is a test failure (exit code 1) or actual execution error
      const isTestFailure = execError.code === 1 && (execError.stdout || execError.stderr);
      const duration = Date.now() - startTime;
      
      let testResults;
      if (isTestFailure) {
        // This is a test failure, not an execution error
        // Try to parse any JSON output from the failed test
        try {
          if (execError.stdout && execError.stdout.trim()) {
            testResults = JSON.parse(execError.stdout);
          } else {
            testResults = {
              stats: { passed: 0, failed: 1, total: 1 },
              message: 'Test failed',
              rawOutput: execError.stdout,
              error: execError.stderr
            };
          }
        } catch (parseError) {
          testResults = {
            stats: { passed: 0, failed: 1, total: 1 },
            message: 'Test failed',
            rawOutput: execError.stdout,
            error: execError.stderr,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          };
        }
      } else {
        // This is an actual execution error
        testResults = {
          error: execError.message,
          code: execError.code,
          stdout: execError.stdout,
          stderr: execError.stderr,
          stats: { passed: 0, failed: 1, total: 1 }
        };
      }
      
      const errorResult: TestResult = {
        testPath,
        timestamp: new Date().toISOString(),
        success: false,
        results: testResults,
        duration,
        resultFile: path.basename(resultFile)
      };

      // Save error results
      fs.writeFileSync(resultFile, JSON.stringify(errorResult, null, 2));
      
      // Update last run file
      const lastRunFile = path.join(resultsDir, '.last-run.json');
      const lastRunData = {
        status: 'failed',
        failedTests: [testPath],
        timestamp: new Date().toISOString(),
        error: isTestFailure ? 'Test failed' : execError.message,
        resultFile: path.basename(resultFile)
      };
      fs.writeFileSync(lastRunFile, JSON.stringify(lastRunData, null, 2));
      
      // Cleanup temporary config file
      if (configPath) {
        cleanupConfig(configPath);
      }

      if (isTestFailure) {
        // Return 200 for test failures (successful execution, but test failed)
        return NextResponse.json({
          success: false,
          results: testResults,
          resultFile: path.basename(resultFile),
          duration,
          message: 'Test executed successfully but test failed'
        });
      } else {
        // Return 500 for actual execution errors
        return NextResponse.json({
          success: false,
          error: `Test execution failed: ${execError.message}`,
          results: errorResult.results,
          resultFile: path.basename(resultFile),
          stderr: execError.stderr,
          stdout: execError.stdout
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('[API] Test execution error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to execute test' 
    }, { status: 500 });
  }
} 