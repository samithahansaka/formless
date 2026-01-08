import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { useForm } from '@tanstack/react-form';
import type { DeepKeys, ValidationCause } from '@tanstack/form-core';
import type {
  EngineAdapter,
  FormState,
  FieldError,
  FieldState,
  FieldRegisterProps,
  FieldArrayMethods,
  SchemaBridge,
  ValidationMode,
} from '@samithahansaka/formless-core';
import {
  getByPath,
  generateId,
  normalizeFieldError,
} from '@samithahansaka/formless-core';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for useTanStackAdapter hook
 */
export interface UseTanStackAdapterConfig<T extends Record<string, unknown>> {
  /** Default form values */
  defaultValues: T;
  /** Schema bridge for validation */
  schema?: SchemaBridge<unknown, T>;
  /** Validation mode */
  mode?: ValidationMode;
  /** Debounce time for async validation */
  asyncDebounceMs?: number;
}

/**
 * Internal field metadata tracked by the adapter
 */
interface FieldMeta {
  isTouched: boolean;
  isDirty: boolean;
  errors: string[];
}

/**
 * Internal form state managed by the adapter
 */
interface AdapterState {
  fieldMeta: Record<string, FieldMeta>;
  isSubmitting: boolean;
  formErrors: string[];
}

/**
 * TanStack form engine type for our adapter
 * We use a simple wrapper to avoid complex TanStack generics
 */
export interface TanStackHookEngine<T extends Record<string, unknown>> {
  /** Get current form values */
  getValues: () => T;
  /** Set a field value */
  setFieldValue: (path: string, value: unknown) => void;
  /** Validate a specific field */
  validateField: (path: string, trigger: ValidationCause) => Promise<unknown[]>;
  /** Validate all fields */
  validateAllFields: (trigger: ValidationCause) => Promise<unknown[]>;
  /** Reset the form */
  reset: (values?: T) => void;
  /** Check if form is valid */
  isValid: () => boolean;
  /** Check if form is validating */
  isValidating: () => boolean;
  /** Check if form is dirty */
  isDirty: () => boolean;
  /** Get submission attempts count */
  getSubmissionAttempts: () => number;
  /** Subscribe to value changes */
  subscribe: (callback: () => void) => () => void;
  /** Internal: adapter state reference */
  _adapterState: React.MutableRefObject<AdapterState>;
  /** Internal: notify adapter state change */
  _notifyStateChange: () => void;
}

/**
 * Return type of useTanStackAdapter
 */
export interface UseTanStackAdapterReturn<T extends Record<string, unknown>> {
  /** The adapter instance for useUniversalForm */
  adapter: EngineAdapter<TanStackHookEngine<T>>;
  /** The native TanStack form instance for direct access */
  form: TanStackHookEngine<T>;
}

// ============================================================================
// Utilities
// ============================================================================

function createValidators<T extends Record<string, unknown>>(
  mode: ValidationMode,
  schema?: SchemaBridge<unknown, T>
) {
  if (!schema) return undefined;

  const validate = ({ value }: { value: T }) => {
    const result = schema.validate(value);
    if (!result.success && result.errors?.length) {
      return {
        fields: Object.fromEntries(
          result.errors.map(e => [e.path, e.message])
        ) as Record<DeepKeys<T>, string>,
      };
    }
    return undefined;
  };

  const validators: Record<string, typeof validate> = {};

  if (mode === 'onChange' || mode === 'all') {
    validators.onChange = validate;
  }
  if (mode === 'onBlur' || mode === 'onTouched' || mode === 'all') {
    validators.onBlur = validate;
  }
  validators.onSubmit = validate;

  return validators;
}

function createDefaultFieldMeta(): FieldMeta {
  return {
    isTouched: false,
    isDirty: false,
    errors: [],
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * React hook that creates a TanStack Form adapter using the native useForm hook
 *
 * This provides the best React integration by using TanStack's own React bindings,
 * while still providing compatibility with the Universal Form Adapter interface.
 *
 * @example
 * ```tsx
 * import { useUniversalForm } from '@samithahansaka/formless-react';
 * import { useTanStackAdapter } from '@samithahansaka/formless-tanstack-form';
 * import { zodBridge } from '@samithahansaka/formless-zod';
 *
 * function MyForm() {
 *   const { adapter, form: tanstackForm } = useTanStackAdapter({
 *     defaultValues: { name: '', email: '' },
 *     schema: zodBridge(mySchema),
 *     mode: 'onBlur',
 *   });
 *
 *   const form = useUniversalForm({ adapter });
 *
 *   // You can also use tanstackForm directly for TanStack-specific features
 *   return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
 * }
 * ```
 */
export function useTanStackAdapter<T extends Record<string, unknown>>(
  config: UseTanStackAdapterConfig<T>
): UseTanStackAdapterReturn<T> {
  const { defaultValues, schema, mode = 'onSubmit', asyncDebounceMs } = config;

  // Store stable references
  const defaultValuesRef = useRef(defaultValues);
  const modeRef = useRef(mode);
  const fieldIdsRef = useRef(new Map<string, Map<number, string>>());

  // Adapter state management (for touched, dirty, errors that we track ourselves)
  const adapterStateRef = useRef<AdapterState>({
    fieldMeta: {},
    isSubmitting: false,
    formErrors: [],
  });

  // State change notification for subscribers
  const [, forceUpdate] = useState({});
  const subscribersRef = useRef<Set<() => void>>(new Set());

  const notifyStateChange = useCallback(() => {
    forceUpdate({});
    subscribersRef.current.forEach(cb => cb());
  }, []);

  // Create the native TanStack form
  // We use 'as never' to avoid complex generic signature issues with v1
  const nativeForm = useForm({
    defaultValues,
    asyncDebounceMs,
    validators: createValidators(mode, schema) as never,
  } as never);

  // Use useSyncExternalStore to subscribe to TanStack form state changes
  const formState = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => nativeForm.store.subscribe(onStoreChange),
      [nativeForm.store]
    ),
    () => nativeForm.state,
    () => nativeForm.state
  );

  // Sync errors from TanStack form to our adapter state
  const syncErrorsFromForm = useCallback(() => {
    const fieldMeta = formState.fieldMeta as Record<
      string,
      { errors?: string[]; isTouched?: boolean; isDirty?: boolean }
    >;

    for (const [path, meta] of Object.entries(fieldMeta)) {
      if (!adapterStateRef.current.fieldMeta[path]) {
        adapterStateRef.current.fieldMeta[path] = createDefaultFieldMeta();
      }
      if (meta?.errors?.length) {
        adapterStateRef.current.fieldMeta[path].errors = [...meta.errors];
      }
      if (meta?.isTouched) {
        adapterStateRef.current.fieldMeta[path].isTouched = true;
      }
      if (meta?.isDirty) {
        adapterStateRef.current.fieldMeta[path].isDirty = true;
      }
    }
  }, [formState.fieldMeta]);

  // Create engine wrapper around the native form
  const engine = useMemo<TanStackHookEngine<T>>(
    () => ({
      getValues: () => formState.values as T,
      setFieldValue: (path: string, value: unknown) => {
        nativeForm.setFieldValue(path as never, value as never);
      },
      validateField: (path: string, trigger: ValidationCause) => {
        return nativeForm.validateField(path as never, trigger) as Promise<
          unknown[]
        >;
      },
      validateAllFields: (trigger: ValidationCause) => {
        return nativeForm.validateAllFields(trigger) as Promise<unknown[]>;
      },
      reset: (values?: T) => {
        nativeForm.reset(values ?? defaultValuesRef.current);
      },
      isValid: () => formState.isValid,
      isValidating: () => formState.isValidating,
      isDirty: () => formState.isDirty,
      getSubmissionAttempts: () => formState.submissionAttempts,
      subscribe: (callback: () => void) => {
        subscribersRef.current.add(callback);
        const unsubForm = nativeForm.store.subscribe(callback);
        return () => {
          subscribersRef.current.delete(callback);
          unsubForm();
        };
      },
      _adapterState: adapterStateRef,
      _notifyStateChange: notifyStateChange,
    }),
    [formState, nativeForm, notifyStateChange]
  );

  // Create adapter that wraps the engine
  const adapter = useMemo<EngineAdapter<TanStackHookEngine<T>>>(() => {
    const fieldIds = fieldIdsRef.current;

    return {
      name: 'tanstack-form-hook',
      version: '1.x',

      createForm: () => engine,
      destroyForm: () => {
        fieldIds.clear();
      },

      getState: <U extends Record<string, unknown>>(): FormState<U> => {
        syncErrorsFromForm();

        const touched: Record<string, boolean> = {};
        const dirty: Record<string, boolean> = {};
        const errors: Record<string, FieldError> = {};

        for (const [path, meta] of Object.entries(
          adapterStateRef.current.fieldMeta
        )) {
          if (meta.isTouched) touched[path] = true;
          if (meta.isDirty) dirty[path] = true;
          if (meta.errors.length) {
            errors[path] = { message: meta.errors[0], type: 'validation' };
          }
        }

        return {
          values: engine.getValues() as unknown as U,
          errors: errors as FormState<U>['errors'],
          touched: touched as FormState<U>['touched'],
          dirty: dirty as FormState<U>['dirty'],
          isSubmitting: adapterStateRef.current.isSubmitting,
          isValidating: engine.isValidating(),
          isValid: engine.isValid(),
          isDirty: engine.isDirty(),
          submitCount: engine.getSubmissionAttempts(),
        };
      },

      getValue: (_engine, path) => {
        return getByPath(engine.getValues() as Record<string, unknown>, path);
      },

      getValues: <U extends Record<string, unknown>>() =>
        engine.getValues() as unknown as U,

      getError: (_engine, path) => {
        syncErrorsFromForm();
        const meta = adapterStateRef.current.fieldMeta[path];
        return meta?.errors.length
          ? { message: meta.errors[0], type: 'validation' }
          : undefined;
      },

      getErrors: () => {
        syncErrorsFromForm();
        const errors: Record<string, FieldError> = {};
        for (const [path, meta] of Object.entries(
          adapterStateRef.current.fieldMeta
        )) {
          if (meta.errors.length) {
            errors[path] = { message: meta.errors[0], type: 'validation' };
          }
        }
        return errors;
      },

      getFieldState: (_engine, path): FieldState => {
        syncErrorsFromForm();
        const meta =
          adapterStateRef.current.fieldMeta[path] || createDefaultFieldMeta();
        const hasError = meta.errors.length > 0;

        return {
          isTouched: meta.isTouched,
          isDirty: meta.isDirty,
          error: hasError
            ? { message: meta.errors[0], type: 'validation' }
            : undefined,
          isInvalid: hasError,
        };
      },

      setValue: (_engine, path, value, options) => {
        engine.setFieldValue(path, value);

        if (options?.shouldDirty !== false) {
          if (!adapterStateRef.current.fieldMeta[path]) {
            adapterStateRef.current.fieldMeta[path] = createDefaultFieldMeta();
          }
          adapterStateRef.current.fieldMeta[path].isDirty = true;
        }

        if (options?.shouldValidate) {
          engine.validateField(path, 'change');
        }

        notifyStateChange();
      },

      setValues: <U extends Record<string, unknown>>(
        _engine: TanStackHookEngine<T>,
        values: Partial<U>,
        options?: { shouldValidate?: boolean }
      ) => {
        for (const [key, value] of Object.entries(values)) {
          engine.setFieldValue(key, value);
        }
        if (options?.shouldValidate) {
          engine.validateAllFields('change');
        }
        notifyStateChange();
      },

      setError: (_engine, path, error) => {
        const normalized = normalizeFieldError(error);
        if (!normalized?.message) return;

        if (!adapterStateRef.current.fieldMeta[path]) {
          adapterStateRef.current.fieldMeta[path] = createDefaultFieldMeta();
        }
        adapterStateRef.current.fieldMeta[path].errors = [normalized.message];
        notifyStateChange();
      },

      clearErrors: (_engine, paths) => {
        const keys = paths || Object.keys(adapterStateRef.current.fieldMeta);
        for (const key of keys) {
          if (adapterStateRef.current.fieldMeta[key]) {
            adapterStateRef.current.fieldMeta[key].errors = [];
          }
        }
        adapterStateRef.current.formErrors = [];
        notifyStateChange();
      },

      register: (_engine, path): FieldRegisterProps => ({
        name: path,
        ref: () => {},
        onBlur: () => {
          if (!adapterStateRef.current.fieldMeta[path]) {
            adapterStateRef.current.fieldMeta[path] = createDefaultFieldMeta();
          }
          adapterStateRef.current.fieldMeta[path].isTouched = true;

          if (
            modeRef.current === 'onBlur' ||
            modeRef.current === 'onTouched' ||
            modeRef.current === 'all'
          ) {
            engine.validateField(path, 'blur');
          }
          notifyStateChange();
        },
        onChange: (event: unknown) => {
          let value: unknown;
          if (event && typeof event === 'object' && 'target' in event) {
            const target = event.target as HTMLInputElement;
            value = target.type === 'checkbox' ? target.checked : target.value;
          } else {
            value = event;
          }

          engine.setFieldValue(path, value);

          if (!adapterStateRef.current.fieldMeta[path]) {
            adapterStateRef.current.fieldMeta[path] = createDefaultFieldMeta();
          }
          adapterStateRef.current.fieldMeta[path].isDirty = true;

          if (modeRef.current === 'onChange' || modeRef.current === 'all') {
            engine.validateField(path, 'change');
          }
          notifyStateChange();
        },
      }),

      unregister: (_engine, path) => {
        delete adapterStateRef.current.fieldMeta[path];
        notifyStateChange();
      },

      reset: <U extends Record<string, unknown>>(
        _engine: TanStackHookEngine<T>,
        values?: Partial<U>,
        options?: { keepErrors?: boolean }
      ) => {
        const resetValues = values
          ? { ...defaultValuesRef.current, ...values }
          : defaultValuesRef.current;

        engine.reset(resetValues as T);

        if (!options?.keepErrors) {
          for (const key of Object.keys(adapterStateRef.current.fieldMeta)) {
            adapterStateRef.current.fieldMeta[key].errors = [];
          }
          adapterStateRef.current.formErrors = [];
        }

        // Reset touched/dirty state
        for (const key of Object.keys(adapterStateRef.current.fieldMeta)) {
          adapterStateRef.current.fieldMeta[key].isTouched = false;
          adapterStateRef.current.fieldMeta[key].isDirty = false;
        }

        fieldIds.clear();
        notifyStateChange();
      },

      trigger: async (_engine, paths) => {
        if (paths?.length) {
          const results = await Promise.all(
            paths.map(p => engine.validateField(p, 'submit'))
          );
          syncErrorsFromForm();
          return results.every(r => !r || (Array.isArray(r) && r.length === 0));
        }
        await engine.validateAllFields('submit');
        syncErrorsFromForm();
        return engine.isValid();
      },

      handleSubmit: <U extends Record<string, unknown>>(
        _engine: TanStackHookEngine<T>,
        onValid: (data: U) => void | Promise<void>,
        onInvalid?: (errors: Record<string, FieldError>) => void
      ) => {
        return async (event?: { preventDefault?: () => void }) => {
          event?.preventDefault?.();

          adapterStateRef.current.isSubmitting = true;
          notifyStateChange();

          try {
            await engine.validateAllFields('submit');
            syncErrorsFromForm();

            if (engine.isValid()) {
              await onValid(engine.getValues() as unknown as U);
            } else if (onInvalid) {
              const errors: Record<string, FieldError> = {};
              for (const [path, meta] of Object.entries(
                adapterStateRef.current.fieldMeta
              )) {
                if (meta.errors.length) {
                  errors[path] = {
                    message: meta.errors[0],
                    type: 'validation',
                  };
                }
              }
              onInvalid(errors);
            }
          } catch {
            if (onInvalid) {
              const errors: Record<string, FieldError> = {};
              for (const [path, meta] of Object.entries(
                adapterStateRef.current.fieldMeta
              )) {
                if (meta.errors.length) {
                  errors[path] = {
                    message: meta.errors[0],
                    type: 'validation',
                  };
                }
              }
              onInvalid(errors);
            }
          } finally {
            adapterStateRef.current.isSubmitting = false;
            notifyStateChange();
          }
        };
      },

      watch: (_engine, paths, callback) => {
        return engine.subscribe(() => {
          const values = engine.getValues() as Record<string, unknown>;
          if (!paths) {
            callback(values);
          } else if (paths.length === 1) {
            callback(getByPath(values, paths[0]));
          } else {
            callback(
              Object.fromEntries(paths.map(p => [p, getByPath(values, p)]))
            );
          }
        });
      },

      subscribe: <U extends Record<string, unknown>>(
        _engine: TanStackHookEngine<T>,
        callback: (state: FormState<U>) => void
      ) => {
        return engine.subscribe(() => {
          callback(adapter.getState<U>(engine));
        });
      },

      getFieldArray: <TFieldValue>(
        _engine: TanStackHookEngine<T>,
        path: string
      ): FieldArrayMethods<TFieldValue> => {
        if (!fieldIds.has(path)) {
          fieldIds.set(path, new Map());
        }
        const idMap = fieldIds.get(path)!;

        const getArray = (): TFieldValue[] => {
          const arr = getByPath(
            engine.getValues() as Record<string, unknown>,
            path
          );
          return Array.isArray(arr) ? arr : [];
        };

        const currentArray = getArray();
        currentArray.forEach((_, i) => {
          if (!idMap.has(i)) idMap.set(i, generateId());
        });

        const fields = currentArray.map((item, index) => ({
          ...(item && typeof item === 'object' ? item : {}),
          id: idMap.get(index) ?? generateId(),
        })) as Array<TFieldValue & { id: string }>;

        const setArray = (newArray: TFieldValue[]) => {
          engine.setFieldValue(path, newArray);
          engine.validateField(path, 'change');
          notifyStateChange();
        };

        return {
          fields,

          append(value: TFieldValue) {
            const arr = getArray();
            const newArr = [...arr, value];
            idMap.set(newArr.length - 1, generateId());
            setArray(newArr);
          },

          prepend(value: TFieldValue) {
            const arr = getArray();
            const entries = [...idMap.entries()].sort((a, b) => b[0] - a[0]);
            idMap.clear();
            entries.forEach(([idx, id]) => idMap.set(idx + 1, id));
            idMap.set(0, generateId());
            setArray([value, ...arr]);
          },

          insert(index: number, value: TFieldValue) {
            const arr = getArray();
            const newArr = [...arr];
            newArr.splice(index, 0, value);
            const oldEntries = [...idMap.entries()];
            idMap.clear();
            oldEntries.forEach(([idx, id]) =>
              idMap.set(idx >= index ? idx + 1 : idx, id)
            );
            idMap.set(index, generateId());
            setArray(newArr);
          },

          remove(index: number | number[]) {
            const arr = getArray();
            const indices = new Set(Array.isArray(index) ? index : [index]);
            const newArr = arr.filter((_, i) => !indices.has(i));
            const remaining = [...idMap.entries()]
              .filter(([i]) => !indices.has(i))
              .sort((a, b) => a[0] - b[0]);
            idMap.clear();
            remaining.forEach(([, id], newIdx) => idMap.set(newIdx, id));
            setArray(newArr);
          },

          swap(indexA: number, indexB: number) {
            const arr = getArray();
            const newArr = [...arr];
            [newArr[indexA], newArr[indexB]] = [newArr[indexB], newArr[indexA]];
            const idA = idMap.get(indexA);
            const idB = idMap.get(indexB);
            if (idA !== undefined) idMap.set(indexB, idA);
            if (idB !== undefined) idMap.set(indexA, idB);
            setArray(newArr);
          },

          move(from: number, to: number) {
            const arr = getArray();
            const newArr = [...arr];
            const [item] = newArr.splice(from, 1);
            newArr.splice(to, 0, item);
            const movedId = idMap.get(from) ?? generateId();
            const entries = [...idMap.entries()].sort((a, b) => a[0] - b[0]);
            idMap.clear();
            let newIdx = 0;
            for (const [idx, id] of entries) {
              if (idx === from) continue;
              if (newIdx === to) idMap.set(newIdx++, movedId);
              idMap.set(newIdx++, id);
            }
            if (to >= newIdx) idMap.set(to, movedId);
            setArray(newArr);
          },

          update(index: number, value: TFieldValue) {
            const arr = getArray();
            const newArr = [...arr];
            newArr[index] = value;
            setArray(newArr);
          },

          replace(newValues: TFieldValue[]) {
            idMap.clear();
            newValues.forEach((_, i) => idMap.set(i, generateId()));
            setArray(newValues);
          },
        };
      },
    };
  }, [engine, syncErrorsFromForm, notifyStateChange]);

  return { adapter, form: engine };
}
