/**
 * @samithahansaka/formless-core
 *
 * Core types and utilities for Universal Form Adapter.
 * This package contains no React dependencies and can be used
 * with any framework.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

// Path types
export type { Path, PathValue, SetPathValue, ArrayElement } from './types';

// Form types
export type {
  FieldError,
  FormErrors,
  FormTouched,
  FormDirty,
  ValidationMode,
  FormState,
  FieldState,
  FieldRegisterProps,
  FieldArrayMethods,
  UniversalFormReturn,
  UniversalFormContext,
} from './types';

// Schema types
export type {
  ValidationResult,
  ValidationError,
  FieldSchema,
  FieldType,
  SchemaBridge,
  SchemaBridgeFactory,
  InferSchemaBridgeOutput,
} from './types';

// Adapter types
export type {
  AdapterConfig,
  EngineAdapter,
  EngineAdapterFactory,
  InferEngineType,
} from './types';

// Config types
export type { UniversalFormConfig, ResolvedFormConfig } from './types';

export { DEFAULT_CONFIG } from './types';

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

// Path utilities
export {
  getByPath,
  setByPath,
  deleteByPath,
  hasPath,
  getAllPaths,
  parsePath,
  joinPath,
  getParentPath,
  getLastSegment,
  isArrayPath,
  getArrayInfo,
} from './utils';

// Error utilities
export {
  validationErrorsToFormErrors,
  formErrorsToValidationErrors,
  getFieldError,
  hasErrors,
  countErrors,
  getErrorPaths,
  mergeErrors,
  clearErrorsAtPaths,
  normalizeFieldError,
} from './utils';

// ID utilities
export { generateId, resetIdCounter, generateFieldId } from './utils';

// Comparison utilities
export {
  deepEqual,
  shallowEqual,
  getDirtyPaths,
  getDirtyFields,
} from './utils';
