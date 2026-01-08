import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUniversalForm } from './useUniversalForm';
import type {
  EngineAdapter,
  SchemaBridge,
  FieldError,
  FormState,
} from '@universal-form/core';

// Mock schema bridge
function createMockSchema<T extends Record<string, unknown>>(
  defaults: T
): SchemaBridge<unknown, T> {
  return {
    type: 'mock',
    schema: {},
    validate: vi.fn().mockReturnValue({ success: true, data: defaults }),
    validateAsync: vi.fn().mockResolvedValue({ success: true, data: defaults }),
    getFieldSchema: vi.fn().mockReturnValue({ type: 'string', required: true }),
    getDefaultValues: vi.fn().mockReturnValue(defaults),
    getFieldDefault: vi.fn().mockReturnValue(''),
    toJSONSchema: vi.fn().mockReturnValue({ type: 'object', properties: {} }),
    isAsync: vi.fn().mockReturnValue(false),
  };
}

// Mock engine type
interface MockEngine {
  values: Record<string, unknown>;
  errors: Record<string, FieldError>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  subscribers: Set<() => void>;
  fieldArrays: Map<string, { id: string; value: unknown }[]>;
  // Cache the state to avoid infinite re-renders with useSyncExternalStore
  _cachedState: FormState<Record<string, unknown>> | null;
}

// Mock adapter with internal state
function createMockAdapter(): EngineAdapter<MockEngine> {
  const getStateFromEngine = (
    engine: MockEngine
  ): FormState<Record<string, unknown>> => {
    // Return cached state if available (for stable references)
    if (!engine._cachedState) {
      engine._cachedState = {
        values: engine.values,
        errors: engine.errors,
        touched: engine.touched,
        dirty: engine.dirty,
        isSubmitting: engine.isSubmitting,
        isValid: engine.isValid,
        isDirty: engine.isDirty,
      };
    }
    return engine._cachedState;
  };

  const invalidateCache = (engine: MockEngine) => {
    engine._cachedState = null;
  };

  return {
    name: 'mock',
    createForm: vi.fn().mockImplementation(config => ({
      values: config.defaultValues || {},
      errors: {},
      touched: {},
      dirty: {},
      isSubmitting: false,
      isValid: true,
      isDirty: false,
      subscribers: new Set(),
      fieldArrays: new Map(),
      _cachedState: null,
    })),
    destroyForm: vi.fn(),
    getState: vi
      .fn()
      .mockImplementation((engine: MockEngine) => getStateFromEngine(engine)),
    getValue: vi.fn().mockImplementation((engine: MockEngine, path: string) => {
      const parts = path.split('.');
      let value: unknown = engine.values;
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return value;
    }),
    setValue: vi
      .fn()
      .mockImplementation(
        (engine: MockEngine, path: string, value: unknown) => {
          const parts = path.split('.');
          const last = parts.pop()!;
          let target: Record<string, unknown> = engine.values;
          for (const part of parts) {
            if (!target[part]) target[part] = {};
            target = target[part] as Record<string, unknown>;
          }
          target[last] = value;
          engine.isDirty = true;
          engine.dirty[path] = true;
          // Invalidate cache and notify subscribers
          invalidateCache(engine);
          engine.subscribers.forEach(cb => cb());
        }
      ),
    setValues: vi
      .fn()
      .mockImplementation(
        (engine: MockEngine, values: Record<string, unknown>) => {
          Object.assign(engine.values, values);
          engine.isDirty = true;
          invalidateCache(engine);
          engine.subscribers.forEach(cb => cb());
        }
      ),
    getError: vi
      .fn()
      .mockImplementation(
        (engine: MockEngine, path: string) => engine.errors[path]
      ),
    setError: vi
      .fn()
      .mockImplementation(
        (engine: MockEngine, path: string, error: FieldError) => {
          engine.errors[path] = error;
          engine.isValid = false;
          invalidateCache(engine);
          engine.subscribers.forEach(cb => cb());
        }
      ),
    clearErrors: vi
      .fn()
      .mockImplementation((engine: MockEngine, paths?: string[]) => {
        if (paths) {
          paths.forEach((p: string) => delete engine.errors[p]);
        } else {
          engine.errors = {};
        }
        engine.isValid = Object.keys(engine.errors).length === 0;
        invalidateCache(engine);
        engine.subscribers.forEach(cb => cb());
      }),
    register: vi
      .fn()
      .mockImplementation((_engine: MockEngine, path: string) => ({
        name: path,
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
      })),
    unregister: vi.fn(),
    getFieldState: vi
      .fn()
      .mockImplementation((engine: MockEngine, path: string) => ({
        value: engine.values[path],
        error: engine.errors[path],
        isTouched: engine.touched[path] || false,
        isDirty: engine.dirty[path] || false,
      })),
    reset: vi
      .fn()
      .mockImplementation(
        (engine: MockEngine, values?: Record<string, unknown>) => {
          if (values) {
            engine.values = { ...values };
          }
          engine.errors = {};
          engine.touched = {};
          engine.dirty = {};
          engine.isDirty = false;
          engine.isValid = true;
          invalidateCache(engine);
          engine.subscribers.forEach(cb => cb());
        }
      ),
    trigger: vi.fn().mockResolvedValue(true),
    handleSubmit: vi
      .fn()
      .mockImplementation(
        (
          engine: MockEngine,
          onValid: (data: Record<string, unknown>) => void | Promise<void>
        ) => {
          return async (event?: { preventDefault?: () => void }) => {
            event?.preventDefault?.();
            engine.isSubmitting = true;
            invalidateCache(engine);
            engine.subscribers.forEach(cb => cb());
            await onValid(engine.values);
            engine.isSubmitting = false;
            invalidateCache(engine);
            engine.subscribers.forEach(cb => cb());
          };
        }
      ),
    watch: vi
      .fn()
      .mockImplementation((engine: MockEngine, paths?: string[]) => {
        if (!paths) return engine.values;
        if (Array.isArray(paths)) {
          const result: Record<string, unknown> = {};
          paths.forEach(p => {
            result[p] = engine.values[p];
          });
          return result;
        }
        return engine.values[paths as unknown as string];
      }),
    subscribe: vi
      .fn()
      .mockImplementation((engine: MockEngine, callback: () => void) => {
        engine.subscribers.add(callback);
        return () => engine.subscribers.delete(callback);
      }),
    getFieldArray: vi
      .fn()
      .mockImplementation((engine: MockEngine, path: string) => {
        if (!engine.fieldArrays.has(path)) {
          engine.fieldArrays.set(path, []);
        }
        const items = engine.fieldArrays.get(path)!;
        let idCounter = items.length;
        return {
          fields: items,
          append: (value: unknown) => {
            items.push({ id: `${path}-${idCounter++}`, value });
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
          prepend: (value: unknown) => {
            items.unshift({ id: `${path}-${idCounter++}`, value });
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
          insert: (index: number, value: unknown) => {
            items.splice(index, 0, { id: `${path}-${idCounter++}`, value });
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
          remove: (index: number) => {
            items.splice(index, 1);
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
          swap: (indexA: number, indexB: number) => {
            [items[indexA], items[indexB]] = [items[indexB], items[indexA]];
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
          move: (from: number, to: number) => {
            const [item] = items.splice(from, 1);
            items.splice(to, 0, item);
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
          update: (index: number, value: unknown) => {
            items[index] = { ...items[index], value };
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
          replace: (values: unknown[]) => {
            items.length = 0;
            values.forEach(v => {
              items.push({ id: `${path}-${idCounter++}`, value: v });
            });
            engine.values[path] = items.map((i: { value: unknown }) => i.value);
          },
        };
      }),
    getErrors: vi
      .fn()
      .mockImplementation((engine: MockEngine) => engine.errors),
    getValues: vi
      .fn()
      .mockImplementation((engine: MockEngine) => engine.values),
  };
}

describe('useUniversalForm', () => {
  let mockAdapter: ReturnType<typeof createMockAdapter>;
  let mockSchema: SchemaBridge<unknown, { name: string; email: string }>;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    mockSchema = createMockSchema({ name: '', email: '' });
  });

  describe('initialization', () => {
    it('should create form with default values', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          defaultValues: { name: 'John', email: 'john@example.com' },
        })
      );

      expect(mockAdapter.createForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: expect.objectContaining({
            name: 'John',
            email: 'john@example.com',
          }),
        })
      );
      expect(result.current).toBeDefined();
    });

    it('should use schema default values when not provided', () => {
      renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(mockSchema.getDefaultValues).toHaveBeenCalled();
    });

    it('should use default mode onSubmit', () => {
      renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(mockAdapter.createForm).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'onSubmit',
        })
      );
    });

    it('should use custom validation mode', () => {
      renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          mode: 'onChange',
        })
      );

      expect(mockAdapter.createForm).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'onChange',
        })
      );
    });
  });

  describe('state management', () => {
    it('should return current form state', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          defaultValues: { name: 'John', email: 'john@example.com' },
        })
      );

      const state = result.current.getState();
      expect(state).toHaveProperty('values');
      expect(state).toHaveProperty('errors');
      expect(state).toHaveProperty('isSubmitting');
      expect(state).toHaveProperty('isValid');
      expect(state).toHaveProperty('isDirty');
    });

    it('should expose values directly', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          defaultValues: { name: 'John', email: 'john@example.com' },
        })
      );

      expect(result.current.values).toBeDefined();
    });

    it('should expose errors directly', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(result.current.errors).toBeDefined();
    });

    it('should expose isSubmitting', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should expose isValid', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(result.current.isValid).toBe(true);
    });

    it('should expose isDirty', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('value operations', () => {
    it('should get value by path', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          defaultValues: { name: 'John', email: 'john@example.com' },
        })
      );

      result.current.getValue('name');
      expect(mockAdapter.getValue).toHaveBeenCalled();
    });

    it('should set value by path', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.setValue('name', 'Jane');
      });

      expect(mockAdapter.setValue).toHaveBeenCalledWith(
        expect.anything(),
        'name',
        'Jane',
        undefined
      );
    });

    it('should set value with options', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.setValue('name', 'Jane', { shouldValidate: true });
      });

      expect(mockAdapter.setValue).toHaveBeenCalledWith(
        expect.anything(),
        'name',
        'Jane',
        { shouldValidate: true }
      );
    });

    it('should set multiple values', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.setValues({ name: 'Jane', email: 'jane@example.com' });
      });

      expect(mockAdapter.setValues).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'Jane', email: 'jane@example.com' },
        undefined
      );
    });
  });

  describe('error operations', () => {
    it('should get error by path', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      result.current.getError('name');
      expect(mockAdapter.getError).toHaveBeenCalled();
    });

    it('should set error by path', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.setError('name', {
          message: 'Required',
          type: 'required',
        });
      });

      expect(mockAdapter.setError).toHaveBeenCalled();
    });

    it('should set error from string', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.setError('name', 'Required');
      });

      expect(mockAdapter.setError).toHaveBeenCalledWith(
        expect.anything(),
        'name',
        expect.objectContaining({ message: 'Required' })
      );
    });

    it('should clear specific error', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.clearErrors('name');
      });

      expect(mockAdapter.clearErrors).toHaveBeenCalledWith(expect.anything(), [
        'name',
      ]);
    });

    it('should clear multiple errors', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.clearErrors(['name', 'email']);
      });

      expect(mockAdapter.clearErrors).toHaveBeenCalledWith(expect.anything(), [
        'name',
        'email',
      ]);
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.clearErrors();
      });

      expect(mockAdapter.clearErrors).toHaveBeenCalledWith(
        expect.anything(),
        undefined
      );
    });
  });

  describe('field registration', () => {
    it('should register a field', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      const props = result.current.register('name');
      expect(mockAdapter.register).toHaveBeenCalledWith(
        expect.anything(),
        'name'
      );
      expect(props).toHaveProperty('name', 'name');
      expect(props).toHaveProperty('onChange');
      expect(props).toHaveProperty('onBlur');
    });

    it('should get field state', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      const fieldState = result.current.getFieldState('name');
      expect(mockAdapter.getFieldState).toHaveBeenCalledWith(
        expect.anything(),
        'name'
      );
      expect(fieldState).toHaveProperty('isTouched');
      expect(fieldState).toHaveProperty('isDirty');
    });
  });

  describe('form operations', () => {
    it('should reset form', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.reset();
      });

      expect(mockAdapter.reset).toHaveBeenCalled();
    });

    it('should reset form with values', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      act(() => {
        result.current.reset({ name: 'New Name', email: 'new@example.com' });
      });

      expect(mockAdapter.reset).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'New Name', email: 'new@example.com' },
        undefined
      );
    });

    it('should trigger validation', async () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      await act(async () => {
        await result.current.trigger('name');
      });

      expect(mockAdapter.trigger).toHaveBeenCalledWith(expect.anything(), [
        'name',
      ]);
    });

    it('should trigger validation for multiple fields', async () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      await act(async () => {
        await result.current.trigger(['name', 'email']);
      });

      expect(mockAdapter.trigger).toHaveBeenCalledWith(expect.anything(), [
        'name',
        'email',
      ]);
    });

    it('should handle submit', async () => {
      const onValid = vi.fn();
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      const handler = result.current.handleSubmit(onValid);
      await act(async () => {
        await handler();
      });

      expect(mockAdapter.handleSubmit).toHaveBeenCalled();
    });

    it('should handle submit with invalid handler', async () => {
      const onValid = vi.fn();
      const onInvalid = vi.fn();
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      result.current.handleSubmit(onValid, onInvalid);
      expect(mockAdapter.handleSubmit).toHaveBeenCalled();
    });
  });

  describe('watch', () => {
    it('should watch all values', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          defaultValues: { name: 'John', email: 'john@example.com' },
        })
      );

      const values = result.current.watch();
      expect(values).toBeDefined();
    });

    it('should watch specific path', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          defaultValues: { name: 'John', email: 'john@example.com' },
        })
      );

      const value = result.current.watch('name');
      expect(value).toBeDefined();
    });

    it('should watch multiple paths', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
          defaultValues: { name: 'John', email: 'john@example.com' },
        })
      );

      const values = result.current.watch(['name', 'email']);
      expect(values).toBeDefined();
    });
  });

  describe('subscription', () => {
    it('should subscribe to state changes', () => {
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      const unsubscribe = result.current.subscribe(callback);
      expect(mockAdapter.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('field arrays', () => {
    it('should get field array methods', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      const fieldArray = result.current.getFieldArray('items');
      expect(mockAdapter.getFieldArray).toHaveBeenCalledWith(
        expect.anything(),
        'items'
      );
      expect(fieldArray).toHaveProperty('fields');
      expect(fieldArray).toHaveProperty('append');
      expect(fieldArray).toHaveProperty('remove');
    });
  });

  describe('engine access', () => {
    it('should provide access to engine', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(result.current.getEngine()).toBeDefined();
    });
  });

  describe('context', () => {
    it('should provide context with self-reference', () => {
      const { result } = renderHook(() =>
        useUniversalForm({
          schema: mockSchema,
          adapter: mockAdapter,
        })
      );

      expect(result.current.context).toBeDefined();
      expect(result.current.context.form).toBe(result.current);
    });
  });
});
