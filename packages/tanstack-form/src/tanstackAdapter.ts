import { FormApi } from '@tanstack/form-core';
import type {
  FormState as TanStackFormState,
  DeepKeys,
} from '@tanstack/form-core';
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
 * TanStack Form engine instance wrapping the actual FormApi
 */
export interface TanStackEngine {
  /** The actual TanStack FormApi instance */
  api: FormApi<Record<string, unknown>>;
  /** Cleanup function for store subscription */
  cleanup?: () => void;
  /** Schema bridge for validation */
  schema?: SchemaBridge<unknown, Record<string, unknown>>;
  /** Default values for reset */
  defaultValues: Record<string, unknown>;
  /** Validation mode */
  mode: ValidationMode;
  /** Stable field IDs for arrays (path -> index -> id) */
  fieldIds: Map<string, Map<number, string>>;
}

/**
 * Options for the TanStack Form adapter
 */
export interface TanStackAdapterOptions {
  /** Debounce time for async validation in milliseconds */
  asyncDebounceMs?: number;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Create validators based on validation mode and schema
 * TanStack Form expects validators to return { fields: Record<path, error> } or a string
 */
function createValidators<T extends Record<string, unknown>>(
  mode: ValidationMode,
  schema?: SchemaBridge<unknown, T>
) {
  if (!schema) return undefined;

  const validate = ({ value }: { value: T }) => {
    const result = schema.validate(value);
    if (!result.success && result.errors?.length) {
      // TanStack expects { fields: { [path]: error } } format
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
  // Always validate on submit
  validators.onSubmit = validate;

  return validators;
}

/**
 * Extract errors from TanStack's fieldMeta structure
 */
function extractErrors(
  fieldMeta: Record<string, { errors?: string[] }> | undefined
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};

  for (const [path, meta] of Object.entries(fieldMeta || {})) {
    const fieldErrors = meta?.errors;
    if (fieldErrors?.length) {
      errors[path] = { message: fieldErrors[0], type: 'validation' };
    }
  }

  return errors;
}

/**
 * Build touched/dirty maps from TanStack's fieldMeta
 */
function extractFieldMaps(
  fieldMeta:
    | Record<string, { isTouched?: boolean; isDirty?: boolean }>
    | undefined
): { touched: Record<string, boolean>; dirty: Record<string, boolean> } {
  const touched: Record<string, boolean> = {};
  const dirty: Record<string, boolean> = {};

  for (const [path, meta] of Object.entries(fieldMeta || {})) {
    if (meta?.isTouched) touched[path] = true;
    if (meta?.isDirty) dirty[path] = true;
  }

  return { touched, dirty };
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Create a TanStack Form adapter
 *
 * This adapter uses FormApi from @tanstack/form-core directly,
 * enabling imperative form management without React hooks.
 *
 * @example
 * ```tsx
 * import { useUniversalForm } from '@universal-form/react';
 * import { tanstackAdapter } from '@universal-form/tanstack-form';
 * import { zodBridge } from '@universal-form/zod';
 *
 * const form = useUniversalForm({
 *   adapter: tanstackAdapter(),
 *   schema: zodBridge(mySchema),
 *   defaultValues: { name: '' },
 * });
 * ```
 */
export function tanstackAdapter(
  options?: TanStackAdapterOptions
): EngineAdapter<TanStackEngine> {
  return {
    name: 'tanstack-form',
    version: '0.x',

    // ========================================================================
    // Lifecycle
    // ========================================================================

    createForm<T extends Record<string, unknown>>(
      config: AdapterConfig<T>
    ): TanStackEngine {
      const validators = createValidators(config.mode, config.schema);

      // Create FormApi instance (same as TanStack's useForm does internally)
      const api = new FormApi<T>({
        defaultValues: config.defaultValues,
        asyncDebounceMs: options?.asyncDebounceMs,
        validators: validators as never,
      });

      // Mount the form (initializes store, runs onMount validators)
      api.mount();

      const engine: TanStackEngine = {
        api: api as FormApi<Record<string, unknown>>,
        schema: config.schema as
          | SchemaBridge<unknown, Record<string, unknown>>
          | undefined,
        defaultValues: config.defaultValues as Record<string, unknown>,
        mode: config.mode,
        fieldIds: new Map(),
      };

      return engine;
    },

    destroyForm(engine: TanStackEngine): void {
      engine.cleanup?.();
      engine.fieldIds.clear();
    },

    // ========================================================================
    // State Access
    // ========================================================================

    getState<T extends Record<string, unknown>>(
      engine: TanStackEngine
    ): FormState<T> {
      const state = engine.api.state as TanStackFormState<T>;
      const { touched, dirty } = extractFieldMaps(
        state.fieldMeta as Record<
          string,
          { isTouched?: boolean; isDirty?: boolean }
        >
      );

      return {
        values: state.values as T,
        errors: extractErrors(
          state.fieldMeta as Record<string, { errors?: string[] }>
        ) as FormState<T>['errors'],
        touched: touched as FormState<T>['touched'],
        dirty: dirty as FormState<T>['dirty'],
        isSubmitting: state.isSubmitting,
        isValidating: state.isValidating,
        isValid: state.isValid,
        isDirty: state.isDirty,
        submitCount: state.submissionAttempts,
      };
    },

    getValue(engine: TanStackEngine, path: string): unknown {
      return getByPath(engine.api.state.values, path);
    },

    getValues<T extends Record<string, unknown>>(engine: TanStackEngine): T {
      return engine.api.state.values as T;
    },

    getError(engine: TanStackEngine, path: string): FieldError | undefined {
      const fieldMeta = engine.api.state.fieldMeta as Record<
        string,
        { errors?: string[] }
      >;
      const meta = fieldMeta?.[path];
      return meta?.errors?.length
        ? { message: meta.errors[0], type: 'validation' }
        : undefined;
    },

    getErrors(engine: TanStackEngine): Record<string, FieldError> {
      return extractErrors(
        engine.api.state.fieldMeta as Record<string, { errors?: string[] }>
      );
    },

    getFieldState(engine: TanStackEngine, path: string): FieldState {
      const fieldMeta = engine.api.state.fieldMeta as Record<
        string,
        {
          errors?: string[];
          isTouched?: boolean;
          isDirty?: boolean;
        }
      >;
      const meta = fieldMeta?.[path];
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

    // ========================================================================
    // State Mutations
    // ========================================================================

    setValue(
      engine: TanStackEngine,
      path: string,
      value: unknown,
      options?: { shouldValidate?: boolean; shouldDirty?: boolean }
    ): void {
      // setFieldValue automatically sets isTouched and isDirty
      // Use dontUpdateMeta to prevent that if shouldDirty is false
      engine.api.setFieldValue(path as never, value as never, {
        dontUpdateMeta: options?.shouldDirty === false,
      });

      if (options?.shouldValidate) {
        engine.api.validateField(path as never, 'change');
      }
    },

    setValues<T extends Record<string, unknown>>(
      engine: TanStackEngine,
      values: Partial<T>,
      options?: { shouldValidate?: boolean }
    ): void {
      for (const [key, value] of Object.entries(values)) {
        engine.api.setFieldValue(key as never, value as never);
      }

      if (options?.shouldValidate) {
        engine.api.validateAllFields('change');
      }
    },

    setError(
      engine: TanStackEngine,
      path: string,
      error: FieldError | string
    ): void {
      const normalized = normalizeFieldError(error);
      if (!normalized?.message) return;

      // Update fieldMeta with the error - preserve all existing FieldMeta properties
      engine.api.store.setState(prev => {
        const currentMeta = (
          prev.fieldMeta as Record<string, Record<string, unknown>>
        )[path] || {
          isTouched: false,
          isBlurred: false,
          isPristine: true,
          isDirty: false,
          errors: [],
          errorMap: {},
          isValidating: false,
        };
        return {
          ...prev,
          fieldMeta: {
            ...prev.fieldMeta,
            [path]: {
              ...currentMeta,
              errors: [normalized.message],
            },
          },
        } as typeof prev;
      });
    },

    clearErrors(engine: TanStackEngine, paths?: string[]): void {
      engine.api.store.setState(prev => {
        const newFieldMeta = { ...prev.fieldMeta } as Record<
          string,
          { errors?: string[] }
        >;

        if (paths) {
          for (const path of paths) {
            if (newFieldMeta[path]) {
              newFieldMeta[path] = { ...newFieldMeta[path], errors: [] };
            }
          }
        } else {
          for (const key of Object.keys(newFieldMeta)) {
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

    // ========================================================================
    // Field Registration
    // ========================================================================

    register(engine: TanStackEngine, path: string): FieldRegisterProps {
      const self = this;

      return {
        name: path,
        ref: () => {},

        onBlur: () => {
          // Mark field as touched - preserve all required FieldMeta properties
          engine.api.store.setState(prev => {
            const currentMeta = (
              prev.fieldMeta as Record<string, Record<string, unknown>>
            )[path] || {
              isTouched: false,
              isBlurred: false,
              isPristine: true,
              isDirty: false,
              errors: [],
              errorMap: {},
              isValidating: false,
            };
            return {
              ...prev,
              isTouched: true,
              isBlurred: true,
              fieldMeta: {
                ...prev.fieldMeta,
                [path]: {
                  ...currentMeta,
                  isTouched: true,
                  isBlurred: true,
                },
              },
            } as typeof prev;
          });

          // Validate on blur based on mode
          const mode = engine.mode;
          if (mode === 'onBlur' || mode === 'onTouched' || mode === 'all') {
            engine.api.validateField(path as never, 'blur');
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

    unregister(engine: TanStackEngine, path: string): void {
      engine.api.store.setState(prev => {
        const newFieldMeta = { ...prev.fieldMeta } as Record<string, unknown>;
        delete newFieldMeta[path];
        return { ...prev, fieldMeta: newFieldMeta as typeof prev.fieldMeta };
      });
    },

    // ========================================================================
    // Form Operations
    // ========================================================================

    reset<T extends Record<string, unknown>>(
      engine: TanStackEngine,
      values?: Partial<T>,
      options?: { keepErrors?: boolean }
    ): void {
      const resetValues = values
        ? { ...engine.defaultValues, ...values }
        : engine.defaultValues;

      engine.api.reset(resetValues as never);

      if (!options?.keepErrors) {
        this.clearErrors(engine);
      }

      engine.fieldIds.clear();
    },

    async trigger(engine: TanStackEngine, paths?: string[]): Promise<boolean> {
      if (paths?.length) {
        const results = await Promise.all(
          paths.map(p => engine.api.validateField(p as never, 'submit'))
        );
        return results.every(r => !r || (Array.isArray(r) && r.length === 0));
      }

      await engine.api.validateAllFields('submit');
      return engine.api.state.isValid;
    },

    handleSubmit<T extends Record<string, unknown>>(
      engine: TanStackEngine,
      onValid: (data: T) => void | Promise<void>,
      onInvalid?: (errors: Record<string, FieldError>) => void
    ): (event?: { preventDefault?: () => void }) => Promise<void> {
      const self = this;

      return async event => {
        event?.preventDefault?.();

        // Manually handle submission since TanStack's handleSubmit uses onSubmit from options
        engine.api.store.setState(prev => ({ ...prev, isSubmitting: true }));

        try {
          // Validate all fields
          await engine.api.validateAllFields('submit');

          if (engine.api.state.isValid) {
            await onValid(engine.api.state.values as T);
          } else if (onInvalid) {
            onInvalid(self.getErrors(engine));
          }
        } catch {
          // Handle any errors during submission
          if (onInvalid) {
            onInvalid(self.getErrors(engine));
          }
        } finally {
          engine.api.store.setState(prev => ({ ...prev, isSubmitting: false }));
        }
      };
    },

    // ========================================================================
    // Subscriptions
    // ========================================================================

    watch(
      engine: TanStackEngine,
      paths: string[] | undefined,
      callback: (values: unknown) => void
    ): () => void {
      return engine.api.store.subscribe(() => {
        const values = engine.api.state.values;

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

    subscribe<T extends Record<string, unknown>>(
      engine: TanStackEngine,
      callback: (state: FormState<T>) => void
    ): () => void {
      const self = this;
      return engine.api.store.subscribe(() => {
        callback(self.getState<T>(engine));
      });
    },

    // ========================================================================
    // Field Arrays
    // ========================================================================

    getFieldArray<TFieldValue>(
      engine: TanStackEngine,
      path: string
    ): FieldArrayMethods<TFieldValue> {
      const self = this;

      // Get or create stable ID map for this array path
      if (!engine.fieldIds.has(path)) {
        engine.fieldIds.set(path, new Map());
      }
      const idMap = engine.fieldIds.get(path)!;

      const getArray = (): TFieldValue[] => {
        const arr = getByPath(engine.api.state.values, path);
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
