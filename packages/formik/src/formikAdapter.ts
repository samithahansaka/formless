import type { FormikErrors, FormikValues } from 'formik';
import type {
  EngineAdapter,
  AdapterConfig,
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
  setByPath,
  generateId,
  normalizeFieldError,
} from '@samithahansaka/formless-core';

// ============================================================================
// Types
// ============================================================================

/**
 * Field metadata for Formik engine
 */
interface FieldMeta {
  isTouched: boolean;
  isDirty: boolean;
  error?: FieldError;
}

/**
 * Type for the Formik engine instance
 * This is a custom state store since Formik doesn't have an imperative API
 */
export interface FormikEngine {
  /** Form values */
  values: Record<string, unknown>;
  /** Default/initial values for reset and dirty checking */
  initialValues: Record<string, unknown>;
  /** Field metadata (touched, dirty, errors) */
  fieldMeta: Map<string, FieldMeta>;
  /** Form-level state */
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
  /** Subscribers for state changes */
  subscribers: Set<() => void>;
  /** Schema bridge for validation */
  schema?: SchemaBridge<unknown, Record<string, unknown>>;
  /** Validation mode */
  mode: ValidationMode;
  /** Stable field IDs for arrays (path -> index -> id) */
  fieldIds: Map<string, Map<number, string>>;
  /** Field refs for focus management */
  fieldRefs: Map<string, HTMLElement>;
}

/**
 * Options for the Formik adapter
 */
export interface FormikAdapterOptions {
  /** Whether to validate on change (mapped from mode) */
  validateOnChange?: boolean;
  /** Whether to validate on blur (mapped from mode) */
  validateOnBlur?: boolean;
  /** Whether to validate on mount */
  validateOnMount?: boolean;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert Formik errors to our FieldError format
 */
function convertFormikErrors(
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
 * Notify all subscribers of state change
 */
function notifySubscribers(engine: FormikEngine): void {
  engine.subscribers.forEach(callback => callback());
}

/**
 * Validate a single field using schema
 */
async function validateField(
  engine: FormikEngine,
  path: string
): Promise<FieldError | undefined> {
  if (!engine.schema) return undefined;

  const result = engine.schema.validate(engine.values);
  if (!result.success && result.errors) {
    const fieldError = result.errors.find(e => e.path === path);
    if (fieldError) {
      return { message: fieldError.message, type: 'validation' };
    }
  }
  return undefined;
}

/**
 * Validate all fields using schema
 */
async function validateAllFields(
  engine: FormikEngine
): Promise<Record<string, FieldError>> {
  if (!engine.schema) return {};

  const result = engine.schema.validate(engine.values);
  if (!result.success && result.errors) {
    return result.errors.reduce(
      (acc, err) => {
        acc[err.path] = { message: err.message, type: 'validation' };
        return acc;
      },
      {} as Record<string, FieldError>
    );
  }
  return {};
}

/**
 * Check if form has validation errors
 */
function hasErrors(engine: FormikEngine): boolean {
  for (const meta of engine.fieldMeta.values()) {
    if (meta.error) return true;
  }
  return false;
}

/**
 * Check if form has any dirty fields
 */
function hasDirtyFields(engine: FormikEngine): boolean {
  for (const meta of engine.fieldMeta.values()) {
    if (meta.isDirty) return true;
  }
  return false;
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Create a Formik compatible adapter
 *
 * This adapter implements a custom state store since Formik doesn't have
 * an imperative API. For React applications, prefer using `useFormikAdapter`
 * which wraps the native `useFormik` hook.
 *
 * @example
 * ```tsx
 * import { useUniversalForm } from '@samithahansaka/formless-react';
 * import { formikAdapter } from '@samithahansaka/formless-formik';
 * import { zodBridge } from '@samithahansaka/formless-zod';
 *
 * const form = useUniversalForm({
 *   adapter: formikAdapter(),
 *   schema: zodBridge(mySchema),
 *   defaultValues: { name: '' },
 * });
 * ```
 */
export function formikAdapter(
  _options?: FormikAdapterOptions
): EngineAdapter<FormikEngine> {
  return {
    name: 'formik',
    version: '2.x',

    // ========================================================================
    // Lifecycle
    // ========================================================================

    createForm<T extends Record<string, unknown>>(
      config: AdapterConfig<T>
    ): FormikEngine {
      const engine: FormikEngine = {
        values: { ...config.defaultValues } as Record<string, unknown>,
        initialValues: { ...config.defaultValues } as Record<string, unknown>,
        fieldMeta: new Map(),
        isSubmitting: false,
        isValidating: false,
        submitCount: 0,
        subscribers: new Set(),
        schema: config.schema as
          | SchemaBridge<unknown, Record<string, unknown>>
          | undefined,
        mode: config.mode,
        fieldIds: new Map(),
        fieldRefs: new Map(),
      };

      return engine;
    },

    destroyForm(engine: FormikEngine): void {
      engine.subscribers.clear();
      engine.fieldMeta.clear();
      engine.fieldIds.clear();
      engine.fieldRefs.clear();
    },

    // ========================================================================
    // State Access
    // ========================================================================

    getState<T extends Record<string, unknown>>(
      engine: FormikEngine
    ): FormState<T> {
      const errors: Record<string, FieldError> = {};
      const touched: Record<string, boolean> = {};
      const dirty: Record<string, boolean> = {};

      for (const [path, meta] of engine.fieldMeta) {
        if (meta.error) errors[path] = meta.error;
        if (meta.isTouched) touched[path] = true;
        if (meta.isDirty) dirty[path] = true;
      }

      return {
        values: engine.values as T,
        errors: errors as FormState<T>['errors'],
        touched: touched as FormState<T>['touched'],
        dirty: dirty as FormState<T>['dirty'],
        isSubmitting: engine.isSubmitting,
        isValidating: engine.isValidating,
        isValid: !hasErrors(engine),
        isDirty: hasDirtyFields(engine),
        submitCount: engine.submitCount,
      };
    },

    getValue(engine: FormikEngine, path: string): unknown {
      return getByPath(engine.values, path);
    },

    getValues<T extends Record<string, unknown>>(engine: FormikEngine): T {
      return engine.values as T;
    },

    getError(engine: FormikEngine, path: string): FieldError | undefined {
      return engine.fieldMeta.get(path)?.error;
    },

    getErrors(engine: FormikEngine): Record<string, FieldError> {
      const errors: Record<string, FieldError> = {};
      for (const [path, meta] of engine.fieldMeta) {
        if (meta.error) errors[path] = meta.error;
      }
      return errors;
    },

    getFieldState(engine: FormikEngine, path: string): FieldState {
      const meta = engine.fieldMeta.get(path);
      return {
        isTouched: meta?.isTouched ?? false,
        isDirty: meta?.isDirty ?? false,
        error: meta?.error,
        isInvalid: Boolean(meta?.error),
      };
    },

    // ========================================================================
    // State Mutations
    // ========================================================================

    setValue(
      engine: FormikEngine,
      path: string,
      value: unknown,
      options?: { shouldValidate?: boolean; shouldDirty?: boolean }
    ): void {
      // Set the value
      engine.values = setByPath(engine.values, path, value);

      // Update field metadata
      const currentMeta = engine.fieldMeta.get(path) || {
        isTouched: false,
        isDirty: false,
        error: undefined,
      };

      if (options?.shouldDirty !== false) {
        const initialValue = getByPath(engine.initialValues, path);
        currentMeta.isDirty = value !== initialValue;
      }

      engine.fieldMeta.set(path, currentMeta);

      // Validate if requested
      if (options?.shouldValidate) {
        validateField(engine, path).then(error => {
          if (error) {
            currentMeta.error = error;
          } else {
            currentMeta.error = undefined;
          }
          engine.fieldMeta.set(path, currentMeta);
          notifySubscribers(engine);
        });
      } else {
        notifySubscribers(engine);
      }
    },

    setValues<T extends Record<string, unknown>>(
      engine: FormikEngine,
      values: Partial<T>,
      options?: { shouldValidate?: boolean }
    ): void {
      for (const [key, value] of Object.entries(values)) {
        this.setValue(engine, key, value, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }

      if (options?.shouldValidate) {
        this.trigger(engine);
      }
    },

    setError(
      engine: FormikEngine,
      path: string,
      error: FieldError | string
    ): void {
      const normalized = normalizeFieldError(error);
      if (!normalized) return;

      const currentMeta = engine.fieldMeta.get(path) || {
        isTouched: false,
        isDirty: false,
        error: undefined,
      };
      currentMeta.error = normalized;
      engine.fieldMeta.set(path, currentMeta);
      notifySubscribers(engine);
    },

    clearErrors(engine: FormikEngine, paths?: string[]): void {
      if (paths) {
        for (const path of paths) {
          const meta = engine.fieldMeta.get(path);
          if (meta) {
            meta.error = undefined;
            engine.fieldMeta.set(path, meta);
          }
        }
      } else {
        for (const [path, meta] of engine.fieldMeta) {
          meta.error = undefined;
          engine.fieldMeta.set(path, meta);
        }
      }
      notifySubscribers(engine);
    },

    // ========================================================================
    // Field Registration
    // ========================================================================

    register(engine: FormikEngine, path: string): FieldRegisterProps {
      const self = this;

      // Ensure field metadata exists
      if (!engine.fieldMeta.has(path)) {
        engine.fieldMeta.set(path, {
          isTouched: false,
          isDirty: false,
          error: undefined,
        });
      }

      return {
        name: path,

        ref: (instance: unknown) => {
          if (instance && instance instanceof HTMLElement) {
            engine.fieldRefs.set(path, instance);
          } else {
            engine.fieldRefs.delete(path);
          }
        },

        onBlur: () => {
          const meta = engine.fieldMeta.get(path) || {
            isTouched: false,
            isDirty: false,
            error: undefined,
          };
          meta.isTouched = true;
          engine.fieldMeta.set(path, meta);

          // Validate on blur based on mode
          const mode = engine.mode;
          if (mode === 'onBlur' || mode === 'onTouched' || mode === 'all') {
            validateField(engine, path).then(error => {
              if (error) {
                meta.error = error;
              } else {
                meta.error = undefined;
              }
              engine.fieldMeta.set(path, meta);
              notifySubscribers(engine);
            });
          } else {
            notifySubscribers(engine);
          }
        },

        onChange: (event: unknown) => {
          // Extract value from event
          let value: unknown;

          if (event && typeof event === 'object' && 'target' in event) {
            const target = event.target as HTMLInputElement;
            value = target.type === 'checkbox' ? target.checked : target.value;
          } else {
            value = event;
          }

          const mode = engine.mode;
          self.setValue(engine, path, value, {
            shouldValidate: mode === 'onChange' || mode === 'all',
            shouldDirty: true,
          });
        },
      };
    },

    unregister(engine: FormikEngine, path: string): void {
      engine.fieldMeta.delete(path);
      engine.fieldRefs.delete(path);
      notifySubscribers(engine);
    },

    // ========================================================================
    // Form Operations
    // ========================================================================

    reset<T extends Record<string, unknown>>(
      engine: FormikEngine,
      values?: Partial<T>,
      options?: { keepErrors?: boolean }
    ): void {
      const resetValues = values
        ? { ...engine.initialValues, ...values }
        : { ...engine.initialValues };

      engine.values = resetValues;

      if (!options?.keepErrors) {
        for (const [path, meta] of engine.fieldMeta) {
          meta.error = undefined;
          meta.isTouched = false;
          meta.isDirty = false;
          engine.fieldMeta.set(path, meta);
        }
      }

      engine.submitCount = 0;
      engine.fieldIds.clear();
      notifySubscribers(engine);
    },

    async trigger(engine: FormikEngine, paths?: string[]): Promise<boolean> {
      engine.isValidating = true;
      notifySubscribers(engine);

      try {
        if (paths?.length) {
          // Validate specific fields
          const results = await Promise.all(
            paths.map(async path => {
              const error = await validateField(engine, path);
              const meta = engine.fieldMeta.get(path) || {
                isTouched: false,
                isDirty: false,
                error: undefined,
              };
              meta.error = error;
              engine.fieldMeta.set(path, meta);
              return !error;
            })
          );
          return results.every(Boolean);
        }

        // Validate all fields
        const errors = await validateAllFields(engine);
        for (const [path, error] of Object.entries(errors)) {
          const meta = engine.fieldMeta.get(path) || {
            isTouched: false,
            isDirty: false,
            error: undefined,
          };
          meta.error = error;
          engine.fieldMeta.set(path, meta);
        }

        // Clear errors for fields that passed validation
        for (const [path, meta] of engine.fieldMeta) {
          if (!errors[path]) {
            meta.error = undefined;
            engine.fieldMeta.set(path, meta);
          }
        }

        return Object.keys(errors).length === 0;
      } finally {
        engine.isValidating = false;
        notifySubscribers(engine);
      }
    },

    handleSubmit<T extends Record<string, unknown>>(
      engine: FormikEngine,
      onValid: (data: T) => void | Promise<void>,
      onInvalid?: (errors: Record<string, FieldError>) => void
    ): (event?: { preventDefault?: () => void }) => Promise<void> {
      const self = this;

      return async event => {
        event?.preventDefault?.();

        engine.isSubmitting = true;
        engine.submitCount++;
        notifySubscribers(engine);

        try {
          const isValid = await self.trigger(engine);

          if (isValid) {
            await onValid(engine.values as T);
          } else {
            const errors = self.getErrors(engine);

            // Focus first field with error (Formik behavior)
            const firstErrorPath = Object.keys(errors)[0];
            if (firstErrorPath) {
              const element = engine.fieldRefs.get(firstErrorPath);
              if (element && 'focus' in element) {
                (element as HTMLElement).focus();
              }
            }

            if (onInvalid) {
              onInvalid(errors);
            }
          }
        } finally {
          engine.isSubmitting = false;
          notifySubscribers(engine);
        }
      };
    },

    // ========================================================================
    // Subscriptions
    // ========================================================================

    watch(
      engine: FormikEngine,
      paths: string[] | undefined,
      callback: (values: unknown) => void
    ): () => void {
      const subscriber = () => {
        if (!paths) {
          callback(engine.values);
        } else if (paths.length === 1) {
          callback(getByPath(engine.values, paths[0]));
        } else {
          callback(
            Object.fromEntries(paths.map(p => [p, getByPath(engine.values, p)]))
          );
        }
      };

      engine.subscribers.add(subscriber);
      return () => engine.subscribers.delete(subscriber);
    },

    subscribe<T extends Record<string, unknown>>(
      engine: FormikEngine,
      callback: (state: FormState<T>) => void
    ): () => void {
      const self = this;
      const subscriber = () => {
        callback(self.getState<T>(engine));
      };

      engine.subscribers.add(subscriber);
      return () => engine.subscribers.delete(subscriber);
    },

    // ========================================================================
    // Field Arrays
    // ========================================================================

    getFieldArray<TFieldValue>(
      engine: FormikEngine,
      path: string
    ): FieldArrayMethods<TFieldValue> {
      const self = this;

      // Get or create stable ID map for this array path
      if (!engine.fieldIds.has(path)) {
        engine.fieldIds.set(path, new Map());
      }
      const idMap = engine.fieldIds.get(path)!;

      const getArray = (): TFieldValue[] => {
        const arr = getByPath(engine.values, path);
        return Array.isArray(arr) ? arr : [];
      };

      // Ensure stable IDs exist for current items
      const currentArray = getArray();
      currentArray.forEach((_, i) => {
        if (!idMap.has(i)) idMap.set(i, generateId());
      });

      const fields = currentArray.map((item, index) => ({
        ...(item && typeof item === 'object' ? item : {}),
        id: idMap.get(index) ?? generateId(),
      })) as Array<TFieldValue & { id: string }>;

      const setArray = (newArray: TFieldValue[]) => {
        self.setValue(engine, path, newArray, { shouldValidate: true });
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
          // Shift existing IDs
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
          // Rebuild IDs
          const oldEntries = [...idMap.entries()];
          idMap.clear();
          oldEntries.forEach(([idx, id]) => {
            idMap.set(idx >= index ? idx + 1 : idx, id);
          });
          idMap.set(index, generateId());
          setArray(newArr);
        },

        remove(index: number | number[]) {
          const arr = getArray();
          const indices = new Set(Array.isArray(index) ? index : [index]);
          const newArr = arr.filter((_, i) => !indices.has(i));

          // Rebuild IDs preserving order
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
            if (newIdx === to) {
              idMap.set(newIdx++, movedId);
            }
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
}

// Re-export for backwards compatibility
export { convertFormikErrors };
