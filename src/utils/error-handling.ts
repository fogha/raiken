/**
 * Standardized Error Handling Utilities
 * Following Google's error handling best practices
 */

import { ApiResponse } from '@/types';

export enum ErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // Domain-specific errors
  BROWSER_ERROR = 'BROWSER_ERROR',
  TEST_EXECUTION_ERROR = 'TEST_EXECUTION_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
    
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    
    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create standardized error responses
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): ApiResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      timestamp: error.timestamp.toISOString(),
    };
  }
  
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: false,
    error: defaultMessage,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validation error helper
 */
export function createValidationError(message: string, field?: string): AppError {
  return new AppError(
    message,
    ErrorCode.VALIDATION_ERROR,
    400,
    true,
    field ? { field } : undefined
  );
}

/**
 * Browser error helper
 */
export function createBrowserError(message: string, scriptId?: string): AppError {
  return new AppError(
    message,
    ErrorCode.BROWSER_ERROR,
    500,
    true,
    scriptId ? { scriptId } : undefined
  );
}

/**
 * Test execution error helper
 */
export function createTestError(message: string, testPath?: string): AppError {
  return new AppError(
    message,
    ErrorCode.TEST_EXECUTION_ERROR,
    500,
    true,
    testPath ? { testPath } : undefined
  );
}

/**
 * AI service error helper
 */
export function createAiError(message: string, model?: string): AppError {
  return new AppError(
    message,
    ErrorCode.AI_SERVICE_ERROR,
    500,
    true,
    model ? { model } : undefined
  );
}

/**
 * Safe async wrapper that handles errors consistently
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    console.error(`Error in ${context || 'operation'}:`, error);
    
    if (error instanceof AppError) {
      return { error };
    }
    
    return {
      error: new AppError(
        error instanceof Error ? error.message : 'Unknown error',
        ErrorCode.INTERNAL_ERROR,
        500,
        true,
        { context }
      ),
    };
  }
}

/**
 * Retry wrapper for operations that might fail temporarily
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying with exponential backoff
      const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      console.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms:`, lastError.message);
    }
  }
  
  throw new AppError(
    `Operation failed after ${maxRetries} attempts: ${lastError?.message}`,
    ErrorCode.INTERNAL_ERROR,
    500,
    true,
    { maxRetries, lastError: lastError?.message }
  );
}

/**
 * Log errors in a structured way
 */
export function logError(error: unknown, context?: string) {
  const timestamp = new Date().toISOString();
  
  if (error instanceof AppError) {
    console.error(`[${timestamp}] AppError in ${context || 'unknown'}:`, {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] Error in ${context || 'unknown'}:`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
  } else {
    console.error(`[${timestamp}] Unknown error in ${context || 'unknown'}:`, error);
  }
}
