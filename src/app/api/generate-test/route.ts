import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterService } from '@/core/testing/services/openrouter.service';

/**
 * Test Generation API
 * Generates Playwright test scripts using AI based on test specifications
 */

export async function POST(request: NextRequest) {
  try {
    const { testSpec, domTree, config } = await request.json();

    // Validate required fields
    if (!testSpec) {
      return NextResponse.json(
        { error: 'Test specification is required' },
        { status: 400 }
      );
    }

    // Check if OpenRouter API key is configured
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set OPENROUTER_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize OpenRouter service
    const openRouterService = new OpenRouterService({
      apiKey,
      model: 'anthropic/claude-3.5-sonnet',
    });

    // Generate the test script
    const testScript = await openRouterService.generateTestScript(
      JSON.stringify({ ...testSpec, domTree, url: testSpec.url || config?.url })
    );

    return NextResponse.json({
      success: true,
      testScript,
    });
  } catch (error) {
    console.error('Test generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate test';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

