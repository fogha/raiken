import { DOMNode } from '@/types/dom';
import { TestGenerationPrompt, TestGenerationResult } from '@/types/test';
import { OpenRouterService } from './openrouter.service';
import { ReportsService, TestReport } from './reports.service';
import fs from 'fs';
import path from 'path';

interface TestConfig {
  apiKey: string;
  model?: string;
  outputDir?: string;
  timeout?: number;
}

export interface TestResult {
  success: boolean;
  message: string;
  durationMs?: number;
  timestamp: string;
  error?: string;
  script?: string;
}

export class TestExecutor {
  private config: TestConfig;
  private openRouter: OpenRouterService;
  private reportsService: ReportsService;
  
  constructor(config: TestConfig) {
    this.config = {
      model: 'anthropic/claude-3-sonnet',
      outputDir: path.resolve(process.cwd(), 'test-result'),
      timeout: 30000, // 30 seconds default timeout
      ...config
    };
    this.openRouter = new OpenRouterService({
      apiKey: this.config.apiKey,
      model: this.config.model
    });
    
    // Initialize the reports service
    this.reportsService = new ReportsService({
      apiKey: this.config.apiKey,
      model: this.config.model,
      reportsDir: this.config.outputDir
    });
  }
  
  /**
   * Convert a DOM node to a CSS selector
   */
  generateSelector(node: DOMNode): string {
    // Use ID if available (most reliable)
    if (node.id) {
      return `#${node.id}`;
    }
    
    // Use tag name and classes
    let selector = node.tagName || 'div';
    if (node.className) {
      // Convert className string to array of class names and escape any special characters
      const classes = node.className.split(' ')
        .filter(c => c.trim())
        .map(c => `.${CSS.escape(c.trim())}`);
      selector += classes.join('');
    }
    
    return selector;
  }
  
  /**
   * Build a map of selectors from a DOM node and its children
   */
  buildSelectorMap(node: DOMNode | null, prefix = ''): Record<string, string> {
    if (!node) return {};
    
    const selectors: Record<string, string> = {};
    const nodeName = prefix || `${node.tagName}${node.id ? `#${node.id}` : ''}`;
    selectors[nodeName] = this.generateSelector(node);
    
    // Process children recursively
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, index) => {
        const childPrefix = `${prefix ? `${prefix}_` : ''}${child.tagName}${child.id ? `_${child.id}` : ''}_${index}`;
        const childSelectors = this.buildSelectorMap(child, childPrefix);
        Object.assign(selectors, childSelectors);
      });
    }
    
    return selectors;
  }
  
  /**
   * Generate a test script using the OpenRouter API
   */
  async generateScript(prompt: TestGenerationPrompt) {
    // Generate the script using OpenRouter
    return this.openRouter.generateTestScript(prompt);
  }
  
  /**
   * Get all test reports
   */
  getTestReports(): TestReport[] {
    return this.reportsService.getReports();
  }
  
  /**
   * Get a specific test report by ID
   */
  getTestReportById(id: string): TestReport | null {
    return this.reportsService.getReportById(id);
  }
  
  /**
   * Delete a test report by ID
   */
  deleteTestReport(id: string): boolean {
    return this.reportsService.deleteReport(id);
  }
  
  /**
   * Save test script and results to file
   */
  async saveResults(testScript: string, results: TestResult[]): Promise<string> {
    try {
      // Ensure output directory exists
      const outputDir = this.config.outputDir || path.resolve(process.cwd(), 'test-result');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      console.log(`[Arten] Saving test results to: ${outputDir}`);
      
      // Create timestamp
      const timestamp = new Date().toISOString();
      const formattedTimestamp = timestamp.replace(/[:.]/g, '-');
      const filename = `test-${formattedTimestamp}.json`;
      const filePath = path.join(outputDir, filename);
      
      // Calculate total duration
      const totalDuration = results.reduce((sum, result) => sum + (result.durationMs || 0), 0);
      
      // Save test report using the ReportsService
      await this.reportsService.saveReport({
        timestamp,
        testScript,
        results,
        durationMs: totalDuration,
        status: results.every(r => r.success) ? 'success' : 'failure'
      });
      
      // Also save the legacy format for backward compatibility
      const testData = {
        script: testScript,
        results,
        timestamp,
        config: {
          timeout: this.config.timeout
        }
      };
      
      fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));
      return filePath;
    } catch (error) {
      console.error('Error saving test results:', error);
      throw new Error(`Failed to save test results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Execute the test script with Playwright
   */
  async runTest(testScript: string): Promise<{ results: TestResult[], error?: Error }> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    // Create temporary test file
    const tempFilePath = path.join(this.config.outputDir || path.resolve(process.cwd(), 'test-result'), `temp-test-${Date.now()}.js`);
    
    try {
      // Ensure the output directory exists
      if (!fs.existsSync(this.config.outputDir || path.resolve(process.cwd(), 'test-result'))) {
        fs.mkdirSync(this.config.outputDir || path.resolve(process.cwd(), 'test-result'), { recursive: true });
      }
      
      // Write test script to temporary file
      fs.writeFileSync(tempFilePath, testScript);
      console.log(`Test script written to ${tempFilePath}`);
      
      // Execute test using Node's child_process module
      const { execSync } = require('child_process');
      
      try {
        // Create a command to run the test with Playwright's CLI
        // --timeout option adds a timeout in milliseconds
        const command = `npx playwright test ${tempFilePath} --timeout=${this.config.timeout}`;
        
        console.log(`Executing command: ${command}`);
        const output = execSync(command, { encoding: 'utf8' });
        
        // Create successful result
        const result: TestResult = {
          success: true,
          message: 'Test executed successfully',
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          script: testScript
        };
        
        results.push(result);
        console.log('Test execution output:', output);
      } catch (execError) {
        // If the test execution itself fails
        // Type check and convert the unknown error to string
        const errorOutput = execError instanceof Error ? execError.message : String(execError);
        console.error('Test script execution failed:', errorOutput);
        
        results.push({
          success: false,
          message: `Test execution failed: ${errorOutput}`,
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          script: testScript
        });
      }
      
      // Save results to file regardless of success/failure
      const filePath = await this.saveResults(testScript, results);
      console.log(`Test results saved to ${filePath}`);
      
      return { results };
    } catch (error) {
      console.error('Error in test runner:', error);
      
      // Add error result for runner errors
      results.push({
        success: false,
        message: `Test runner error: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        script: testScript
      });
      
      return { 
        results,
        error: error instanceof Error ? error : new Error(String(error))
      };
    } finally {
      // Clean up temporary test file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`Temporary test file removed: ${tempFilePath}`);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary test file:', cleanupError);
      }
    }
  }
}
