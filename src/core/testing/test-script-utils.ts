/**
 * Utilities for generating runnable test scripts from test specifications
 */

/**
 * Convert a JSON test specification to a runnable Playwright test script
 * @param testSpec The test specification as an object or JSON string
 * @returns A runnable Playwright test script
 */
export function convertToRunnableScript(testSpec: any): string {
  // Parse the test spec if it's a string
  const spec = typeof testSpec === 'string' ? JSON.parse(testSpec) : testSpec;
  
  // Extract test name and URL
  const testName = spec.name || 'Raiken Generated Test';
  const url = spec.url || 'http://localhost:3000';
  
  // Generate a proper Playwright test script
  const script = `
/**
 * Raiken Generated Test
 * Generated on: ${new Date().toISOString()}
 */
import { test, expect } from '@playwright/test';

test('${testName}', async ({ page }) => {
  // Default timeout for all operations
  page.setDefaultTimeout(30000);
  
  ${generateSteps(spec)}
  
  ${generateAssertions(spec)}
});
  `;
  
  return script;
}

/**
 * Generate test steps from a test specification
 */
function generateSteps(spec: any): string {
  if (!spec.steps || !Array.isArray(spec.steps) || spec.steps.length === 0) {
    return '// No steps specified';
  }
  
  const steps = spec.steps.map((step: any, index: number) => {
    switch (step.action) {
      case 'navigate':
        return `// Step ${index + 1}: Navigate to URL\n  await page.goto('${step.url || spec.url}');`;
        
      case 'click':
        return `// Step ${index + 1}: Click element\n  await page.locator('${step.selector}').click({ force: ${step.force ? 'true' : 'false'} });`;
        
      case 'type':
        return `// Step ${index + 1}: Type text\n  await page.locator('${step.element}').fill('${step.value}');`;
        
      case 'wait':
        if (step.ms) {
          return `// Step ${index + 1}: Wait for ${step.ms}ms\n  await page.waitForTimeout(${step.ms});`;
        } else if (step.selector) {
          return `// Step ${index + 1}: Wait for element\n  await page.locator('${step.selector}').waitFor({ state: 'visible' });`;
        }
        return `// Step ${index + 1}: Wait (unknown configuration)`;
        
      default:
        return `// Step ${index + 1}: Unknown action '${step.action}'`;
    }
  });
  
  return steps.join('\n\n  ');
}

/**
 * Generate assertions from a test specification
 */
function generateAssertions(spec: any): string {
  if (!spec.assertions || !Array.isArray(spec.assertions) || spec.assertions.length === 0) {
    return '// No assertions specified';
  }
  
  const assertions = spec.assertions.map((assertion: any, index: number) => {
    switch (assertion.type) {
      case 'element':
        if (assertion.condition === 'visible') {
          return `// Assertion ${index + 1}: Element is visible\n  await expect(page.locator('${assertion.selector}')).toBeVisible({ timeout: ${assertion.timeout || 30000} });`;
        } else if (assertion.condition === 'contains') {
          return `// Assertion ${index + 1}: Element contains text\n  await expect(page.locator('${assertion.selector}')).toContainText('${assertion.value}', { timeout: ${assertion.timeout || 30000} });`;
        }
        return `// Assertion ${index + 1}: Unknown element condition '${assertion.condition}'`;
        
      case 'url':
        if (assertion.contains) {
          return `// Assertion ${index + 1}: URL contains string\n  await expect(page).toHaveURL(new RegExp('${assertion.contains}'));`;
        } else if (assertion.equals) {
          return `// Assertion ${index + 1}: URL exactly equals\n  await expect(page).toHaveURL('${assertion.equals}');`;
        }
        return `// Assertion ${index + 1}: Unknown URL condition`;
        
      default:
        return `// Assertion ${index + 1}: Unknown assertion type '${assertion.type}'`;
    }
  });
  
  return assertions.join('\n\n  ');
}
