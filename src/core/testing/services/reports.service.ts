import { OpenRouterService } from './openrouter.service';
import { TestResult, DetailedError } from '@/types/test';
import fs from 'fs';
import path from 'path';

/**
 * Structure for a test report
 */
export interface TestReport {
  id: string;
  timestamp: string;
  testPath: string;
  testScript: string;
  rawPlaywrightOutput: string;
  rawPlaywrightError: string;
  exitCode: number;
  summary?: string;
  suggestions?: string;
  status: 'success' | 'failure' | 'partial';
  durationMs: number;
  metadata?: Record<string, any>;
}

/**
 * Service to manage test reports - focuses on saving reports with AI analysis
 * Reading and deleting reports is handled by the /api/test-reports API route
 */
export class ReportsService {
  private reportsDir: string;
  private openRouter: OpenRouterService;
  
  constructor(config: { apiKey: string; model?: string; reportsDir?: string }) {
    // Use the test-result folder in the project root
    this.reportsDir = config.reportsDir || path.resolve(process.cwd(), 'test-results');
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
   * Save a test report with AI-generated summary and suggestions
   */
  async saveReport(report: Omit<TestReport, 'id' | 'summary'>): Promise<TestReport> {
    // Generate a unique ID for the report
    const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Generate summary and suggestions using OpenRouter
    const { summary, suggestions } = await this.generateSummary(
      report.testScript, 
      report.rawPlaywrightOutput, 
      report.rawPlaywrightError, 
      report.exitCode
    );
    
    // Create the complete report
    const completeReport: TestReport = {
      ...report,
      id,
      summary,
      suggestions
    };
    
    // Save to file
    const filePath = path.join(this.reportsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(completeReport, null, 2));
    
    return completeReport;
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
  
  private async generateSummary(
    testScript: string, 
    rawPlaywrightOutput: string, 
    rawPlaywrightError: string, 
    exitCode: number
  ): Promise<{ summary: string; suggestions: string }> {
    // Send RAW Playwright output directly to AI - no parsing or processing
    const success = exitCode === 0;
    
    const scriptPreview = testScript.length > 6000 ? `${testScript.slice(0, 6000)}\n... [truncated]` : testScript;
    
    const analysisPrompt = `You are an expert Playwright test analyst.

GOAL: Analyze the RAW Playwright execution output and explain what happened. If the test failed, identify the root cause and propose concrete fixes.

RESPONSE FORMAT (return ONLY valid JSON):
{
  "summary": "A detailed explanation of what happened and why",
  "suggestions": "Specific, actionable recommendations to fix or improve the test"
}

TEST SCRIPT:
\`\`\`typescript
${scriptPreview}
\`\`\`

PLAYWRIGHT EXECUTION DETAILS:
- Exit Code: ${exitCode}
- Test Status: ${success ? 'PASSED' : 'FAILED'}

RAW PLAYWRIGHT STDOUT:
\`\`\`
${rawPlaywrightOutput}
\`\`\`

RAW PLAYWRIGHT STDERR:
\`\`\`
${rawPlaywrightError}
\`\`\`

Analyze the raw output above and provide insights based on the actual Playwright execution.`;

    try {
      const response = await this.openRouter.generateTestScript(analysisPrompt);
      if (response) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.summary && parsed.suggestions) {
            return {
              summary: parsed.summary,
              suggestions: parsed.suggestions
            };
          }
        }
      }
    } catch (err) {
      console.warn('[ReportsService] AI analysis failed or returned invalid JSON, falling back:', err);
    }

    // Fallback (no AI or parse failure)
    if (success) {
      return {
        summary: `✅ Test passed successfully!`,
        suggestions: ''
      };
    }
    return {
      summary: `❌ Test failed (exit code ${exitCode}). Check raw output for details.`,
      suggestions: 'Review the raw Playwright output above for specific error messages and stack traces.'
    };
  }
}
