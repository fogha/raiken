import { OpenRouterService } from './openrouter.service';
import { TestResult } from './test-executor';
import fs from 'fs';
import path from 'path';

/**
 * Structure for a test report
 */
export interface TestReport {
  id: string;
  timestamp: string;
  testScript: string;
  results: TestResult[];
  summary?: string;
  status: 'success' | 'failure' | 'partial';
  durationMs: number;
  metadata?: Record<string, any>;
}

/**
 * Service to manage test reports
 */
export class ReportsService {
  private reportsDir: string;
  private openRouter: OpenRouterService;
  
  constructor(config: { apiKey: string; model?: string; reportsDir?: string }) {
    // Use the test-result folder in the project root
    this.reportsDir = config.reportsDir || path.resolve(process.cwd(), 'test-result');
    this.openRouter = new OpenRouterService({
      apiKey: config.apiKey,
      model: config.model || 'anthropic/claude-3-sonnet'
    });
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
    console.log(`[Arten] Reports will be saved to: ${this.reportsDir}`);
  }
  
  /**
   * Save a test report
   */
  async saveReport(report: Omit<TestReport, 'id' | 'summary'>): Promise<TestReport> {
    // Generate a unique ID for the report
    const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Determine overall status
    const status = this.determineStatus(report.results);
    
    // Generate a summary using OpenRouter
    const summary = await this.generateSummary(report.testScript, report.results);
    
    // Create the complete report
    const completeReport: TestReport = {
      ...report,
      id,
      status,
      summary
    };
    
    // Save to file
    const filePath = path.join(this.reportsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(completeReport, null, 2));
    
    return completeReport;
  }
  
  /**
   * Get all test reports
   */
  getReports(): TestReport[] {
    try {
      // Read all report files from the directory
      const files = fs.readdirSync(this.reportsDir)
        .filter(file => file.endsWith('.json'));
      
      // Parse each file and return as TestReport objects
      return files.map(file => {
        const filePath = path.join(this.reportsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content) as TestReport;
      }).sort((a, b) => {
        // Sort by timestamp, newest first
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    } catch (error) {
      console.error('Error reading test reports:', error);
      return [];
    }
  }
  
  /**
   * Get a specific test report by ID
   */
  getReportById(id: string): TestReport | null {
    try {
      const filePath = path.join(this.reportsDir, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as TestReport;
    } catch (error) {
      console.error(`Error reading test report ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Delete a test report by ID
   */
  deleteReport(id: string): boolean {
    try {
      const filePath = path.join(this.reportsDir, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting test report ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Determine the overall status of the test based on results
   */
  private determineStatus(results: TestResult[]): 'success' | 'failure' | 'partial' {
    if (results.length === 0) {
      return 'failure';
    }
    
    const allSuccess = results.every(result => result.success);
    const allFailure = results.every(result => !result.success);
    
    if (allSuccess) return 'success';
    if (allFailure) return 'failure';
    return 'partial';
  }
  
  /**
   * Generate a summary of the test results using OpenRouter
   */
  private async generateSummary(testScript: string, results: TestResult[]): Promise<string> {
    try {
      // Create a prompt for the AI to generate a summary
      const prompt = {
        testScript,
        results: results.map(r => ({
          success: r.success,
          message: r.message,
          durationMs: r.durationMs,
          timestamp: r.timestamp
        }))
      };
      
      // Generate the summary
      const contextPrompt = `You are an expert test analyst. Please provide a concise summary of the test execution results below. Focus on what worked, what failed, and potential reasons for failures. Keep your response under 200 words and format it in a way that's easy to read.\n\nTEST SCRIPT:\n${testScript.substring(0, 500)}...\n\nTEST RESULTS:\n${JSON.stringify(prompt.results, null, 2)}\n\nPlease provide your analysis:`;
      
      const summaryResponse = await this.openRouter.generateTestScript(contextPrompt);
      return summaryResponse || 'No summary available';
    } catch (error) {
      console.error('Error generating test summary:', error);
      return 'Failed to generate summary. Please review the detailed results.';
    }
  }
}
