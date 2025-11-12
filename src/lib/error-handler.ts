/**
 * Centralized Error Handler for Raiken APIs
 * Provides consistent error responses and logging
 */

import { NextResponse } from 'next/server';
import { RaikenError, APIError, isRaikenError, getErrorCategory } from './errors';
import { logger } from './logger';

interface ErrorContext {
  requestId: string;
  component: string;
  operation: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export function handleError(error: unknown, context: ErrorContext): NextResponse {
  const { requestId, component, operation, userId, metadata } = context;
  
  logger.error(
    component, 
    `${operation} failed`,
    error instanceof Error ? error : new Error(String(error)),
    { 
      requestId, 
      operation, 
      userId,
      category: getErrorCategory(error),
      ...metadata 
    }
  );

  if (isRaikenError(error)) {
    const status = error instanceof APIError ? error.status : 400;
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.details : undefined
        },
        requestId
      },
      { status }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'An internal error occurred',
          details: process.env.NODE_ENV === 'development' 
            ? { stack: error.stack } 
            : undefined
        },
        requestId
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
      },
      requestId
    },
    { status: 500 }
  );
}

// Wrapper function for API routes to provide consistent error handling
export function withErrorHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<Response | NextResponse>,
  component: string,
  operation: string
) {
  return async (...args: T): Promise<Response | NextResponse> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info(component, `${operation} started`, { requestId });
      const startTime = Date.now();
      
      const result = await handler(...args);
      
      const duration = Date.now() - startTime;
      logger.performance(component, operation, duration, { requestId });
      
      return result;
    } catch (error) {
      return handleError(error, {
        requestId,
        component,
        operation
      });
    }
  };
}

export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string,
  context?: Record<string, unknown>
): T {
  if (value === null || value === undefined || value === '') {
    throw new RaikenError(
      'VALIDATION_ERROR',
      `${fieldName} is required`,
      { field: fieldName, ...context }
    );
  }
  return value;
}

export function validateType<T>(
  value: unknown,
  expectedType: string,
  fieldName: string
): T {
  if (typeof value !== expectedType) {
    throw new RaikenError(
      'VALIDATION_ERROR',
      `${fieldName} must be a ${expectedType}`,
      { 
        field: fieldName, 
        expected: expectedType, 
        received: typeof value,
        value: value
      }
    );
  }
  return value as T;
}
