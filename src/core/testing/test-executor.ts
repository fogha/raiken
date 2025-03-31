import { DOMNode } from '@/types/dom';
import { TestGenerationPrompt, TestGenerationResult } from '@/types/test';
import { OpenAIService } from './openai.service';
import fs from 'fs';
import path from 'path';

interface TestConfig {
  apiKey: string;
  outputDir?: string;
  timeout?: number;
}

interface TestResult {
  success: boolean;
  message: string;
  durationMs?: number;
  timestamp: string;
  script?: string;
}

export class TestExecutor {
  private config: TestConfig;
  private openai: OpenAIService;
  
  constructor(config: TestConfig) {
    this.config = {
      outputDir: './test-results',
      timeout: 30000, // 30 seconds default timeout
      ...config
    };
    this.openai = new OpenAIService(this.config.apiKey);
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
   * Generate a test script using the OpenAI API
   */
  async generateScript(prompt: TestGenerationPrompt) {
    // Generate the script using OpenAI
    return this.openai.generateTestScript(prompt);
  }
  
  /**
   * Save test script and results to file
   */
  async saveResults(testScript: string, results: TestResult[]): Promise<string> {
    try {
      // Ensure output directory exists
      const outputDir = this.config.outputDir || './test-results';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-${timestamp}.json`;
      const filePath = path.join(outputDir, filename);
      
      // Save test data
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
   * Execute the test script
   */
  async runTest(testScript: string): Promise<{ results: TestResult[], error?: Error }> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    try {
      // In a full implementation, this would execute the Playwright test
      // For now, we'll simulate test execution
      
      // Simulate test result
      const result: TestResult = {
        success: true,
        message: 'Test executed successfully',
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        script: testScript
      };
      
      results.push(result);
      
      // Save results to file
      const filePath = await this.saveResults(testScript, results);
      console.log(`Test results saved to ${filePath}`);
      
      return { results };
    } catch (error) {
      console.error('Error running test:', error);
      
      // Add error result
      results.push({
        success: false,
        message: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        script: testScript
      });
      
      return { 
        results,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
