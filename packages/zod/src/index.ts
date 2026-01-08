/**
 * @samithahansaka/formless-zod
 *
 * Zod schema bridge for Universal Form Adapter.
 * Provides type-safe validation using Zod schemas.
 */

export { zodBridge } from './zodBridge';
export type { InferZodSchema, InferZodBridge } from './zodBridge';

// Re-export useful types from core
export type {
  SchemaBridge,
  ValidationResult,
  ValidationError,
  FieldSchema,
  FieldType,
} from '@samithahansaka/formless-core';
