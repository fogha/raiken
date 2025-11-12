/**
 * Custom Error Classes for Raiken
 * Provides structured error handling with proper categorization
 */

export class RaikenError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RaikenError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

export class ConfigError extends RaikenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFIG_ERROR', message, details);
    this.name = 'ConfigError';
  }
}

export class APIError extends RaikenError {
  constructor(
    public status: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super('API_ERROR', message, { status, ...details });
    this.name = 'APIError';
  }
}

export class GenerationError extends RaikenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GENERATION_ERROR', message, details);
    this.name = 'GenerationError';
  }
}

export class ValidationError extends RaikenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class BridgeError extends RaikenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BRIDGE_ERROR', message, details);
    this.name = 'BridgeError';
  }
}

export class TestExecutionError extends RaikenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('TEST_EXECUTION_ERROR', message, details);
    this.name = 'TestExecutionError';
  }
}

export class FileSystemError extends RaikenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('FILESYSTEM_ERROR', message, details);
    this.name = 'FileSystemError';
  }
}

export function createValidationError(field: string, value: unknown, expected: string): ValidationError {
  return new ValidationError(
    `Invalid ${field}: expected ${expected}`, 
    { field, value, expected }
  );
}

export function createAPIError(status: number, operation: string, cause?: string): APIError {
  const message = cause 
    ? `${operation} failed: ${cause}`
    : `${operation} failed`;
    
  return new APIError(status, message, { operation, cause });
}

export function createGenerationError(stage: string, cause?: string): GenerationError {
  const message = cause 
    ? `Test generation failed at ${stage}: ${cause}`
    : `Test generation failed at ${stage}`;
    
  return new GenerationError(message, { stage, cause });
}

export function isRaikenError(error: unknown): error is RaikenError {
  return error instanceof RaikenError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function isGenerationError(error: unknown): error is GenerationError {
  return error instanceof GenerationError;
}

export function getErrorCategory(error: unknown): string {
  if (error instanceof ValidationError) return 'validation';
  if (error instanceof APIError) return 'api';
  if (error instanceof GenerationError) return 'generation';
  if (error instanceof BridgeError) return 'bridge';
  if (error instanceof TestExecutionError) return 'execution';
  if (error instanceof FileSystemError) return 'filesystem';
  if (error instanceof ConfigError) return 'config';
  if (error instanceof RaikenError) return 'raiken';
  if (error instanceof Error) return 'system';
  return 'unknown';
}
