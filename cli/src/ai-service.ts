import fetch from 'node-fetch';

export interface AIAnalysisRequest {
  testName: string;
  testPath: string;
  rawOutput: string;
  rawError: string;
  playwrightResult: any;
  detailedErrors: any[];
  screenshots?: any[];
  videos?: any[];
}

export interface AIAnalysisResponse {
  summary: string;
  suggestions: string;
  rootCause?: string;
  fixRecommendations?: string[];
  confidence: number;
}

export class AIService {
  private apiKey: string | undefined;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  async analyzeTestFailure(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.apiKey) {
      console.warn('⚠️ OPENROUTER_API_KEY not found. Skipping AI analysis.');
      return {
        summary: 'AI analysis unavailable - API key not configured',
        suggestions: 'Configure OPENROUTER_API_KEY environment variable to enable AI-powered test failure analysis',
        confidence: 0
      };
    }

    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://raiken.dev',
          'X-Title': 'Raiken Test Analysis'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'system',
              content: 'You are an expert Playwright test automation engineer. Analyze test failures and provide actionable insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from AI service');
      }

      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return {
        summary: 'AI analysis failed due to service error',
        suggestions: 'Review the raw test output and error messages manually',
        confidence: 0
      };
    }
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    // Extract key information from raw output for better analysis
    const outputAnalysis = this.analyzeRawOutput(request.rawOutput, request.rawError);
    
    return `
You are an expert Playwright test automation engineer. Analyze this test failure and provide specific, actionable insights.

**Test Information:**
- Test Name: ${request.testName}
- Test Path: ${request.testPath}

**Raw Playwright Output Analysis:**
${outputAnalysis}

**Full Raw Output (for reference):**
\`\`\`
${request.rawOutput.slice(0, 3000)}${request.rawOutput.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

**Error Output:**
\`\`\`
${request.rawError.slice(0, 1500)}${request.rawError.length > 1500 ? '\n... (truncated)' : ''}
\`\`\`

**Structured Errors:**
${request.detailedErrors.map(error => `- ${error.message}`).join('\n') || 'None extracted'}

**Test Execution Context:**
- Suites Found: ${request.playwrightResult.suites?.length || 0}
- Configuration Errors: ${request.playwrightResult.errors?.length || 0}
- Execution Duration: ${request.playwrightResult.stats?.duration || 'unknown'}ms
- Available Screenshots: ${request.screenshots?.length || 0}
- Available Videos: ${request.videos?.length || 0}

**Analysis Requirements:**
1. Identify the PRIMARY failure reason from the raw output
2. Determine if this is a test logic issue, environment issue, or configuration problem
3. Look for specific error patterns (timeouts, element not found, network issues, etc.)
4. Provide concrete, actionable solutions

**Response Format (JSON only):**
{
  "summary": "Clear, specific explanation of what failed and why",
  "rootCause": "The underlying technical reason for the failure",
  "suggestions": "Step-by-step instructions to fix this specific issue",
  "fixRecommendations": ["Specific action 1", "Specific action 2", "Specific action 3"],
  "confidence": 85
}

Focus on being specific rather than generic. If you see timeout errors, mention the specific timeout. If elements aren't found, mention the specific selectors. If there are network issues, mention the specific URLs or status codes.
`;
  }

  private analyzeRawOutput(rawOutput: string, rawError: string): string {
    const analysis = [];
    const combinedOutput = `${rawOutput}\n${rawError}`.toLowerCase();

    // Check for common Playwright issues
    if (combinedOutput.includes('timeout') || combinedOutput.includes('timed out')) {
      const timeoutMatch = rawOutput.match(/timeout (\d+)ms/i) || rawError.match(/timeout (\d+)ms/i);
      const timeout = timeoutMatch ? timeoutMatch[1] : 'unknown';
      analysis.push(`🕐 TIMEOUT DETECTED: Test timed out (${timeout}ms timeout configured)`);
    }

    if (combinedOutput.includes('element not found') || combinedOutput.includes('no such element')) {
      const selectorMatch = rawOutput.match(/locator\(['"`]([^'"`]+)['"`]\)/i) || rawError.match(/locator\(['"`]([^'"`]+)['"`]\)/i);
      const selector = selectorMatch ? selectorMatch[1] : 'unknown selector';
      analysis.push(`🎯 ELEMENT NOT FOUND: Cannot locate element with selector: ${selector}`);
    }

    if (combinedOutput.includes('no tests found')) {
      analysis.push(`📁 NO TESTS FOUND: Playwright cannot find any test files matching the pattern`);
    }

    if (combinedOutput.includes('network error') || combinedOutput.includes('net::err')) {
      const networkMatch = rawOutput.match(/net::err_([a-z_]+)/i) || rawError.match(/net::err_([a-z_]+)/i);
      const networkError = networkMatch ? networkMatch[1] : 'unknown';
      analysis.push(`🌐 NETWORK ERROR: ${networkError.replace(/_/g, ' ')}`);
    }

    if (combinedOutput.includes('page crashed') || combinedOutput.includes('browser crashed')) {
      analysis.push(`💥 BROWSER CRASH: The browser or page crashed during test execution`);
    }

    if (combinedOutput.includes('permission denied') || combinedOutput.includes('access denied')) {
      analysis.push(`🔒 PERMISSION ERROR: Access denied - check file permissions or security settings`);
    }

    if (combinedOutput.includes('connection refused') || combinedOutput.includes('econnrefused')) {
      const urlMatch = rawOutput.match(/https?:\/\/[^\s]+/i) || rawError.match(/https?:\/\/[^\s]+/i);
      const url = urlMatch ? urlMatch[0] : 'target server';
      analysis.push(`🔌 CONNECTION REFUSED: Cannot connect to ${url}`);
    }

    if (combinedOutput.includes('screenshot') || combinedOutput.includes('video')) {
      analysis.push(`📸 ARTIFACTS AVAILABLE: Screenshots and/or videos were captured for debugging`);
    }

    // Check for specific HTTP status codes
    const statusMatch = rawOutput.match(/(\d{3})\s+(error|failed)/i) || rawError.match(/(\d{3})\s+(error|failed)/i);
    if (statusMatch) {
      const status = statusMatch[1];
      analysis.push(`🌐 HTTP ERROR: Received ${status} status code`);
    }

    // Check for JavaScript errors
    if (combinedOutput.includes('javascript error') || combinedOutput.includes('uncaught exception')) {
      analysis.push(`⚠️ JAVASCRIPT ERROR: Page JavaScript error detected`);
    }

    // Check for configuration issues
    if (combinedOutput.includes('config') && combinedOutput.includes('invalid')) {
      analysis.push(`⚙️ CONFIGURATION ERROR: Invalid Playwright configuration detected`);
    }

    return analysis.length > 0 
      ? analysis.join('\n') 
      : '❓ GENERAL FAILURE: No specific error patterns detected in output';
  }

  private parseAIResponse(aiResponse: string): AIAnalysisResponse {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      return {
        summary: parsed.summary || 'AI analysis completed',
        suggestions: parsed.suggestions || 'Review the test output for more details',
        rootCause: parsed.rootCause,
        fixRecommendations: parsed.fixRecommendations,
        confidence: parsed.confidence || 50
      };
    } catch {
      // If JSON parsing fails, treat as plain text
      return {
        summary: 'AI analysis completed',
        suggestions: aiResponse.slice(0, 500),
        confidence: 30
      };
    }
  }
}
