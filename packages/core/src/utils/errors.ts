import type { FieldError, FormErrors, ValidationError } from '../types';
import { getByPath, setByPath } from './path';

/**
 * Convert validation errors array to FormErrors object
 */
export function validationErrorsToFormErrors<T extends Record<string, unknown>>(
  errors: ValidationError[]
): FormErrors<T> {
  let result: FormErrors<T> = {};

  for (const error of errors) {
    const fieldError: FieldError = {
      message: error.message,
      type: error.type,
    };

    result = setByPath(
      result as Record<string, unknown>,
      error.path,
      fieldError
    ) as FormErrors<T>;
  }

  return result;
}

/**
 * Convert FormErrors object to flat validation errors array
 */
export function formErrorsToValidationErrors<T extends Record<string, unknown>>(
  errors: FormErrors<T>,
  prefix = ''
): ValidationError[] {
  const result: ValidationError[] = [];

  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object') {
      if ('message' in value && typeof value.message === 'string') {
        // This is a FieldError
        result.push({
          path,
          message: value.message,
          type: (value as FieldError).type,
        });
      } else {
        // This is a nested object or array
        result.push(
          ...formErrorsToValidationErrors(
            value as FormErrors<Record<string, unknown>>,
            path
          )
        );
      }
    }
  }

  return result;
}

/**
 * Get a field error from FormErrors by path
 */
export function getFieldError<T extends Record<string, unknown>>(
  errors: FormErrors<T>,
  path: string
): FieldError | undefined {
  const error = getByPath(errors, path);

  if (error && typeof error === 'object' && 'message' in error) {
    return error as FieldError;
  }

  return undefined;
}

/**
 * Check if form has any errors
 */
export function hasErrors<T extends Record<string, unknown>>(
  errors: FormErrors<T>
): boolean {
  return formErrorsToValidationErrors(errors).length > 0;
}

/**
 * Count total number of errors
 */
export function countErrors<T extends Record<string, unknown>>(
  errors: FormErrors<T>
): number {
  return formErrorsToValidationErrors(errors).length;
}

/**
 * Get all error paths
 */
export function getErrorPaths<T extends Record<string, unknown>>(
  errors: FormErrors<T>
): string[] {
  return formErrorsToValidationErrors(errors).map(e => e.path);
}

/**
 * Merge two FormErrors objects
 */
export function mergeErrors<T extends Record<string, unknown>>(
  a: FormErrors<T>,
  b: FormErrors<T>
): FormErrors<T> {
  const aErrors = formErrorsToValidationErrors(a);
  const bErrors = formErrorsToValidationErrors(b);

  // B errors override A errors for the same path
  const errorMap = new Map<string, ValidationError>();

  for (const error of aErrors) {
    errorMap.set(error.path, error);
  }

  for (const error of bErrors) {
    errorMap.set(error.path, error);
  }

  return validationErrorsToFormErrors<T>(Array.from(errorMap.values()));
}

/**
 * Clear errors at specific paths
 */
export function clearErrorsAtPaths<T extends Record<string, unknown>>(
  errors: FormErrors<T>,
  paths: string[]
): FormErrors<T> {
  const allErrors = formErrorsToValidationErrors(errors);
  const pathSet = new Set(paths);

  const remainingErrors = allErrors.filter(e => !pathSet.has(e.path));

  return validationErrorsToFormErrors<T>(remainingErrors);
}

/**
 * Create a FieldError from a string or FieldError
 */
export function normalizeFieldError(
  error: string | FieldError | undefined
): FieldError | undefined {
  if (!error) {
    return undefined;
  }

  if (typeof error === 'string') {
    return { message: error, type: 'manual' };
  }

  return error;
}
