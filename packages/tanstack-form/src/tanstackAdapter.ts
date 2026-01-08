import { FormApi } from '@tanstack/form-core';
import type { ValidationCause } from '@tanstack/form-core';
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
  generateId,
  normalizeFieldError,
} from '@samithahansaka/formless-core';

// ============================================================================
// Types
// ============================================================================

/**
 * Internal field metadata managed by our adapter
 */
interface AdapterFieldMeta {
  isTouched: boolean;
  isDirty: boolean;
  errors: string[];
}

/**
 * Internal adapter state
 */
interface AdapterState {
  fieldMeta: Record<string, AdapterFieldMeta>;
  isSubmitting: boolean;
  formErrors: string[];
}

/**
 * Simplified FormApi interface for our adapter
 * We abstract over the complex TanStack v1 generics
 */
interface SimplifiedFormApi<T extends Record<string, unknown>> {
  state: {
    values: T;
    fieldMeta: Record<
      string,
      { errors?: string[]; isTouched?: boolean; isDirty?: boolean }
    >;
    isSubmitting: boolean;
    isValidating: boolean;
    isValid: boolean;
    isDirty: boolean;
    submissionAttempts: number;
  };
  store: {
    subscribe: (callback: () => void) => () => void;
  };
  mount: () => void;
  setFieldValue: (
    path: string,
    value: unknown,
    options?: { dontUpdateMeta?: boolean }
  ) => void;
  validateField: (path: string, trigger: ValidationCause) => Promise<unknown[]>;
  validateAllFields: (trigger: ValidationCause) => Promise<unknown[]>;
  reset: (values?: T) => void;
}

/**
 * TanStack Form engine instance wrapping the actual FormApi
 */
export interface TanStackEngine {
  /** The actual TanStack FormApi instance (simplified interface) */
  api: SimplifiedFormApi<Record<string, unknown>>;
  /** Our adapter-managed state for field metadata */
  adapterState: AdapterState;
  /** Subscribers for state changes */
  subscribers: Set<() => void>;
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
 */
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
        ) as Record<string, string>,
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

/**
 * Create default field metadata
 */
function createDefaultFieldMeta(): AdapterFieldMeta {
  return {
    isTouched: false,
    isDirty: false,
    errors: [],
  };
}

/**
 * Sync errors from TanStack form state to our adapter state
 */
function syncErrorsFromForm(engine: TanStackEngine): void {
  const formFieldMeta = engine.api.state.fieldMeta;

  for (const [path, meta] of Object.entries(formFieldMeta)) {
    if (!engine.adapterState.fieldMeta[path]) {
      engine.adapterState.fieldMeta[path] = createDefaultFieldMeta();
    }
    if (meta?.errors?.length) {
      engine.adapterState.fieldMeta[path].errors = [...meta.errors];
    }
    if (meta?.isTouched) {
      engine.adapterState.fieldMeta[path].isTouched = true;
    }
    if (meta?.isDirty) {
      engine.adapterState.fieldMeta[path].isDirty = true;
    }
  }
}

/**
 * Notify all subscribers of state changes
 */
function notifySubscribers(engine: TanStackEngine): void {
  engine.subscribers.forEach(cb => cb());
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
 * import { useUniversalForm } from '@samithahansaka/formless-react';
 * import { tanstackAdapter } from '@samithahansaka/formless-tanstack-form';
 * import { zodBridge } from '@samithahansaka/formless-zod';
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
    version: '1.x',

    // ========================================================================
    // Lifecycle
    // ========================================================================

    createForm<T extends Record<string, unknown>>(
      config: AdapterConfig<T>
    ): TanStackEngine {
      const validators = createValidators(config.mode, config.schema);

      // Create FormApi instance using type assertion to avoid complex generics
      const api = new FormApi({
        defaultValues: config.defaultValues,
        asyncDebounceMs: options?.asyncDebounceMs,
        validators: validators as never,
      } as never) as unknown as SimplifiedFormApi<T>;

      // Mount the form
      api.mount();

      const engine: TanStackEngine = {
        api: api as SimplifiedFormApi<Record<string, unknown>>,
        adapterState: {
          fieldMeta: {},
          isSubmitting: false,
          formErrors: [],
        },
        subscribers: new Set(),
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
      engine.subscribers.clear();
      engine.fieldIds.clear();
    },

    // ========================================================================
    // State Access
    // ========================================================================

    getState<T extends Record<string, unknown>>(
      engine: TanStackEngine
    ): FormState<T> {
      syncErrorsFromForm(engine);

      const touched: Record<string, boolean> = {};
      const dirty: Record<string, boolean> = {};
      const errors: Record<string, FieldError> = {};

      for (const [path, meta] of Object.entries(
        engine.adapterState.fieldMeta
      )) {
        if (meta.isTouched) touched[path] = true;
        if (meta.isDirty) dirty[path] = true;
        if (meta.errors.length) {
          errors[path] = { message: meta.errors[0], type: 'validation' };
        }
      }

      return {
        values: engine.api.state.values as T,
        errors: errors as FormState<T>['errors'],
        touched: touched as FormState<T>['touched'],
        dirty: dirty as FormState<T>['dirty'],
        isSubmitting: engine.adapterState.isSubmitting,
        isValidating: engine.api.state.isValidating,
        isValid: engine.api.state.isValid,
        isDirty: engine.api.state.isDirty,
        submitCount: engine.api.state.submissionAttempts,
      };
    },

    getValue(engine: TanStackEngine, path: string): unknown {
      return getByPath(engine.api.state.values, path);
    },

    getValues<T extends Record<string, unknown>>(engine: TanStackEngine): T {
      return engine.api.state.values as T;
    },

    getError(engine: TanStackEngine, path: string): FieldError | undefined {
      syncErrorsFromForm(engine);
      const meta = engine.adapterState.fieldMeta[path];
      return meta?.errors.length
        ? { message: meta.errors[0], type: 'validation' }
        : undefined;
    },

    getErrors(engine: TanStackEngine): Record<string, FieldError> {
      syncErrorsFromForm(engine);
      const errors: Record<string, FieldError> = {};
      for (const [path, meta] of Object.entries(
        engine.adapterState.fieldMeta
      )) {
        if (meta.errors.length) {
          errors[path] = { message: meta.errors[0], type: 'validation' };
        }
      }
      return errors;
    },

    getFieldState(engine: TanStackEngine, path: string): FieldState {
      syncErrorsFromForm(engine);
      const meta =
        engine.adapterState.fieldMeta[path] || createDefaultFieldMeta();
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

    // ========================================================================
    // State Mutations
    // ========================================================================

    setValue(
      engine: TanStackEngine,
      path: string,
      value: unknown,
      opts?: { shouldValidate?: boolean; shouldDirty?: boolean }
    ): void {
      engine.api.setFieldValue(path as never, value as never, {
        dontUpdateMeta: opts?.shouldDirty === false,
      });

      if (opts?.shouldDirty !== false) {
        if (!engine.adapterState.fieldMeta[path]) {
          engine.adapterState.fieldMeta[path] = createDefaultFieldMeta();
        }
        engine.adapterState.fieldMeta[path].isDirty = true;
      }

      if (opts?.shouldValidate) {
        engine.api.validateField(path as never, 'change');
      }

      notifySubscribers(engine);
    },

    setValues<T extends Record<string, unknown>>(
      engine: TanStackEngine,
      values: Partial<T>,
      opts?: { shouldValidate?: boolean }
    ): void {
      for (const [key, value] of Object.entries(values)) {
        engine.api.setFieldValue(key as never, value as never);
      }

      if (opts?.shouldValidate) {
        engine.api.validateAllFields('change');
      }

      notifySubscribers(engine);
    },

    setError(
      engine: TanStackEngine,
      path: string,
      error: FieldError | string
    ): void {
      const normalized = normalizeFieldError(error);
      if (!normalized?.message) return;

      if (!engine.adapterState.fieldMeta[path]) {
        engine.adapterState.fieldMeta[path] = createDefaultFieldMeta();
      }
      engine.adapterState.fieldMeta[path].errors = [normalized.message];
      notifySubscribers(engine);
    },

    clearErrors(engine: TanStackEngine, paths?: string[]): void {
      const keys = paths || Object.keys(engine.adapterState.fieldMeta);
      for (const key of keys) {
        if (engine.adapterState.fieldMeta[key]) {
          engine.adapterState.fieldMeta[key].errors = [];
        }
      }
      engine.adapterState.formErrors = [];
      notifySubscribers(engine);
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
          if (!engine.adapterState.fieldMeta[path]) {
            engine.adapterState.fieldMeta[path] = createDefaultFieldMeta();
          }
          engine.adapterState.fieldMeta[path].isTouched = true;

          const mode = engine.mode;
          if (mode === 'onBlur' || mode === 'onTouched' || mode === 'all') {
            engine.api.validateField(path as never, 'blur');
          }
          notifySubscribers(engine);
        },

        onChange: (event: unknown) => {
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
      delete engine.adapterState.fieldMeta[path];
      notifySubscribers(engine);
    },

    // ========================================================================
    // Form Operations
    // ========================================================================

    reset<T extends Record<string, unknown>>(
      engine: TanStackEngine,
      values?: Partial<T>,
      opts?: { keepErrors?: boolean }
    ): void {
      const resetValues = values
        ? { ...engine.defaultValues, ...values }
        : engine.defaultValues;

      engine.api.reset(resetValues as never);

      if (!opts?.keepErrors) {
        for (const key of Object.keys(engine.adapterState.fieldMeta)) {
          engine.adapterState.fieldMeta[key].errors = [];
        }
        engine.adapterState.formErrors = [];
      }

      // Reset touched/dirty state
      for (const key of Object.keys(engine.adapterState.fieldMeta)) {
        engine.adapterState.fieldMeta[key].isTouched = false;
        engine.adapterState.fieldMeta[key].isDirty = false;
      }

      engine.fieldIds.clear();
      notifySubscribers(engine);
    },

    async trigger(engine: TanStackEngine, paths?: string[]): Promise<boolean> {
      if (paths?.length) {
        const results = await Promise.all(
          paths.map(p => engine.api.validateField(p as never, 'submit'))
        );
        syncErrorsFromForm(engine);
        return results.every(r => !r || (Array.isArray(r) && r.length === 0));
      }

      await engine.api.validateAllFields('submit');
      syncErrorsFromForm(engine);
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

        engine.adapterState.isSubmitting = true;
        notifySubscribers(engine);

        try {
          await engine.api.validateAllFields('submit');
          syncErrorsFromForm(engine);

          if (engine.api.state.isValid) {
            await onValid(engine.api.state.values as T);
          } else if (onInvalid) {
            onInvalid(self.getErrors(engine));
          }
        } catch {
          if (onInvalid) {
            onInvalid(self.getErrors(engine));
          }
        } finally {
          engine.adapterState.isSubmitting = false;
          notifySubscribers(engine);
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
      const wrappedCallback = () => {
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
      };

      engine.subscribers.add(wrappedCallback);
      const unsubForm = engine.api.store.subscribe(wrappedCallback);

      return () => {
        engine.subscribers.delete(wrappedCallback);
        unsubForm();
      };
    },

    subscribe<T extends Record<string, unknown>>(
      engine: TanStackEngine,
      callback: (state: FormState<T>) => void
    ): () => void {
      const self = this;

      const wrappedCallback = () => {
        callback(self.getState<T>(engine));
      };

      engine.subscribers.add(wrappedCallback);
      const unsubForm = engine.api.store.subscribe(wrappedCallback);

      return () => {
        engine.subscribers.delete(wrappedCallback);
        unsubForm();
      };
    },

    // ========================================================================
    // Field Arrays
    // ========================================================================

    getFieldArray<TFieldValue>(
      engine: TanStackEngine,
      path: string
    ): FieldArrayMethods<TFieldValue> {
      const self = this;

      if (!engine.fieldIds.has(path)) {
        engine.fieldIds.set(path, new Map());
      }
      const idMap = engine.fieldIds.get(path)!;

      const getArray = (): TFieldValue[] => {
        const arr = getByPath(engine.api.state.values, path);
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
