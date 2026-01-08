import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type {
  UseFormReturn,
  FieldValues,
  FieldErrors,
  Resolver,
  DefaultValues,
} from 'react-hook-form';
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
 * Configuration for useRHFAdapter hook
 */
export interface UseRHFAdapterConfig<T extends FieldValues> {
  /** Default form values */
  defaultValues: T;
  /** Schema bridge for validation */
  schema?: SchemaBridge<unknown, T>;
  /** Validation mode */
  mode?: ValidationMode;
  /** Whether to revalidate on change after submit */
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  /** Whether to focus the first field with error */
  shouldFocusError?: boolean;
}

/**
 * Return type of useRHFAdapter
 */
export interface UseRHFAdapterReturn<T extends FieldValues> {
  /** The adapter instance for useUniversalForm */
  adapter: EngineAdapter<UseFormReturn<T>>;
  /** The native RHF form instance for direct access */
  form: UseFormReturn<T>;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert UFA validation mode to RHF mode
 */
function toRHFMode(
  mode: ValidationMode
): 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all' {
  return mode;
}

/**
 * Create a RHF resolver from schema bridge
 */
function createResolver<T extends FieldValues>(
  schema: SchemaBridge<unknown, T>
): Resolver<T> {
  return async values => {
    const result = schema.validate(values);

    if (result.success) {
      return { values, errors: {} };
    }

    const errors: FieldErrors<T> = {};
    for (const err of result.errors || []) {
      const pathParts = err.path.split('.');
      let current: Record<string, unknown> = errors;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const lastPart = pathParts[pathParts.length - 1];
      current[lastPart] = {
        type: 'validation',
        message: err.message,
      };
    }

    // RHF expects empty values object when validation fails
    return { values: {} as never, errors };
  };
}

/**
 * Extract errors from RHF format to UFA format
 */
function extractErrors(errors: FieldErrors): Record<string, FieldError> {
  const result: Record<string, FieldError> = {};

  function processErrors(errs: FieldErrors, prefix = ''): void {
    for (const [key, value] of Object.entries(errs)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object') {
        if ('message' in value) {
          result[path] = {
            message: value.message as string,
            type: (value.type as string) || 'validation',
          };
        } else if ('root' in value) {
          result[path] = {
            message: (value.root as { message?: string })?.message || 'Invalid',
            type: 'array',
          };
        } else {
          processErrors(value as FieldErrors, path);
        }
      }
    }
  }

  processErrors(errors);
  return result;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * React hook that creates a React Hook Form adapter using the native useForm hook
 *
 * This provides the best React integration by using RHF's own React bindings,
 * while still providing compatibility with the Universal Form Adapter interface.
 *
 * @example
 * ```tsx
 * import { useUniversalForm } from '@universal-form/react';
 * import { useRHFAdapter } from '@universal-form/react-hook-form';
 * import { zodBridge } from '@universal-form/zod';
 *
 * function MyForm() {
 *   const { adapter, form: rhfForm } = useRHFAdapter({
 *     defaultValues: { name: '', email: '' },
 *     schema: zodBridge(mySchema),
 *     mode: 'onBlur',
 *   });
 *
 *   const form = useUniversalForm({ adapter });
 *
 *   // You can also use rhfForm directly for RHF-specific features
 *   return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
 * }
 * ```
 */
export function useRHFAdapter<T extends FieldValues>(
  config: UseRHFAdapterConfig<T>
): UseRHFAdapterReturn<T> {
  const {
    defaultValues,
    schema,
    mode = 'onSubmit',
    reValidateMode = 'onChange',
    shouldFocusError = true,
  } = config;

  // Store stable references
  const defaultValuesRef = useRef(defaultValues);
  const fieldIdsRef = useRef(new Map<string, Map<number, string>>());

  // Create the native RHF form
  const form = useForm<T>({
    defaultValues: defaultValues as DefaultValues<T>,
    mode: toRHFMode(mode),
    reValidateMode,
    shouldFocusError,
    resolver: schema ? createResolver(schema) : undefined,
  });

  // Create adapter that wraps the form instance
  const adapter = useMemo<EngineAdapter<UseFormReturn<T>>>(() => {
    const fieldIds = fieldIdsRef.current;

    return {
      name: 'react-hook-form-hook',
      version: '7.x',

      createForm: () => form,
      destroyForm: () => {
        fieldIds.clear();
      },

      getState: <U extends Record<string, unknown>>(): FormState<U> => {
        const { formState } = form;
        const values = form.getValues();

        // Build touched/dirty maps
        const touched: Record<string, boolean> = {};
        const dirty: Record<string, boolean> = {};

        const processTouched = (obj: Record<string, unknown>, prefix = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            if (value === true) {
              touched[path] = true;
            } else if (value && typeof value === 'object') {
              processTouched(value as Record<string, unknown>, path);
            }
          }
        };

        const processDirty = (obj: Record<string, unknown>, prefix = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            if (value === true) {
              dirty[path] = true;
            } else if (value && typeof value === 'object') {
              processDirty(value as Record<string, unknown>, path);
            }
          }
        };

        processTouched(formState.touchedFields as Record<string, unknown>);
        processDirty(formState.dirtyFields as Record<string, unknown>);

        return {
          values: values as unknown as U,
          errors: extractErrors(formState.errors) as FormState<U>['errors'],
          touched: touched as FormState<U>['touched'],
          dirty: dirty as FormState<U>['dirty'],
          isSubmitting: formState.isSubmitting,
          isValidating: formState.isValidating,
          isValid: formState.isValid,
          isDirty: formState.isDirty,
          submitCount: formState.submitCount,
        };
      },

      getValue: (_engine, path) => {
        return getByPath(form.getValues() as Record<string, unknown>, path);
      },

      getValues: <U extends Record<string, unknown>>() =>
        form.getValues() as unknown as U,

      getError: (_engine, path) => {
        const fieldState = form.getFieldState(path as never);
        if (fieldState.error?.message) {
          return {
            message: fieldState.error.message,
            type: fieldState.error.type || 'validation',
          };
        }
        return undefined;
      },

      getErrors: () => extractErrors(form.formState.errors),

      getFieldState: (_engine, path): FieldState => {
        const fieldState = form.getFieldState(path as never);
        return {
          isTouched: fieldState.isTouched,
          isDirty: fieldState.isDirty,
          error: fieldState.error?.message
            ? {
                message: fieldState.error.message,
                type: fieldState.error.type || 'validation',
              }
            : undefined,
          isInvalid: fieldState.invalid,
        };
      },

      setValue: (_engine, path, value, options) => {
        form.setValue(path as never, value as never, {
          shouldValidate: options?.shouldValidate ?? false,
          shouldDirty: options?.shouldDirty ?? true,
          shouldTouch: true,
        });
      },

      setValues: <U extends Record<string, unknown>>(
        _engine: UseFormReturn<T>,
        values: Partial<U>,
        options?: { shouldValidate?: boolean }
      ) => {
        for (const [key, value] of Object.entries(values)) {
          form.setValue(key as never, value as never, {
            shouldValidate: options?.shouldValidate ?? false,
          });
        }
      },

      setError: (_engine, path, error) => {
        const normalized = normalizeFieldError(error);
        if (!normalized?.message) return;

        form.setError(path as never, {
          type: normalized.type || 'manual',
          message: normalized.message,
        });
      },

      clearErrors: (_engine, paths) => {
        if (paths) {
          for (const path of paths) {
            form.clearErrors(path as never);
          }
        } else {
          form.clearErrors();
        }
      },

      register: (_engine, path): FieldRegisterProps => {
        const registered = form.register(path as never);
        return {
          name: registered.name,
          ref: registered.ref as (instance: unknown) => void,
          onBlur: registered.onBlur as (event: unknown) => void,
          onChange: registered.onChange as (event: unknown) => void,
        };
      },

      unregister: (_engine, path) => {
        form.unregister(path as never);
      },

      reset: <U extends Record<string, unknown>>(
        _engine: UseFormReturn<T>,
        values?: Partial<U>,
        options?: { keepErrors?: boolean }
      ) => {
        const resetValues = values
          ? { ...defaultValuesRef.current, ...values }
          : defaultValuesRef.current;

        form.reset(resetValues as T, {
          keepErrors: options?.keepErrors ?? false,
        });

        fieldIds.clear();
      },

      trigger: async (_engine, paths) => {
        if (paths?.length) {
          const results = await Promise.all(
            paths.map(p => form.trigger(p as never))
          );
          return results.every(Boolean);
        }
        return form.trigger();
      },

      handleSubmit: <U extends Record<string, unknown>>(
        _engine: UseFormReturn<T>,
        onValid: (data: U) => void | Promise<void>,
        onInvalid?: (errors: Record<string, FieldError>) => void
      ) => {
        const rhfHandler = form.handleSubmit(
          async data => {
            await onValid(data as unknown as U);
          },
          onInvalid ? errors => onInvalid(extractErrors(errors)) : undefined
        );

        // Wrap to match our event type signature
        return async (event?: { preventDefault?: () => void }) => {
          await rhfHandler(event as never);
        };
      },

      watch: (_engine, paths, callback) => {
        if (!paths) {
          const subscription = form.watch(values => callback(values));
          return () => subscription.unsubscribe();
        }

        if (paths.length === 1) {
          const subscription = form.watch(values => {
            callback(getByPath(values as Record<string, unknown>, paths[0]));
          });
          return () => subscription.unsubscribe();
        }

        const subscription = form.watch(values => {
          callback(
            Object.fromEntries(
              paths.map(p => [
                p,
                getByPath(values as Record<string, unknown>, p),
              ])
            )
          );
        });
        return () => subscription.unsubscribe();
      },

      subscribe: <U extends Record<string, unknown>>(
        _engine: UseFormReturn<T>,
        callback: (state: FormState<U>) => void
      ) => {
        const subscription = form.watch(() => {
          callback(adapter.getState<U>(form));
        });
        return () => subscription.unsubscribe();
      },

      getFieldArray: <TFieldValue>(
        _engine: UseFormReturn<T>,
        path: string
      ): FieldArrayMethods<TFieldValue> => {
        if (!fieldIds.has(path)) {
          fieldIds.set(path, new Map());
        }
        const idMap = fieldIds.get(path)!;

        const getArray = (): TFieldValue[] => {
          const arr = getByPath(
            form.getValues() as Record<string, unknown>,
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
          form.setValue(path as never, newArray as never, {
            shouldValidate: true,
          });
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
