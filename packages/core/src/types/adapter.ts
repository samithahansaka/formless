import type {
  FormState,
  FieldError,
  FieldRegisterProps,
  FieldState,
  FieldArrayMethods,
  ValidationMode,
} from './form';
import type { SchemaBridge, ValidationResult } from './schema';

/**
 * Configuration passed to engine adapters
 */
export interface AdapterConfig<T extends Record<string, unknown>> {
  /** Default values for the form */
  defaultValues: T;
  /** Schema bridge for validation */
  schema?: SchemaBridge<unknown, T>;
  /** When to trigger validation */
  mode: ValidationMode;
  /** When to re-validate after initial validation */
  reValidateMode: Exclude<ValidationMode, 'onTouched' | 'all'>;
  /** Whether to validate on mount */
  shouldValidateOnMount?: boolean;
  /** Custom resolver function (bypasses schema) */
  resolver?: (values: T) => Promise<ValidationResult<T>>;
}

/**
 * Engine adapter interface - connects form libraries to UFA
 *
 * Each supported form library (React Hook Form, Formik, TanStack Form)
 * implements this interface to provide a consistent API.
 *
 * @template TEngine - The underlying form engine instance type
 */
export interface EngineAdapter<TEngine = unknown> {
  /** Unique identifier for the adapter */
  readonly name: string;

  /** Version of the underlying library */
  readonly version?: string;

  // ═══════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════

  /**
   * Create and initialize the form engine
   * @param config - Configuration for the form
   * @returns The engine instance
   */
  createForm: <T extends Record<string, unknown>>(
    config: AdapterConfig<T>
  ) => TEngine;

  /**
   * Destroy the form engine and cleanup
   * @param engine - The engine instance to destroy
   */
  destroyForm: (engine: TEngine) => void;

  // ═══════════════════════════════════════════════════════
  // STATE ACCESS
  // ═══════════════════════════════════════════════════════

  /**
   * Get current form state
   * @param engine - The engine instance
   * @returns Current form state
   */
  getState: <T extends Record<string, unknown>>(
    engine: TEngine
  ) => FormState<T>;

  /**
   * Get value at a specific path
   * @param engine - The engine instance
   * @param path - Dot-notation path to the field
   * @returns Value at the path
   */
  getValue: (engine: TEngine, path: string) => unknown;

  /**
   * Get all values
   * @param engine - The engine instance
   * @returns All form values
   */
  getValues: <T extends Record<string, unknown>>(engine: TEngine) => T;

  /**
   * Get error at a specific path
   * @param engine - The engine instance
   * @param path - Dot-notation path to the field
   * @returns Error at the path, if any
   */
  getError: (engine: TEngine, path: string) => FieldError | undefined;

  /**
   * Get all errors
   * @param engine - The engine instance
   * @returns All form errors
   */
  getErrors: (engine: TEngine) => Record<string, FieldError>;

  /**
   * Get field state (touched, dirty, error)
   * @param engine - The engine instance
   * @param path - Dot-notation path to the field
   * @returns Field state
   */
  getFieldState: (engine: TEngine, path: string) => FieldState;

  // ═══════════════════════════════════════════════════════
  // STATE MUTATIONS
  // ═══════════════════════════════════════════════════════

  /**
   * Set value at a specific path
   * @param engine - The engine instance
   * @param path - Dot-notation path to the field
   * @param value - New value
   * @param options - Set options
   */
  setValue: (
    engine: TEngine,
    path: string,
    value: unknown,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean }
  ) => void;

  /**
   * Set multiple values at once
   * @param engine - The engine instance
   * @param values - Partial values to set
   * @param options - Set options
   */
  setValues: <T extends Record<string, unknown>>(
    engine: TEngine,
    values: Partial<T>,
    options?: { shouldValidate?: boolean }
  ) => void;

  /**
   * Set error at a specific path
   * @param engine - The engine instance
   * @param path - Dot-notation path to the field
   * @param error - Error to set
   */
  setError: (engine: TEngine, path: string, error: FieldError | string) => void;

  /**
   * Clear errors
   * @param engine - The engine instance
   * @param paths - Paths to clear, or undefined for all
   */
  clearErrors: (engine: TEngine, paths?: string[]) => void;

  // ═══════════════════════════════════════════════════════
  // FIELD REGISTRATION
  // ═══════════════════════════════════════════════════════

  /**
   * Register a field with the form
   * @param engine - The engine instance
   * @param path - Dot-notation path to the field
   * @returns Props to spread on the input
   */
  register: (engine: TEngine, path: string) => FieldRegisterProps;

  /**
   * Unregister a field from the form
   * @param engine - The engine instance
   * @param path - Dot-notation path to the field
   */
  unregister: (engine: TEngine, path: string) => void;

  // ═══════════════════════════════════════════════════════
  // FORM OPERATIONS
  // ═══════════════════════════════════════════════════════

  /**
   * Reset the form
   * @param engine - The engine instance
   * @param values - Optional new default values
   * @param options - Reset options
   */
  reset: <T extends Record<string, unknown>>(
    engine: TEngine,
    values?: Partial<T>,
    options?: { keepErrors?: boolean }
  ) => void;

  /**
   * Trigger validation
   * @param engine - The engine instance
   * @param paths - Paths to validate, or undefined for all
   * @returns Promise resolving to whether validation passed
   */
  trigger: (engine: TEngine, paths?: string[]) => Promise<boolean>;

  /**
   * Handle form submission
   * @param engine - The engine instance
   * @param onValid - Callback for valid submission
   * @param onInvalid - Callback for invalid submission
   * @returns Event handler function
   */
  handleSubmit: <T extends Record<string, unknown>>(
    engine: TEngine,
    onValid: (data: T) => void | Promise<void>,
    onInvalid?: (errors: Record<string, FieldError>) => void
  ) => (event?: { preventDefault?: () => void }) => Promise<void>;

  // ═══════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════

  /**
   * Watch for value changes
   * @param engine - The engine instance
   * @param paths - Paths to watch, or undefined for all
   * @param callback - Callback when values change
   * @returns Unsubscribe function
   */
  watch: (
    engine: TEngine,
    paths: string[] | undefined,
    callback: (values: unknown) => void
  ) => () => void;

  /**
   * Subscribe to form state changes
   * @param engine - The engine instance
   * @param callback - Callback when state changes
   * @returns Unsubscribe function
   */
  subscribe: <T extends Record<string, unknown>>(
    engine: TEngine,
    callback: (state: FormState<T>) => void
  ) => () => void;

  // ═══════════════════════════════════════════════════════
  // FIELD ARRAYS
  // ═══════════════════════════════════════════════════════

  /**
   * Get field array methods
   * @param engine - The engine instance
   * @param path - Path to the array field
   * @returns Field array methods
   */
  getFieldArray: <TFieldValue>(
    engine: TEngine,
    path: string
  ) => FieldArrayMethods<TFieldValue>;
}

/**
 * Factory function type for creating engine adapters
 */
export type EngineAdapterFactory<TEngine = unknown, TOptions = unknown> = (
  options?: TOptions
) => EngineAdapter<TEngine>;

/**
 * Type helper to extract engine type from adapter
 */
export type InferEngineType<T> = T extends EngineAdapter<infer E> ? E : never;
