import type { ValidationMode } from './form';
import type { SchemaBridge, InferSchemaBridgeOutput } from './schema';
import type { EngineAdapter } from './adapter';

/**
 * Configuration for useUniversalForm hook
 */
export interface UniversalFormConfig<
  TSchema extends SchemaBridge<unknown, Record<string, unknown>>,
  TAdapter extends EngineAdapter,
> {
  /**
   * Schema bridge for validation and type inference
   * Created using zodBridge(), yupBridge(), etc.
   */
  schema: TSchema;

  /**
   * Engine adapter for the underlying form library
   * Created using rhfAdapter(), formikAdapter(), etc.
   */
  adapter: TAdapter;

  /**
   * Default/initial values for the form
   * If not provided, will use defaults from schema
   */
  defaultValues?: Partial<InferSchemaBridgeOutput<TSchema>>;

  /**
   * When to trigger validation
   * @default 'onSubmit'
   */
  mode?: ValidationMode;

  /**
   * When to re-validate after initial validation
   * @default 'onChange'
   */
  reValidateMode?: Exclude<ValidationMode, 'onTouched' | 'all'>;

  /**
   * Whether to validate on mount
   * @default false
   */
  shouldValidateOnMount?: boolean;

  /**
   * Whether to reset the form when default values change
   * @default false
   */
  resetOnDefaultValuesChange?: boolean;

  /**
   * Criteria mode for validation
   * - 'firstError': Stop at first error
   * - 'all': Collect all errors
   * @default 'firstError'
   */
  criteriaMode?: 'firstError' | 'all';

  /**
   * Whether to focus the first field with an error on submit
   * @default true
   */
  shouldFocusError?: boolean;

  /**
   * Delay for debouncing validation (ms)
   * @default 0
   */
  validationDelay?: number;
}

/**
 * Simplified config without generics for runtime use
 */
export interface ResolvedFormConfig<T extends Record<string, unknown>> {
  defaultValues: T;
  mode: ValidationMode;
  reValidateMode: Exclude<ValidationMode, 'onTouched' | 'all'>;
  shouldValidateOnMount: boolean;
  resetOnDefaultValuesChange: boolean;
  criteriaMode: 'firstError' | 'all';
  shouldFocusError: boolean;
  validationDelay: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<
  ResolvedFormConfig<Record<string, unknown>>,
  'defaultValues'
> = {
  mode: 'onSubmit',
  reValidateMode: 'onChange',
  shouldValidateOnMount: false,
  resetOnDefaultValuesChange: false,
  criteriaMode: 'firstError',
  shouldFocusError: true,
  validationDelay: 0,
};
