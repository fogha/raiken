/**
 * Test Helper Utilities
 */

import { TestTab, TestGenerationResult } from '@/types';

/**
 * Generate unique test ID
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate test file name from prompt
 */
export function generateTestFileName(prompt: string): string {
  const cleaned = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  
  return `${cleaned || 'generated_test'}.spec.ts`;
}

/**
 * Extract test name from test script
 */
export function extractTestName(testScript: string): string {
  // Look for test('name', ...) or test.describe('name', ...)
  const testMatch = testScript.match(/test(?:\.describe)?\(['"`]([^'"`]+)['"`]/);
  if (testMatch) {
    return testMatch[1];
  }
  
  // Look for @test annotation or comment
  const commentMatch = testScript.match(/\/\*\*?\s*\*?\s*(.+?)\s*\*?\s*\*?\//);
  if (commentMatch) {
    return commentMatch[1].replace(/\*/g, '').trim();
  }
  
  return 'Generated Test';
}

/**
 * Create new test tab
 */
export function createTestTab(
  script: string,
  name?: string
): TestTab {
  return {
    id: generateTestId(),
    name: name || extractTestName(script),
    content: script,
    language: 'typescript',
    config: {
      headless: true,
      browserType: 'chromium'
    }
  };
}

/**
 * Validate test script syntax
 */
export function validateTestScript(script: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check for required imports
  if (!script.includes("import") || !script.includes("@playwright/test")) {
    errors.push("Missing required Playwright imports");
  }
  
  // Check for test function
  if (!script.includes("test(")) {
    errors.push("Missing test function");
  }
  
  // Check for basic syntax issues
  const openBraces = (script.match(/{/g) || []).length;
  const closeBraces = (script.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push("Mismatched braces");
  }
  
  const openParens = (script.match(/\(/g) || []).length;
  const closeParens = (script.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push("Mismatched parentheses");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format test execution time
 */
export function formatExecutionTime(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  
  const seconds = Math.floor(durationMs / 1000);
  const ms = durationMs % 1000;
  
  if (seconds < 60) {
    return `${seconds}.${Math.floor(ms / 100)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Parse test results for summary
 */
export function parseTestResults(result: TestGenerationResult): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
} {
  // Default values
  const summary = {
    totalTests: 1,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0
  };
  
  if (result.success) {
    summary.passedTests = 1;
  } else {
    summary.failedTests = 1;
  }
  
  // Note: TestGenerationResult doesn't include detailed test execution results
  // This would need to be updated if more detailed result parsing is needed
  
  return summary;
}

/**
 * Generate test report summary
 */
export function generateTestSummary(results: Map<string, TestGenerationResult>): {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalDuration: number;
  averageDuration: number;
} {
  const allResults = Array.from(results.values());
  
  return {
    totalRuns: allResults.length,
    successfulRuns: allResults.filter(r => r.success).length,
    failedRuns: allResults.filter(r => !r.success).length,
    totalDuration: 0, // TestGenerationResult doesn't include duration
    averageDuration: 0 // TestGenerationResult doesn't include duration
  };
}

/**
 * Convert test script to different formats
 */
export function convertTestScript(
  script: string,
  targetFormat: 'typescript' | 'javascript' | 'json'
): string {
  switch (targetFormat) {
    case 'javascript':
      // Remove TypeScript types (basic conversion)
      return script
        .replace(/: \w+(\[\])?/g, '')
        .replace(/interface \w+ \{[^}]+\}/g, '')
        .replace(/import.*from ['"]@playwright\/test['"];?/g, 
                 "const { test, expect } = require('@playwright/test');");
    
    case 'json':
      // Extract test steps as JSON (simplified)
      try {
        const steps = extractTestSteps(script);
        return JSON.stringify({ steps }, null, 2);
      } catch {
        return '{ "error": "Could not convert to JSON" }';
      }
    
    case 'typescript':
    default:
      return script;
  }
}

/**
 * Extract test steps from script (helper function)
 */
function extractTestSteps(script: string): Array<{ action: string; target?: string; value?: string }> {
  const steps: Array<{ action: string; target?: string; value?: string }> = [];
  
  // Basic parsing of common Playwright actions
  const actionPatterns = [
    { pattern: /page\.goto\(['"`]([^'"`]+)['"`]\)/, action: 'navigate' },
    { pattern: /page\.click\(['"`]([^'"`]+)['"`]\)/, action: 'click' },
    { pattern: /page\.fill\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`]\)/, action: 'fill' },
    { pattern: /page\.type\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`]\)/, action: 'type' },
    { pattern: /expect\([^)]+\)\.toBeVisible\(\)/, action: 'assert_visible' }
  ];
  
  for (const { pattern, action } of actionPatterns) {
    const regex = new RegExp(pattern.source, 'g');
    let match;
    while ((match = regex.exec(script)) !== null) {
      steps.push({
        action,
        target: match[1],
        value: match[2] || ''
      });
    }
  }
  
  return steps;
}
