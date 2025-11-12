import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterService } from '@/core/testing/services/openrouter.service';
import { JsonTestSpec } from '@/types/test-generation';
import { logger, generateRequestId } from '@/lib/logger';
import { ValidationError, createGenerationError } from '@/lib/errors';
import { handleError, validateRequired } from '@/lib/error-handler';

/**
 * Test Generation API
 * Generates Playwright test scripts using AI based on test specifications
 */

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const component = 'GenerateTestAPI';
  
  try {
    logger.apiRequest(component, 'POST', '/api/generate-test', { requestId });
    
    const body = await request.json();
    const { testSpec, domTree, config } = body;

    validateRequired(testSpec, 'testSpec', { requestId });
    
    const typedTestSpec: JsonTestSpec = testSpec;
    
    logger.info(component, 'Processing test generation request', {
      requestId,
      testName: typedTestSpec.name,
      hasSteps: Array.isArray(typedTestSpec.steps) && typedTestSpec.steps.length > 0,
      hasDOM: Boolean(domTree),
      hasConfig: Boolean(config)
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logger.error(component, 'OpenRouter API key not configured', undefined, { requestId });
      throw new ValidationError('AI service not configured. Please set OPENROUTER_API_KEY environment variable.');
    }

    logger.debug(component, 'Initializing OpenRouter service', { requestId, model: 'anthropic/claude-3.5-sonnet' });
    
    const openRouterService = new OpenRouterService({
      apiKey,
      model: 'anthropic/claude-3.5-sonnet',
    });

    const generationInput = {
      ...typedTestSpec,
      domTree,
      url: typedTestSpec.url || config?.url
    };

    logger.info(component, 'Starting test script generation', {
      requestId,
      inputSize: JSON.stringify(generationInput).length,
      testName: typedTestSpec.name || 'unnamed'
    });

    const startTime = Date.now();
    
    const testScript = await openRouterService.generateTestScript(
      JSON.stringify(generationInput)
    );

    const duration = Date.now() - startTime;
    
    if (!testScript || testScript.trim().length === 0) {
      throw createGenerationError('script_empty', 'OpenRouter returned empty test script');
    }

    logger.performance(component, 'Test generation', duration, {
      requestId,
      scriptLength: testScript.length,
      testName: typedTestSpec.name
    });

    logger.apiResponse(component, 'POST', '/api/generate-test', 200, {
      requestId,
      scriptLength: testScript.length
    });

    return NextResponse.json({
      success: true,
      testScript,
      requestId,
      metadata: {
        generationTime: duration,
        scriptLength: testScript.length
      }
    });
    
  } catch (error) {
    return handleError(error, {
      requestId,
      component,
      operation: 'generateTest',
      metadata: { endpoint: '/api/generate-test' }
    });
  }
}

