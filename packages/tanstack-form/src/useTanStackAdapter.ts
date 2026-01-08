import { useMemo, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import type { ReactFormExtendedApi } from '@tanstack/react-form';
import type { DeepKeys } from '@tanstack/form-core';
import type {
  EngineAdapter,
  FormState,
  FieldError,
  FieldState,
  FieldRegisterProps,
  FieldArrayMethods,
  SchemaBridge,
  ValidationMode,
} from '@universal-form/core';
import {
  getByPath,
  generateId,
  normalizeFieldError,
} from '@universal-form/core';

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
 * Return type of useTanStackAdapter
 */
export interface UseTanStackAdapterReturn<T extends Record<string, unknown>> {
  /** The adapter instance for useUniversalForm */
  adapter: EngineAdapter<ReactFormExtendedApi<T>>;
  /** The native TanStack form instance for direct access */
  form: ReactFormExtendedApi<T>;
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

function extractErrors(
  fieldMeta: Record<string, { errors?: string[] }> | undefined
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};
  for (const [path, meta] of Object.entries(fieldMeta || {})) {
    if (meta?.errors?.length) {
      errors[path] = { message: meta.errors[0], type: 'validation' };
    }
  }
  return errors;
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
 * import { useUniversalForm } from '@universal-form/react';
 * import { useTanStackAdapter } from '@universal-form/tanstack-form';
 * import { zodBridge } from '@universal-form/zod';
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

  // Create the native TanStack form
  const form = useForm<T>({
    defaultValues,
    asyncDebounceMs,
    validators: createValidators(mode, schema) as never,
  });

  // Create adapter that wraps the form instance
  const adapter = useMemo<EngineAdapter<ReactFormExtendedApi<T>>>(() => {
    const fieldIds = fieldIdsRef.current;

    return {
      name: 'tanstack-form-hook',
      version: '0.x',

      createForm: () => form,
      destroyForm: () => {
        fieldIds.clear();
      },

      getState: <U extends Record<string, unknown>>(): FormState<U> => {
        const state = form.state;
        const touched: Record<string, boolean> = {};
        const dirty: Record<string, boolean> = {};

        for (const [path, meta] of Object.entries(state.fieldMeta || {})) {
          const fm = meta as { isTouched?: boolean; isDirty?: boolean };
          if (fm?.isTouched) touched[path] = true;
          if (fm?.isDirty) dirty[path] = true;
        }

        return {
          values: state.values as unknown as U,
          errors: extractErrors(
            state.fieldMeta as Record<string, { errors?: string[] }>
          ) as FormState<U>['errors'],
          touched: touched as FormState<U>['touched'],
          dirty: dirty as FormState<U>['dirty'],
          isSubmitting: state.isSubmitting,
          isValidating: state.isValidating,
          isValid: state.isValid,
          isDirty: state.isDirty,
          submitCount: state.submissionAttempts,
        };
      },

      getValue: (_engine, path) => {
        return getByPath(form.state.values as Record<string, unknown>, path);
      },

      getValues: <U extends Record<string, unknown>>() =>
        form.state.values as unknown as U,

      getError: (_engine, path) => {
        const meta = (
          form.state.fieldMeta as Record<string, { errors?: string[] }>
        )?.[path];
        return meta?.errors?.length
          ? { message: meta.errors[0], type: 'validation' }
          : undefined;
      },

      getErrors: () =>
        extractErrors(
          form.state.fieldMeta as Record<string, { errors?: string[] }>
        ),

      getFieldState: (_engine, path): FieldState => {
        const meta = (
          form.state.fieldMeta as Record<
            string,
            {
              errors?: string[];
              isTouched?: boolean;
              isDirty?: boolean;
            }
          >
        )?.[path];
        const hasError = Boolean(meta?.errors?.length);

        return {
          isTouched: meta?.isTouched ?? false,
          isDirty: meta?.isDirty ?? false,
          error: hasError
            ? { message: meta!.errors![0], type: 'validation' }
            : undefined,
          isInvalid: hasError,
        };
      },

      setValue: (_engine, path, value, options) => {
        form.setFieldValue(path as never, value as never, {
          dontUpdateMeta: options?.shouldDirty === false,
        });
        if (options?.shouldValidate) {
          form.validateField(path as never, 'change');
        }
      },

      setValues: <U extends Record<string, unknown>>(
        _engine: ReactFormExtendedApi<T>,
        values: Partial<U>,
        options?: { shouldValidate?: boolean }
      ) => {
        for (const [key, value] of Object.entries(values)) {
          form.setFieldValue(key as never, value as never);
        }
        if (options?.shouldValidate) {
          form.validateAllFields('change');
        }
      },

      setError: (_engine, path, error) => {
        const normalized = normalizeFieldError(error);
        if (!normalized?.message) return;

        form.store.setState(prev => {
          const currentMeta =
            (prev.fieldMeta as Record<string, object>)[path] || {};
          return {
            ...prev,
            fieldMeta: {
              ...prev.fieldMeta,
              [path]: {
                ...currentMeta,
                errors: [normalized.message],
              },
            },
          };
        });
      },

      clearErrors: (_engine, paths) => {
        form.store.setState(prev => {
          const newFieldMeta = { ...prev.fieldMeta } as Record<
            string,
            { errors?: string[] }
          >;
          const keys = paths || Object.keys(newFieldMeta);

          for (const key of keys) {
            if (newFieldMeta[key]) {
              newFieldMeta[key] = { ...newFieldMeta[key], errors: [] };
            }
          }

          return {
            ...prev,
            fieldMeta: newFieldMeta as typeof prev.fieldMeta,
            errors: [],
          };
        });
      },

      register: (_engine, path): FieldRegisterProps => ({
        name: path,
        ref: () => {},
        onBlur: () => {
          form.store.setState(prev => {
            const currentMeta =
              (prev.fieldMeta as Record<string, object>)[path] || {};
            return {
              ...prev,
              isTouched: true,
              fieldMeta: {
                ...prev.fieldMeta,
                [path]: {
                  ...currentMeta,
                  isTouched: true,
                },
              },
            };
          });

          if (
            modeRef.current === 'onBlur' ||
            modeRef.current === 'onTouched' ||
            modeRef.current === 'all'
          ) {
            form.validateField(path as never, 'blur');
          }
        },
        onChange: (event: unknown) => {
          let value: unknown;
          if (event && typeof event === 'object' && 'target' in event) {
            const target = event.target as HTMLInputElement;
            value = target.type === 'checkbox' ? target.checked : target.value;
          } else {
            value = event;
          }

          form.setFieldValue(path as never, value as never);

          if (modeRef.current === 'onChange' || modeRef.current === 'all') {
            form.validateField(path as never, 'change');
          }
        },
      }),

      unregister: (_engine, path) => {
        form.store.setState(prev => {
          const newFieldMeta = { ...prev.fieldMeta } as Record<string, unknown>;
          delete newFieldMeta[path];
          return { ...prev, fieldMeta: newFieldMeta as typeof prev.fieldMeta };
        });
      },

      reset: <U extends Record<string, unknown>>(
        _engine: ReactFormExtendedApi<T>,
        values?: Partial<U>,
        options?: { keepErrors?: boolean }
      ) => {
        const resetValues = values
          ? { ...defaultValuesRef.current, ...values }
          : defaultValuesRef.current;

        form.reset(resetValues as T);

        if (!options?.keepErrors) {
          form.store.setState(prev => {
            const newFieldMeta = { ...prev.fieldMeta } as Record<
              string,
              { errors?: string[] }
            >;
            for (const key of Object.keys(newFieldMeta)) {
              newFieldMeta[key] = { ...newFieldMeta[key], errors: [] };
            }
            return {
              ...prev,
              errors: [],
              fieldMeta: newFieldMeta as typeof prev.fieldMeta,
            };
          });
        }

        fieldIds.clear();
      },

      trigger: async (_engine, paths) => {
        if (paths?.length) {
          const results = await Promise.all(
            paths.map(p => form.validateField(p as never, 'submit'))
          );
          return results.every(r => !r || (Array.isArray(r) && r.length === 0));
        }
        await form.validateAllFields('submit');
        return form.state.isValid;
      },

      handleSubmit: <U extends Record<string, unknown>>(
        _engine: ReactFormExtendedApi<T>,
        onValid: (data: U) => void | Promise<void>,
        onInvalid?: (errors: Record<string, FieldError>) => void
      ) => {
        return async (event?: { preventDefault?: () => void }) => {
          event?.preventDefault?.();

          // Manually handle submission since TanStack's handleSubmit uses onSubmit from options
          form.store.setState(prev => ({ ...prev, isSubmitting: true }));

          try {
            // Validate all fields
            await form.validateAllFields('submit');

            if (form.state.isValid) {
              await onValid(form.state.values as unknown as U);
            } else if (onInvalid) {
              onInvalid(
                extractErrors(
                  form.state.fieldMeta as Record<string, { errors?: string[] }>
                )
              );
            }
          } catch {
            if (onInvalid) {
              onInvalid(
                extractErrors(
                  form.state.fieldMeta as Record<string, { errors?: string[] }>
                )
              );
            }
          } finally {
            form.store.setState(prev => ({ ...prev, isSubmitting: false }));
          }
        };
      },

      watch: (_engine, paths, callback) => {
        return form.store.subscribe(() => {
          const values = form.state.values as Record<string, unknown>;
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
        _engine: ReactFormExtendedApi<T>,
        callback: (state: FormState<U>) => void
      ) => {
        return form.store.subscribe(() => {
          callback(adapter.getState<U>(form));
        });
      },

      getFieldArray: <TFieldValue>(
        _engine: ReactFormExtendedApi<T>,
        path: string
      ): FieldArrayMethods<TFieldValue> => {
        if (!fieldIds.has(path)) {
          fieldIds.set(path, new Map());
        }
        const idMap = fieldIds.get(path)!;

        const getArray = (): TFieldValue[] => {
          const arr = getByPath(
            form.state.values as Record<string, unknown>,
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
          form.setFieldValue(path as never, newArray as never);
          form.validateField(path as never, 'change');
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
            remaining.forEach(([_, id], newIdx) => idMap.set(newIdx, id));
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
  }, [form]);

  return { adapter, form };
}
