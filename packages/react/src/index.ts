/**
 * @universal-form/react
 *
 * React bindings for Universal Form Adapter.
 * Provides hooks and components for building forms with any engine.
 */

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS FROM CORE
// ═══════════════════════════════════════════════════════════════

// Re-export commonly used types from core
export type {
  // Path types
  Path,
  PathValue,
  // Form types
  FieldError,
  FormErrors,
  FormState,
  FieldState,
  ValidationMode,
  FieldArrayMethods,
  UniversalFormReturn,
  // Schema types
  SchemaBridge,
  ValidationResult,
  ValidationError,
  FieldSchema,
  // Adapter types
  EngineAdapter,
  // Config types
  UniversalFormConfig,
} from '@universal-form/core';

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

export { useUniversalForm } from './useUniversalForm';
export {
  useField,
  type UseFieldReturn,
  type UseFieldOptions,
} from './useField';
export {
  useFieldArray,
  type UseFieldArrayReturn,
  type UseFieldArrayOptions,
} from './useFieldArray';
export { useWatch, type UseWatchOptions } from './useWatch';

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

export {
  FormProvider,
  useFormContext,
  useOptionalFormContext,
  type FormProviderProps,
} from './context';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

export {
  Form,
  Field,
  FieldArray,
  type FormProps,
  type FieldProps,
  type FieldArrayProps,
  type FieldRenderFunction,
  type FieldArrayRenderFunction,
} from './components';
