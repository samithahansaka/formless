/**
 * @samithahansaka/formless
 *
 * Universal form adapter for React - one API for React Hook Form, Formik, and TanStack Form.
 * This is a meta-package that re-exports all formless packages for convenience.
 *
 * @example
 * ```tsx
 * import {
 *   useUniversalForm,
 *   Field,
 *   rhfAdapter,
 *   zodBridge,
 * } from '@samithahansaka/formless';
 *
 * const form = useUniversalForm({
 *   adapter: rhfAdapter(),
 *   schema: zodBridge(myZodSchema),
 *   defaultValues: { name: '', email: '' },
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE - Types and utilities
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  // Path types
  Path,
  PathValue,
  SetPathValue,
  ArrayElement,
  // Form types
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
  // Schema types
  ValidationResult,
  ValidationError,
  FieldSchema,
  FieldType,
  SchemaBridge,
  SchemaBridgeFactory,
  InferSchemaBridgeOutput,
  // Adapter types
  AdapterConfig,
  EngineAdapter,
  EngineAdapterFactory,
  InferEngineType,
  // Config types
  UniversalFormConfig,
  ResolvedFormConfig,
} from '@samithahansaka/formless-core';

// Utilities
export {
  DEFAULT_CONFIG,
  // Path utilities
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
  // Error utilities
  validationErrorsToFormErrors,
  formErrorsToValidationErrors,
  getFieldError,
  hasErrors,
  countErrors,
  getErrorPaths,
  mergeErrors,
  clearErrorsAtPaths,
  normalizeFieldError,
  // ID utilities
  generateId,
  resetIdCounter,
  generateFieldId,
  // Comparison utilities
  deepEqual,
  shallowEqual,
  getDirtyPaths,
  getDirtyFields,
} from '@samithahansaka/formless-core';

// ═══════════════════════════════════════════════════════════════════════════
// REACT - Hooks and components
// ═══════════════════════════════════════════════════════════════════════════

// Hooks
export {
  useUniversalForm,
  useField,
  useFieldArray,
  useWatch,
} from '@samithahansaka/formless-react';

export type {
  UseFieldReturn,
  UseFieldOptions,
  UseFieldArrayReturn,
  UseFieldArrayOptions,
  UseWatchOptions,
} from '@samithahansaka/formless-react';

// Context
export {
  FormProvider,
  useFormContext,
  useOptionalFormContext,
} from '@samithahansaka/formless-react';

export type { FormProviderProps } from '@samithahansaka/formless-react';

// Components
export { Form, Field, FieldArray } from '@samithahansaka/formless-react';

export type {
  FormProps,
  FieldProps,
  FieldArrayProps,
  FieldRenderFunction,
  FieldArrayRenderFunction,
} from '@samithahansaka/formless-react';

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════

// React Hook Form adapter
export {
  rhfAdapter,
  convertRHFErrors,
  useRHFAdapter,
} from '@samithahansaka/formless-react-hook-form';
export type {
  RHFEngine,
  RHFAdapterOptions,
  UseRHFAdapterConfig,
  UseRHFAdapterReturn,
} from '@samithahansaka/formless-react-hook-form';

// Formik adapter
export {
  formikAdapter,
  convertFormikErrors,
  useFormikAdapter,
} from '@samithahansaka/formless-formik';
export type {
  FormikEngine,
  FormikAdapterOptions,
  UseFormikAdapterConfig,
  UseFormikAdapterReturn,
} from '@samithahansaka/formless-formik';

// TanStack Form adapter
export {
  tanstackAdapter,
  useTanStackAdapter,
} from '@samithahansaka/formless-tanstack-form';
export type {
  TanStackEngine,
  TanStackAdapterOptions,
  UseTanStackAdapterConfig,
  UseTanStackAdapterReturn,
} from '@samithahansaka/formless-tanstack-form';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA BRIDGES
// ═══════════════════════════════════════════════════════════════════════════

// Zod bridge
export { zodBridge } from '@samithahansaka/formless-zod';
export type {
  InferZodSchema,
  InferZodBridge,
} from '@samithahansaka/formless-zod';
