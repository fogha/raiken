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
  rootCause: string;
  fixRecommendations: string[];
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
      console.warn('[AI Service] OPENROUTER_API_KEY not found. Skipping AI analysis.');
      return {
        rootCause: 'AI analysis unavailable - OPENROUTER_API_KEY environment variable not configured',
        fixRecommendations: [
          'Set OPENROUTER_API_KEY environment variable with your OpenRouter API key',
          'Restart the Raiken CLI after setting the environment variable',
          'Verify the API key is valid and has sufficient credits'
        ],
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
        rootCause: 'AI analysis service encountered an error - unable to analyze test failure automatically',
        fixRecommendations: [
          'Review the raw test output and error messages manually',
          'Check network connectivity and OpenRouter API status',
          'Verify the OPENROUTER_API_KEY is valid and has sufficient credits',
          'Try running the test again to see if the issue persists'
        ],
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
You are an expert Playwright test engineer. Analyze this test failure and provide:

1. **Root Cause Analysis**: Identify the PRIMARY technical reason for failure
   - Be specific about error types (timeout, selector, network, assertion, etc.)
   - Include specific values (timeout durations, selectors, status codes, etc.)
   - Distinguish between test logic issues, environment problems, or application bugs
   - Reference specific line numbers or stack traces when available

2. **Actionable Fix Recommendations**: Provide concrete, implementable solutions
   - Order fixes by likelihood of success (most likely first)
   - Include specific code changes, configuration updates, or debugging steps
   - Provide alternative approaches if the primary fix might not work
   - Include preventive measures to avoid similar issues

**Response Format (JSON only):**
{
  "rootCause": "Detailed technical explanation of what failed and why, including specific error details, selectors, timeouts, or other relevant technical information",
  "fixRecommendations": [
    "Most likely fix with specific implementation details",
    "Alternative fix approach with code examples if applicable", 
    "Additional debugging steps or configuration changes",
    "Preventive measures or best practices to avoid this issue"
  ],
  "confidence": 85
}

**Requirements:**
- Be specific, not generic (mention exact selectors, timeouts, URLs, status codes)
- Provide actionable fixes with implementation details
- Order recommendations by likelihood of success
- Include code examples in fixes when relevant
- Focus on practical solutions a developer can immediately implement
`;
  }

  private analyzeRawOutput(rawOutput: string, rawError: string): string {
    const analysis = [];
    const combinedOutput = `${rawOutput}\n${rawError}`.toLowerCase();

    const patterns = [
      {
        condition: () => combinedOutput.includes('timeout') || combinedOutput.includes('timed out'),
        getMessage: () => {
          const timeoutMatch = rawOutput.match(/timeout (\d+)ms/i) || rawError.match(/timeout (\d+)ms/i);
          const timeout = timeoutMatch ? timeoutMatch[1] : 'unknown';
          return `TIMEOUT DETECTED: Test timed out (${timeout}ms timeout configured)`;
        }
      },
      {
        condition: () => combinedOutput.includes('element not found') || combinedOutput.includes('no such element'),
        getMessage: () => {
          const selectorMatch = rawOutput.match(/locator\(['"`]([^'"`]+)['"`]\)/i) || rawError.match(/locator\(['"`]([^'"`]+)['"`]\)/i);
          const selector = selectorMatch ? selectorMatch[1] : 'unknown selector';
          return `ELEMENT NOT FOUND: Cannot locate element with selector: ${selector}`;
        }
      },
      {
        condition: () => combinedOutput.includes('no tests found'),
        getMessage: () => 'NO TESTS FOUND: Playwright cannot find any test files matching the pattern'
      },
      {
        condition: () => combinedOutput.includes('network error') || combinedOutput.includes('net::err'),
        getMessage: () => {
          const networkMatch = rawOutput.match(/net::err_([a-z_]+)/i) || rawError.match(/net::err_([a-z_]+)/i);
          const networkError = networkMatch ? networkMatch[1] : 'unknown';
          return `NETWORK ERROR: ${networkError.replace(/_/g, ' ')}`;
        }
      },
      {
        condition: () => combinedOutput.includes('page crashed') || combinedOutput.includes('browser crashed'),
        getMessage: () => 'BROWSER CRASH: The browser or page crashed during test execution'
      },
      {
        condition: () => combinedOutput.includes('permission denied') || combinedOutput.includes('access denied'),
        getMessage: () => 'PERMISSION ERROR: Access denied - check file permissions or security settings'
      },
      {
        condition: () => combinedOutput.includes('connection refused') || combinedOutput.includes('econnrefused'),
        getMessage: () => {
          const urlMatch = rawOutput.match(/https?:\/\/[^\s]+/i) || rawError.match(/https?:\/\/[^\s]+/i);
          const url = urlMatch ? urlMatch[0] : 'target server';
          return `CONNECTION REFUSED: Cannot connect to ${url}`;
        }
      },
      {
        condition: () => combinedOutput.includes('screenshot') || combinedOutput.includes('video'),
        getMessage: () => 'ARTIFACTS AVAILABLE: Screenshots and/or videos were captured for debugging'
      },
      {
        condition: () => {
          const statusMatch = rawOutput.match(/(\d{3})\s+(error|failed)/i) || rawError.match(/(\d{3})\s+(error|failed)/i);
          return !!statusMatch;
        },
        getMessage: () => {
          const statusMatch = rawOutput.match(/(\d{3})\s+(error|failed)/i) || rawError.match(/(\d{3})\s+(error|failed)/i);
          const status = statusMatch ? statusMatch[1] : 'unknown';
          return `HTTP ERROR: Received ${status} status code`;
        }
      },
      {
        condition: () => combinedOutput.includes('javascript error') || combinedOutput.includes('uncaught exception'),
        getMessage: () => 'JAVASCRIPT ERROR: Page JavaScript error detected'
      },
      {
        condition: () => combinedOutput.includes('config') && combinedOutput.includes('invalid'),
        getMessage: () => 'CONFIGURATION ERROR: Invalid Playwright configuration detected'
      }
    ];

    for (const pattern of patterns) {
      if (pattern.condition()) {
        analysis.push(pattern.getMessage());
      }
    }

    return analysis.length > 0 
      ? analysis.join('\n') 
      : 'GENERAL FAILURE: No specific error patterns detected in output';
  }

  private parseAIResponse(aiResponse: string): AIAnalysisResponse {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      return {
        rootCause: parsed.rootCause || 'Unable to determine the root cause of the test failure',
        fixRecommendations: Array.isArray(parsed.fixRecommendations) 
          ? parsed.fixRecommendations 
          : (typeof parsed.fixRecommendations === 'string' 
              ? [parsed.fixRecommendations] 
              : [
                  'Review the test output and error messages manually',
                  'Check if selectors are correct and elements are present',
                  'Verify test timing and add appropriate waits if needed',
                  'Ensure the application is in the expected state before running assertions'
                ]),
        confidence: parsed.confidence || 50
      };
    } catch {
      // If JSON parsing fails, provide fallback analysis
      return {
        rootCause: 'Failed to parse AI analysis response - manual review required',
        fixRecommendations: [
          'Review the raw test output and error messages manually',
          'Check for common issues like element selectors, timing, or network problems',
          'Verify the test environment and application state',
          'Consider adding debug logging or screenshots to identify the issue'
        ],
        confidence: 30
      };
    }
  }
}
