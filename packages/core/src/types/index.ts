// Path utilities
export type { Path, PathValue, SetPathValue, ArrayElement } from './path';

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
} from './form';

// Schema types
export type {
  ValidationResult,
  ValidationError,
  FieldSchema,
  FieldType,
  SchemaBridge,
  SchemaBridgeFactory,
  InferSchemaBridgeOutput,
} from './schema';

// Adapter types
export type {
  AdapterConfig,
  EngineAdapter,
  EngineAdapterFactory,
  InferEngineType,
} from './adapter';

// Config types
export type { UniversalFormConfig, ResolvedFormConfig } from './config';

export { DEFAULT_CONFIG } from './config';
