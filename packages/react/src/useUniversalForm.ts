import { useRef, useMemo, useCallback, useSyncExternalStore } from 'react';
import type {
  UniversalFormReturn,
  SchemaBridge,
  EngineAdapter,
  FormState,
  FieldError,
  FieldState,
  FieldRegisterProps,
  FieldArrayMethods,
  FormErrors,
} from '@universal-form/core';
import { normalizeFieldError, getByPath } from '@universal-form/core';

/**
 * Configuration for useUniversalForm
 */
export interface UseUniversalFormConfig<T extends Record<string, unknown>> {
  schema: SchemaBridge<unknown, T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: EngineAdapter<any>;
  defaultValues?: Partial<T>;
  mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
  reValidateMode?: 'onSubmit' | 'onBlur' | 'onChange';
  shouldValidateOnMount?: boolean;
}

/**
 * Main hook for creating a universal form instance
 */
export function useUniversalForm<T extends Record<string, unknown>>(
  config: UseUniversalFormConfig<T>
): UniversalFormReturn<T> {
  const { schema, adapter } = config;

  // Resolve config with defaults
  const resolvedConfig = useMemo(
    () => ({
      mode: config.mode ?? 'onSubmit',
      reValidateMode: config.reValidateMode ?? 'onChange',
      shouldValidateOnMount: config.shouldValidateOnMount ?? false,
    }),
    [config.mode, config.reValidateMode, config.shouldValidateOnMount]
  );

  // Get default values from config or schema
  const defaultValues = useMemo(() => {
    const schemaDefaults = schema.getDefaultValues();
    return {
      ...schemaDefaults,
      ...config.defaultValues,
    } as T;
  }, [schema, config.defaultValues]);

  // Create the engine instance (only once)
  const engineRef = useRef<unknown>(null);

  if (!engineRef.current) {
    engineRef.current = adapter.createForm({
      defaultValues: defaultValues as Record<string, unknown>,
      schema: schema as SchemaBridge<unknown, Record<string, unknown>>,
      mode: resolvedConfig.mode,
      reValidateMode: resolvedConfig.reValidateMode,
      shouldValidateOnMount: resolvedConfig.shouldValidateOnMount,
    });
  }

  const engine = engineRef.current;

  // Subscribe to state changes for React re-renders
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return adapter.subscribe(engine, onStoreChange);
    },
    [adapter, engine]
  );

  const getSnapshot = useCallback(() => {
    return adapter.getState<T>(engine);
  }, [adapter, engine]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Value operations
  const getValue = useCallback(
    (path: string): unknown => {
      return adapter.getValue(engine, path);
    },
    [adapter, engine]
  );

  const setValue = useCallback(
    (
      path: string,
      value: unknown,
      options?: { shouldValidate?: boolean; shouldDirty?: boolean }
    ) => {
      adapter.setValue(engine, path, value, options);
    },
    [adapter, engine]
  );

  const setValues = useCallback(
    (values: Partial<T>, options?: { shouldValidate?: boolean }) => {
      adapter.setValues(engine, values, options);
    },
    [adapter, engine]
  );

  // Error operations
  const getError = useCallback(
    (path: string): FieldError | undefined => {
      return adapter.getError(engine, path);
    },
    [adapter, engine]
  );

  const setError = useCallback(
    (path: string, error: FieldError | string) => {
      const normalizedError = normalizeFieldError(error);
      if (normalizedError) {
        adapter.setError(engine, path, normalizedError);
      }
    },
    [adapter, engine]
  );

  const clearErrors = useCallback(
    (path?: string | string[]) => {
      const paths = path ? (Array.isArray(path) ? path : [path]) : undefined;
      adapter.clearErrors(engine, paths);
    },
    [adapter, engine]
  );

  // Field registration
  const register = useCallback(
    (path: string): FieldRegisterProps => {
      return adapter.register(engine, path);
    },
    [adapter, engine]
  );

  const getFieldState = useCallback(
    (path: string): FieldState => {
      return adapter.getFieldState(engine, path);
    },
    [adapter, engine]
  );

  // Form operations
  const reset = useCallback(
    (values?: Partial<T>, options?: { keepErrors?: boolean }) => {
      adapter.reset(engine, values, options);
    },
    [adapter, engine]
  );

  const trigger = useCallback(
    async (path?: string | string[]): Promise<boolean> => {
      const paths = path ? (Array.isArray(path) ? path : [path]) : undefined;
      return adapter.trigger(engine, paths);
    },
    [adapter, engine]
  );

  const handleSubmit = useCallback(
    (
      onValid: (data: T) => void | Promise<void>,
      onInvalid?: (errors: FormErrors<T>) => void
    ) => {
      return adapter.handleSubmit<T>(
        engine,
        onValid,
        onInvalid as ((errors: Record<string, FieldError>) => void) | undefined
      );
    },
    [adapter, engine]
  );

  // Watch
  const watch = useCallback(
    (pathOrPaths?: string | string[]) => {
      if (!pathOrPaths) {
        return state.values;
      }

      if (Array.isArray(pathOrPaths)) {
        const result: Record<string, unknown> = {};
        for (const p of pathOrPaths) {
          result[p] = getByPath(state.values, p);
        }
        return result;
      }

      return getByPath(state.values, pathOrPaths);
    },
    [state.values]
  );

  const subscribeToState = useCallback(
    (callback: (state: FormState<T>) => void) => {
      return adapter.subscribe(engine, callback);
    },
    [adapter, engine]
  );

  // Field arrays
  const getFieldArray = useCallback(
    <TItem>(path: string): FieldArrayMethods<TItem> => {
      return adapter.getFieldArray<TItem>(engine, path);
    },
    [adapter, engine]
  );

  // Build return object
  const form = useMemo<UniversalFormReturn<T>>(
    () => ({
      // State
      getState: () => state,
      values: state.values,
      errors: state.errors,
      isValid: state.isValid,
      isSubmitting: state.isSubmitting,
      isDirty: state.isDirty,

      // Value operations
      getValue: getValue as UniversalFormReturn<T>['getValue'],
      setValue: setValue as UniversalFormReturn<T>['setValue'],
      setValues,

      // Error operations
      getError: getError as UniversalFormReturn<T>['getError'],
      setError: setError as UniversalFormReturn<T>['setError'],
      clearErrors: clearErrors as UniversalFormReturn<T>['clearErrors'],

      // Field registration
      register: register as UniversalFormReturn<T>['register'],
      getFieldState: getFieldState as UniversalFormReturn<T>['getFieldState'],

      // Form operations
      reset,
      trigger: trigger as UniversalFormReturn<T>['trigger'],
      handleSubmit,

      // Subscriptions
      watch: watch as UniversalFormReturn<T>['watch'],
      subscribe: subscribeToState,

      // Field arrays
      getFieldArray: getFieldArray as UniversalFormReturn<T>['getFieldArray'],

      // Internal
      getEngine: () => engine,
      context: { form: null as unknown as UniversalFormReturn<T> },
    }),
    [
      state,
      getValue,
      setValue,
      setValues,
      getError,
      setError,
      clearErrors,
      register,
      getFieldState,
      reset,
      trigger,
      handleSubmit,
      watch,
      subscribeToState,
      getFieldArray,
      engine,
    ]
  );

  // Self-reference for context
  form.context.form = form;

  return form;
}
