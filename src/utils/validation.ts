/**
 * Validation Utilities
 */

import { createValidationError } from './error-handling';

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export class Validator<T = any> {
  private rules: ValidationRule<T>[] = [];

  required(message: string = 'This field is required'): this {
    this.rules.push({
      validate: (value) => value !== undefined && value !== null && value !== '',
      message,
    });
    return this;
  }

  minLength(min: number, message?: string): this {
    this.rules.push({
      validate: (value) => typeof value === 'string' && value.length >= min,
      message: message || `Must be at least ${min} characters`,
    });
    return this;
  }

  maxLength(max: number, message?: string): this {
    this.rules.push({
      validate: (value) => typeof value === 'string' && value.length <= max,
      message: message || `Must be no more than ${max} characters`,
    });
    return this;
  }

  pattern(regex: RegExp, message: string): this {
    this.rules.push({
      validate: (value) => typeof value === 'string' && regex.test(value),
      message,
    });
    return this;
  }

  custom(validate: (value: T) => boolean, message: string): this {
    this.rules.push({ validate, message });
    return this;
  }

  validate(value: T, fieldName?: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateOrThrow(value: T, fieldName?: string): void {
    const result = this.validate(value, fieldName);
    if (!result.isValid) {
      throw createValidationError(
        `Validation failed${fieldName ? ` for ${fieldName}` : ''}: ${result.errors.join(', ')}`,
        fieldName
      );
    }
  }
}

// Common validators
export const validators = {
  url: new Validator<string>()
    .required('URL is required')
    .pattern(
      /^https?:\/\/.+/,
      'Must be a valid HTTP or HTTPS URL'
    ),

  testName: new Validator<string>()
    .required('Test name is required')
    .minLength(1, 'Test name cannot be empty')
    .maxLength(100, 'Test name must be 100 characters or less')
    .pattern(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Test name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),

  fileName: new Validator<string>()
    .required('File name is required')
    .pattern(
      /^[a-zA-Z0-9\-_]+\.(ts|js|json)$/,
      'File name must end with .ts, .js, or .json and contain only letters, numbers, hyphens, and underscores'
    ),

  prompt: new Validator<string>()
    .required('Test generation prompt is required')
    .minLength(10, 'Prompt must be at least 10 characters')
    .maxLength(2000, 'Prompt must be 2000 characters or less'),
};

/**
 * Validate object against schema
 */
export function validateObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, Validator>
): { isValid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  for (const [key, validator] of Object.entries(schema)) {
    const result = validator.validate(obj[key], key);
    if (!result.isValid) {
      errors[key] = result.errors;
      isValid = false;
    }
  }

  return { isValid, errors };
}
