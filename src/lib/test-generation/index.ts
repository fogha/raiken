import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

const TestStepSchema = z.object({
  action: z.enum(["navigate", "click", "type", "wait", "assert"]),
  selector: z.string().optional(),
  value: z.string().optional(),
  timeout: z.number().optional(),
});

const PlaywrightScriptSchema = z.object({
  name: z.string(),
  description: z.string(),
  steps: z.array(TestStepSchema),
});

type PlaywrightScript = z.infer<typeof PlaywrightScriptSchema>;

export class TestGenerator {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
    });
  }

  async generatePlaywrightScript(testDescription: string): Promise<{
    script: string;
    steps: PlaywrightScript;
  }> {
    const prompt = PromptTemplate.fromTemplate(`
      Convert this test description into a Playwright test script.
      Test Description: {testDescription}
      
      Generate a structured test object with:
      - name: string
      - description: string
      - steps: array of test steps
      
      Each step should have:
      - action: "navigate" | "click" | "type" | "wait" | "assert"
      - selector: string (CSS selector)
      - value: string (optional)
      - timeout: number (optional)
    `);

    const parser = StructuredOutputParser.fromZodSchema(PlaywrightScriptSchema);
    const chain = prompt.pipe(this.model).pipe(parser);

    const response = await chain.invoke({
      testDescription,
    });

    const playwrightScript = this.generateScript(response);

    return {
      script: playwrightScript,
      steps: response,
    };
  }

  private generateScript(steps: PlaywrightScript): string {
    return `
import { test, expect } from '@playwright/test';

test('${steps.name}', async ({ page }) => {
  try {
    ${steps.steps.map(step => {
      switch (step.action) {
        case 'navigate':
          return `await page.goto('${step.value}');`;
        case 'click':
          return `await page.locator('${step.selector}').click();`;
        case 'type':
          return `await page.locator('${step.selector}').fill('${step.value}');`;
        case 'assert':
          return `await expect(page.locator('${step.selector}')).toBeVisible();`;
        case 'wait':
          return `await page.waitForTimeout(${step.timeout});`;
        default:
          return '';
      }
    }).join('\n    ')}
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});
`.trim();
  }
} 