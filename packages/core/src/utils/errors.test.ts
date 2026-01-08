import { describe, it, expect } from 'vitest';
import {
  validationErrorsToFormErrors,
  formErrorsToValidationErrors,
  getFieldError,
  hasErrors,
  countErrors,
  getErrorPaths,
  mergeErrors,
  clearErrorsAtPaths,
  normalizeFieldError,
} from './errors';
import type { FieldError, ValidationError } from '../types';

describe('error utilities', () => {
  describe('validationErrorsToFormErrors', () => {
    it('should convert validation errors to form errors', () => {
      const errors: ValidationError[] = [
        { path: 'name', message: 'Name is required', type: 'validation' },
        { path: 'email', message: 'Invalid email', type: 'validation' },
      ];

      const result = validationErrorsToFormErrors(errors);

      expect(result).toEqual({
        name: { message: 'Name is required', type: 'validation' },
        email: { message: 'Invalid email', type: 'validation' },
      });
    });

    it('should handle nested paths', () => {
      const errors: ValidationError[] = [
        { path: 'user.email', message: 'Invalid email', type: 'validation' },
      ];

      const result = validationErrorsToFormErrors(errors);

      expect(result).toEqual({
        user: {
          email: { message: 'Invalid email', type: 'validation' },
        },
      });
    });

    it('should handle empty array', () => {
      expect(validationErrorsToFormErrors([])).toEqual({});
    });
  });

  describe('formErrorsToValidationErrors', () => {
    it('should convert form errors to validation errors', () => {
      const errors = {
        name: { message: 'Name is required', type: 'validation' as const },
        email: { message: 'Invalid email', type: 'validation' as const },
      };

      const result = formErrorsToValidationErrors(errors);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        path: 'name',
        message: 'Name is required',
        type: 'validation',
      });
      expect(result).toContainEqual({
        path: 'email',
        message: 'Invalid email',
        type: 'validation',
      });
    });

    it('should handle nested errors', () => {
      const errors = {
        user: {
          email: { message: 'Invalid email', type: 'validation' as const },
        },
      };

      const result = formErrorsToValidationErrors(errors);

      expect(result).toContainEqual({
        path: 'user.email',
        message: 'Invalid email',
        type: 'validation',
      });
    });

    it('should handle empty object', () => {
      expect(formErrorsToValidationErrors({})).toEqual([]);
    });
  });

  describe('getFieldError', () => {
    it('should get a top-level error', () => {
      const errors = {
        name: { message: 'Required', type: 'validation' as const },
      };

      expect(getFieldError(errors, 'name')).toEqual({
        message: 'Required',
        type: 'validation',
      });
    });

    it('should get a nested error', () => {
      const errors = {
        user: {
          email: { message: 'Invalid', type: 'validation' as const },
        },
      };

      expect(getFieldError(errors, 'user.email')).toEqual({
        message: 'Invalid',
        type: 'validation',
      });
    });

    it('should return undefined for non-existent error', () => {
      expect(getFieldError({}, 'name')).toBeUndefined();
    });
  });

  describe('hasErrors', () => {
    it('should return true when errors exist', () => {
      const errors = {
        name: { message: 'Required', type: 'validation' as const },
      };
      expect(hasErrors(errors)).toBe(true);
    });

    it('should return false when no errors', () => {
      expect(hasErrors({})).toBe(false);
    });
  });

  describe('countErrors', () => {
    it('should count all errors', () => {
      const errors = {
        name: { message: 'Required', type: 'validation' as const },
        email: { message: 'Invalid', type: 'validation' as const },
        user: {
          age: { message: 'Too young', type: 'validation' as const },
        },
      };

      expect(countErrors(errors)).toBe(3);
    });

    it('should return 0 for empty errors', () => {
      expect(countErrors({})).toBe(0);
    });
  });

  describe('getErrorPaths', () => {
    it('should return all error paths', () => {
      const errors = {
        name: { message: 'Required', type: 'validation' as const },
        user: {
          email: { message: 'Invalid', type: 'validation' as const },
        },
      };

      const paths = getErrorPaths(errors);

      expect(paths).toContain('name');
      expect(paths).toContain('user.email');
    });
  });

  describe('mergeErrors', () => {
    it('should merge two error objects', () => {
      const a = {
        name: { message: 'Required', type: 'validation' as const },
      };
      const b = {
        email: { message: 'Invalid', type: 'validation' as const },
      };

      const result = mergeErrors(a, b);

      expect(result).toEqual({
        name: { message: 'Required', type: 'validation' },
        email: { message: 'Invalid', type: 'validation' },
      });
    });

    it('should override errors from a with b', () => {
      const a = {
        name: { message: 'Required', type: 'validation' as const },
      };
      const b = {
        name: { message: 'Too short', type: 'validation' as const },
      };

      const result = mergeErrors(a, b);

      expect(result).toEqual({
        name: { message: 'Too short', type: 'validation' },
      });
    });
  });

  describe('clearErrorsAtPaths', () => {
    it('should clear errors at specified paths', () => {
      const errors = {
        name: { message: 'Required', type: 'validation' as const },
        email: { message: 'Invalid', type: 'validation' as const },
        age: { message: 'Too young', type: 'validation' as const },
      };

      const result = clearErrorsAtPaths(errors, ['name', 'email']);

      expect(result).toEqual({
        age: { message: 'Too young', type: 'validation' },
      });
    });

    it('should handle non-existent paths', () => {
      const errors = {
        name: { message: 'Required', type: 'validation' as const },
      };

      const result = clearErrorsAtPaths(errors, ['email']);

      expect(result).toEqual({
        name: { message: 'Required', type: 'validation' },
      });
    });
  });

  describe('normalizeFieldError', () => {
    it('should convert string to FieldError', () => {
      expect(normalizeFieldError('Error message')).toEqual({
        message: 'Error message',
        type: 'manual',
      });
    });

    it('should return FieldError as-is', () => {
      const error: FieldError = { message: 'Error', type: 'validation' };
      expect(normalizeFieldError(error)).toEqual(error);
    });

    it('should return undefined for undefined input', () => {
      expect(normalizeFieldError(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(normalizeFieldError('')).toBeUndefined();
    });
  });
});
