import { useMemo, useRef } from 'react';
import { useFormik } from 'formik';
import type {
  FormikErrors,
  FormikValues,
  FormikConfig,
  FormikProps,
} from 'formik';
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
 * Configuration for useFormikAdapter hook
 */
export interface UseFormikAdapterConfig<T extends FormikValues> {
  /** Default form values */
  defaultValues: T;
  /** Schema bridge for validation */
  schema?: SchemaBridge<unknown, T>;
  /** Validation mode */
  mode?: ValidationMode;
  /** Whether to validate on mount */
  validateOnMount?: boolean;
}

/**
 * Return type of useFormikAdapter
 */
export interface UseFormikAdapterReturn<T extends FormikValues> {
  /** The adapter instance for useUniversalForm */
  adapter: EngineAdapter<FormikProps<T>>;
  /** The native Formik instance for direct access */
  formik: FormikProps<T>;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Create a Formik validate function from schema bridge
 */
function createValidate<T extends FormikValues>(
  schema: SchemaBridge<unknown, T>
): FormikConfig<T>['validate'] {
  return values => {
    const result = schema.validate(values);
    if (result.success) {
      return {};
    }

    const errors: FormikErrors<T> = {};
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
      current[lastPart] = err.message;
    }

    return errors;
  };
}

/**
 * Extract flat errors from Formik's nested error structure
 */
function extractErrors(
  errors: FormikErrors<FormikValues>
): Record<string, FieldError> {
  const result: Record<string, FieldError> = {};

  function processErrors(errs: FormikErrors<FormikValues>, prefix = ''): void {
    for (const [key, value] of Object.entries(errs)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        result[path] = { message: value, type: 'validation' };
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'string') {
            result[`${path}.${index}`] = { message: item, type: 'validation' };
          } else if (item && typeof item === 'object') {
            processErrors(
              item as FormikErrors<FormikValues>,
              `${path}.${index}`
            );
          }
        });
      } else if (value && typeof value === 'object') {
        processErrors(value as FormikErrors<FormikValues>, path);
      }
    }
  }

  processErrors(errors);
  return result;
}

/**
 * Build touched/dirty maps from Formik's state
 */
function extractTouchedDirty(
  touched: Record<string, unknown>,
  values: FormikValues,
  initialValues: FormikValues
): { touchedMap: Record<string, boolean>; dirtyMap: Record<string, boolean> } {
  const touchedMap: Record<string, boolean> = {};
  const dirtyMap: Record<string, boolean> = {};

  function processTouched(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value === true) {
        touchedMap[path] = true;
      } else if (value && typeof value === 'object') {
        processTouched(value as Record<string, unknown>, path);
      }
    }
  }

  function checkDirty(
    vals: Record<string, unknown>,
    initVals: Record<string, unknown>,
    prefix = ''
  ): void {
    for (const key of Object.keys(vals)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val = vals[key];
      const initVal = initVals?.[key];

      if (val !== initVal) {
        dirtyMap[path] = true;
      }

      if (val && typeof val === 'object' && !Array.isArray(val)) {
        checkDirty(
          val as Record<string, unknown>,
          (initVal as Record<string, unknown>) || {},
          path
        );
      }
    }
  }

  processTouched(touched);
  checkDirty(values, initialValues);

  return { touchedMap, dirtyMap };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * React hook that creates a Formik adapter using the native useFormik hook
 *
 * This provides the best React integration by using Formik's own React bindings,
 * while still providing compatibility with the Universal Form Adapter interface.
 *
 * @example
 * ```tsx
 * import { useUniversalForm } from '@universal-form/react';
 * import { useFormikAdapter } from '@universal-form/formik';
 * import { zodBridge } from '@universal-form/zod';
 *
 * function MyForm() {
 *   const { adapter, formik } = useFormikAdapter({
 *     defaultValues: { name: '', email: '' },
 *     schema: zodBridge(mySchema),
 *     mode: 'onBlur',
 *   });
 *
 *   const form = useUniversalForm({ adapter });
 *
 *   // You can also use formik directly for Formik-specific features
 *   return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
 * }
 * ```
 */
export function useFormikAdapter<T extends FormikValues>(
  config: UseFormikAdapterConfig<T>
): UseFormikAdapterReturn<T> {
  const {
    defaultValues,
    schema,
    mode = 'onSubmit',
    validateOnMount = false,
  } = config;

  // Store stable references
  const defaultValuesRef = useRef(defaultValues);
  const modeRef = useRef(mode);
  const fieldIdsRef = useRef(new Map<string, Map<number, string>>());
  const submitHandlerRef = useRef<((values: T) => void | Promise<void>) | null>(
    null
  );

  // Create the native Formik instance
  const formik = useFormik<T>({
    initialValues: defaultValues,
    validateOnChange: mode === 'onChange' || mode === 'all',
    validateOnBlur: mode === 'onBlur' || mode === 'onTouched' || mode === 'all',
    validateOnMount,
    validate: schema ? createValidate(schema) : undefined,
    onSubmit: async values => {
      if (submitHandlerRef.current) {
        await submitHandlerRef.current(values);
      }
    },
  });

  // Create adapter that wraps the formik instance
  const adapter = useMemo<EngineAdapter<FormikProps<T>>>(() => {
    const fieldIds = fieldIdsRef.current;

    return {
      name: 'formik-hook',
      version: '2.x',

      createForm: () => formik,
      destroyForm: () => {
        fieldIds.clear();
      },

      getState: <U extends Record<string, unknown>>(): FormState<U> => {
        const { touchedMap, dirtyMap } = extractTouchedDirty(
          formik.touched as Record<string, unknown>,
          formik.values,
          formik.initialValues
        );

        return {
          values: formik.values as unknown as U,
          errors: extractErrors(formik.errors) as FormState<U>['errors'],
          touched: touchedMap as FormState<U>['touched'],
          dirty: dirtyMap as FormState<U>['dirty'],
          isSubmitting: formik.isSubmitting,
          isValidating: formik.isValidating,
          isValid: formik.isValid,
          isDirty: formik.dirty,
          submitCount: formik.submitCount,
        };
      },

      getValue: (_engine, path) => {
        return getByPath(formik.values as Record<string, unknown>, path);
      },

      getValues: <U extends Record<string, unknown>>() =>
        formik.values as unknown as U,

      getError: (_engine, path) => {
        const error = getByPath(formik.errors as Record<string, unknown>, path);
        if (typeof error === 'string') {
          return { message: error, type: 'validation' };
        }
        return undefined;
      },

      getErrors: () => extractErrors(formik.errors),

      getFieldState: (_engine, path): FieldState => {
        const meta = formik.getFieldMeta(path);
        return {
          isTouched: meta.touched,
          isDirty: meta.value !== meta.initialValue,
          error:
            typeof meta.error === 'string'
              ? { message: meta.error, type: 'validation' }
              : undefined,
          isInvalid: Boolean(meta.error && meta.touched),
        };
      },

      setValue: (_engine, path, value, options) => {
        formik.setFieldValue(path, value, options?.shouldValidate ?? false);
        if (options?.shouldDirty !== false) {
          formik.setFieldTouched(path, true, false);
        }
      },

      setValues: <U extends Record<string, unknown>>(
        _engine: FormikProps<T>,
        values: Partial<U>,
        options?: { shouldValidate?: boolean }
      ) => {
        const newValues = { ...formik.values };
        for (const [key, value] of Object.entries(values)) {
          (newValues as Record<string, unknown>)[key] = value;
        }
        formik.setValues(newValues, options?.shouldValidate ?? false);
      },

      setError: (_engine, path, error) => {
        const normalized = normalizeFieldError(error);
        if (!normalized?.message) return;
        formik.setFieldError(path, normalized.message);
      },

      clearErrors: (_engine, paths) => {
        if (paths) {
          const newErrors = { ...formik.errors };
          for (const path of paths) {
            const pathParts = path.split('.');
            let current: Record<string, unknown> = newErrors as Record<
              string,
              unknown
            >;
            for (let i = 0; i < pathParts.length - 1; i++) {
              if (!current[pathParts[i]]) break;
              current = current[pathParts[i]] as Record<string, unknown>;
            }
            delete current[pathParts[pathParts.length - 1]];
          }
          formik.setErrors(newErrors);
        } else {
          formik.setErrors({});
        }
      },

      register: (_engine, path): FieldRegisterProps => {
        const props = formik.getFieldProps(path);
        return {
          name: props.name,
          ref: () => {},
          onBlur: props.onBlur as (event: unknown) => void,
          onChange: (event: unknown) => {
            // Handle different event types
            if (event && typeof event === 'object' && 'target' in event) {
              props.onChange(event as React.ChangeEvent);
            } else {
              formik.setFieldValue(
                path,
                event,
                modeRef.current === 'onChange' || modeRef.current === 'all'
              );
            }
          },
        };
      },

      unregister: () => {
        // Formik doesn't have explicit field unregistration
      },

      reset: <U extends Record<string, unknown>>(
        _engine: FormikProps<T>,
        values?: Partial<U>,
        options?: { keepErrors?: boolean }
      ) => {
        const resetValues = values
          ? { ...defaultValuesRef.current, ...values }
          : defaultValuesRef.current;

        formik.resetForm({
          values: resetValues as T,
          errors: options?.keepErrors ? formik.errors : {},
        });

        fieldIds.clear();
      },

      trigger: async (_engine, paths) => {
        if (paths?.length) {
          const results = await Promise.all(
            paths.map(p => formik.validateField(p))
          );
          return results.every(r => r === undefined);
        }
        const errors = await formik.validateForm();
        return Object.keys(errors).length === 0;
      },

      handleSubmit: <U extends Record<string, unknown>>(
        _engine: FormikProps<T>,
        onValid: (data: U) => void | Promise<void>,
        onInvalid?: (errors: Record<string, FieldError>) => void
      ) => {
        return async (event?: { preventDefault?: () => void }) => {
          event?.preventDefault?.();

          // Store the handler for formik's onSubmit to call
          submitHandlerRef.current = onValid as unknown as (
            values: T
          ) => void | Promise<void>;

          // Validate first
          const errors = await formik.validateForm();

          if (Object.keys(errors).length === 0) {
            await formik.submitForm();
          } else if (onInvalid) {
            onInvalid(extractErrors(errors));
          }
        };
      },

      watch: (_engine, paths, callback) => {
        // Formik doesn't have a built-in subscription API
        // This is a simplified implementation that returns a no-op unsubscribe
        // In a real implementation, you'd use useEffect in the component
        const checkValues = () => {
          if (!paths) {
            callback(formik.values);
          } else if (paths.length === 1) {
            callback(
              getByPath(formik.values as Record<string, unknown>, paths[0])
            );
          } else {
            callback(
              Object.fromEntries(
                paths.map(p => [
                  p,
                  getByPath(formik.values as Record<string, unknown>, p),
                ])
              )
            );
          }
        };

        checkValues();
        return () => {};
      },

      subscribe: <U extends Record<string, unknown>>(
        _engine: FormikProps<T>,
        callback: (state: FormState<U>) => void
      ) => {
        // Similar to watch, Formik doesn't have a built-in subscription API
        callback(adapter.getState<U>(formik));
        return () => {};
      },

      getFieldArray: <TFieldValue>(
        _engine: FormikProps<T>,
        path: string
      ): FieldArrayMethods<TFieldValue> => {
        if (!fieldIds.has(path)) {
          fieldIds.set(path, new Map());
        }
        const idMap = fieldIds.get(path)!;

        const getArray = (): TFieldValue[] => {
          const arr = getByPath(formik.values as Record<string, unknown>, path);
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
          formik.setFieldValue(path, newArray, true);
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
  }, [formik]);

  return { adapter, formik };
}
