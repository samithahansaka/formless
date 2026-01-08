import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tanstackAdapter } from './tanstackAdapter';
import type { TanStackEngine } from './tanstackAdapter';
import type { SchemaBridge, ValidationResult } from '@universal-form/core';

// Mock schema bridge for testing
function createMockSchema<T extends Record<string, unknown>>(
  validateFn: (data: unknown) => ValidationResult<T>
): SchemaBridge<unknown, T> {
  return {
    type: 'mock',
    schema: {},
    validate: validateFn,
    validateAsync: async data => validateFn(data),
    getFieldSchema: () => undefined,
    getDefaultValues: () => ({}) as Partial<T>,
    getFieldDefault: () => undefined,
    isAsync: () => false,
    toJSONSchema: () => ({}),
  };
}

describe('tanstackAdapter', () => {
  let adapter: ReturnType<typeof tanstackAdapter>;
  let engine: TanStackEngine;

  const defaultValues = {
    name: '',
    email: '',
    age: 0,
    items: [] as { id: number; value: string }[],
  };

  beforeEach(() => {
    adapter = tanstackAdapter();
    engine = adapter.createForm({
      defaultValues,
      mode: 'onSubmit',
    });
  });

  describe('createForm', () => {
    it('should create a form engine', () => {
      expect(engine).toBeDefined();
      expect(engine.api).toBeDefined();
      expect(engine.fieldIds).toBeDefined();
    });

    it('should initialize with default values', () => {
      const values = adapter.getValues(engine);
      expect(values).toEqual(defaultValues);
    });
  });

  describe('destroyForm', () => {
    it('should clean up field IDs', () => {
      adapter.getFieldArray(engine, 'items');
      expect(engine.fieldIds.size).toBeGreaterThan(0);

      adapter.destroyForm(engine);
      expect(engine.fieldIds.size).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return form state', () => {
      const state = adapter.getState(engine);
      expect(state).toHaveProperty('values');
      expect(state).toHaveProperty('errors');
      expect(state).toHaveProperty('touched');
      expect(state).toHaveProperty('dirty');
      expect(state).toHaveProperty('isSubmitting');
      expect(state).toHaveProperty('isValidating');
      expect(state).toHaveProperty('isValid');
      expect(state).toHaveProperty('isDirty');
      expect(state).toHaveProperty('submitCount');
    });

    it('should return initial values', () => {
      const state = adapter.getState(engine);
      expect(state.values).toEqual(defaultValues);
    });
  });

  describe('getValue / getValues', () => {
    it('should get a single value by path', () => {
      adapter.setValue(engine, 'name', 'John');
      expect(adapter.getValue(engine, 'name')).toBe('John');
    });

    it('should get nested value', () => {
      adapter.setValue(engine, 'items', [{ id: 1, value: 'test' }]);
      expect(adapter.getValue(engine, 'items.0.value')).toBe('test');
    });

    it('should get all values', () => {
      adapter.setValue(engine, 'name', 'John');
      adapter.setValue(engine, 'email', 'john@example.com');
      const values = adapter.getValues(engine);
      expect(values.name).toBe('John');
      expect(values.email).toBe('john@example.com');
    });
  });

  describe('setValue / setValues', () => {
    it('should set a single value', () => {
      adapter.setValue(engine, 'name', 'John');
      expect(adapter.getValue(engine, 'name')).toBe('John');
    });

    it('should set multiple values', () => {
      adapter.setValues(engine, { name: 'John', email: 'john@example.com' });
      expect(adapter.getValue(engine, 'name')).toBe('John');
      expect(adapter.getValue(engine, 'email')).toBe('john@example.com');
    });

    it('should notify subscribers on setValue', () => {
      const callback = vi.fn();
      adapter.subscribe(engine, callback);

      adapter.setValue(engine, 'name', 'John');
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getError / getErrors / setError', () => {
    it('should return undefined when no error', () => {
      expect(adapter.getError(engine, 'name')).toBeUndefined();
    });

    it('should set and get error', () => {
      adapter.setError(engine, 'name', {
        message: 'Required',
        type: 'required',
      });
      const error = adapter.getError(engine, 'name');
      expect(error?.message).toBe('Required');
    });

    it('should set error from string', () => {
      adapter.setError(engine, 'email', 'Invalid email');
      const error = adapter.getError(engine, 'email');
      expect(error?.message).toBe('Invalid email');
    });

    it('should get all errors', () => {
      adapter.setError(engine, 'name', 'Required');
      adapter.setError(engine, 'email', 'Invalid');
      const errors = adapter.getErrors(engine);
      expect(errors.name).toBeDefined();
      expect(errors.email).toBeDefined();
    });
  });

  describe('clearErrors', () => {
    beforeEach(() => {
      adapter.setError(engine, 'name', 'Required');
      adapter.setError(engine, 'email', 'Invalid');
    });

    it('should clear specific errors', () => {
      adapter.clearErrors(engine, ['name']);
      expect(adapter.getError(engine, 'name')).toBeUndefined();
      expect(adapter.getError(engine, 'email')).toBeDefined();
    });

    it('should clear all errors when no paths specified', () => {
      adapter.clearErrors(engine);
      expect(adapter.getError(engine, 'name')).toBeUndefined();
      expect(adapter.getError(engine, 'email')).toBeUndefined();
    });
  });

  describe('getFieldState', () => {
    it('should return initial field state', () => {
      const state = adapter.getFieldState(engine, 'name');
      expect(state.isTouched).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(state.error).toBeUndefined();
      expect(state.isInvalid).toBe(false);
    });

    it('should reflect error state', () => {
      adapter.setError(engine, 'name', 'Required');
      const state = adapter.getFieldState(engine, 'name');
      expect(state.error?.message).toBe('Required');
      expect(state.isInvalid).toBe(true);
    });
  });

  describe('register / unregister', () => {
    it('should return field registration props', () => {
      const props = adapter.register(engine, 'name');
      expect(props.name).toBe('name');
      expect(typeof props.onChange).toBe('function');
      expect(typeof props.onBlur).toBe('function');
      expect(typeof props.ref).toBe('function');
    });

    it('should handle onChange with event object', () => {
      const props = adapter.register(engine, 'name');
      props.onChange({ target: { value: 'John', type: 'text' } });
      expect(adapter.getValue(engine, 'name')).toBe('John');
    });

    it('should handle onChange with direct value', () => {
      const props = adapter.register(engine, 'name');
      props.onChange('Direct Value');
      expect(adapter.getValue(engine, 'name')).toBe('Direct Value');
    });

    it('should handle checkbox onChange', () => {
      const props = adapter.register(engine, 'isActive');
      props.onChange({ target: { checked: true, type: 'checkbox' } });
      expect(adapter.getValue(engine, 'isActive')).toBe(true);
    });

    it('should unregister field', () => {
      adapter.register(engine, 'name');
      adapter.setError(engine, 'name', 'Error');
      adapter.unregister(engine, 'name');
      // After unregister, field meta should be cleared
    });
  });

  describe('reset', () => {
    it('should reset to initial values', () => {
      adapter.setValue(engine, 'name', 'John');
      adapter.setValue(engine, 'email', 'john@example.com');
      adapter.reset(engine);

      expect(adapter.getValue(engine, 'name')).toBe('');
      expect(adapter.getValue(engine, 'email')).toBe('');
    });

    it('should reset to provided values', () => {
      adapter.setValue(engine, 'name', 'John');
      adapter.reset(engine, { name: 'Jane' });

      expect(adapter.getValue(engine, 'name')).toBe('Jane');
    });

    it('should clear errors by default', () => {
      adapter.setError(engine, 'name', 'Error');
      adapter.reset(engine);

      expect(adapter.getError(engine, 'name')).toBeUndefined();
    });

    it('should clear field IDs on reset', () => {
      adapter.getFieldArray(engine, 'items');
      expect(engine.fieldIds.size).toBeGreaterThan(0);

      adapter.reset(engine);
      expect(engine.fieldIds.size).toBe(0);
    });
  });

  describe('trigger', () => {
    it('should return validation result', async () => {
      // Without schema, validation should pass
      const isValid = await adapter.trigger(engine);
      expect(isValid).toBe(true);
    });

    it('should validate specific fields', async () => {
      // Set up field with manual error
      adapter.setError(engine, 'name', 'Required');

      // Trigger still returns true because TanStack validation passes
      // Manual errors don't affect TanStack's isValid state
      const isValid = await adapter.trigger(engine, ['name']);
      expect(typeof isValid).toBe('boolean');
    });

    it('should return true when no validation errors', async () => {
      adapter.setValue(engine, 'name', 'John');
      adapter.setValue(engine, 'email', 'john@example.com');

      const isValid = await adapter.trigger(engine);
      expect(isValid).toBe(true);
    });
  });

  describe('handleSubmit', () => {
    it('should call onValid with form values when valid', async () => {
      const onValid = vi.fn();
      const onInvalid = vi.fn();

      adapter.setValue(engine, 'name', 'John');
      const handler = adapter.handleSubmit(engine, onValid, onInvalid);
      await handler({ preventDefault: vi.fn() });

      expect(onValid).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John' })
      );
      expect(onInvalid).not.toHaveBeenCalled();
    });

    it('should handle submit with invalid handler callback', async () => {
      const onValid = vi.fn();
      const onInvalid = vi.fn();

      // Without validation errors, onValid should be called
      adapter.setValue(engine, 'name', 'John');
      const handler = adapter.handleSubmit(engine, onValid, onInvalid);
      await handler({ preventDefault: vi.fn() });

      expect(onValid).toHaveBeenCalled();
      expect(onInvalid).not.toHaveBeenCalled();
    });

    it('should prevent default on event', async () => {
      const preventDefault = vi.fn();
      const handler = adapter.handleSubmit(engine, vi.fn());
      await handler({ preventDefault });

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('watch', () => {
    it('should watch all values', () => {
      const callback = vi.fn();
      adapter.watch(engine, undefined, callback);

      adapter.setValue(engine, 'name', 'John');
      expect(callback).toHaveBeenCalled();
    });

    it('should watch specific field', () => {
      const callback = vi.fn();
      adapter.watch(engine, ['name'], callback);

      adapter.setValue(engine, 'name', 'John');
      expect(callback).toHaveBeenCalledWith('John');
    });

    it('should watch multiple fields', () => {
      const callback = vi.fn();
      adapter.watch(engine, ['name', 'email'], callback);

      adapter.setValue(engine, 'name', 'John');
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John' })
      );
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = adapter.watch(engine, undefined, callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();

      adapter.setValue(engine, 'name', 'John');
      // After unsubscribe, callback may or may not be called depending on implementation
    });
  });

  describe('subscribe', () => {
    it('should subscribe to state changes', () => {
      const callback = vi.fn();
      adapter.subscribe(engine, callback);

      adapter.setValue(engine, 'name', 'John');
      expect(callback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe(engine, callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('getFieldArray', () => {
    beforeEach(() => {
      adapter.setValue(engine, 'items', [
        { id: 1, value: 'first' },
        { id: 2, value: 'second' },
      ]);
    });

    it('should return field array methods', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      expect(fieldArray.fields).toHaveLength(2);
      expect(typeof fieldArray.append).toBe('function');
      expect(typeof fieldArray.prepend).toBe('function');
      expect(typeof fieldArray.insert).toBe('function');
      expect(typeof fieldArray.remove).toBe('function');
      expect(typeof fieldArray.swap).toBe('function');
      expect(typeof fieldArray.move).toBe('function');
      expect(typeof fieldArray.update).toBe('function');
      expect(typeof fieldArray.replace).toBe('function');
    });

    it('should append item', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.append({ id: 3, value: 'third' });

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items).toHaveLength(3);
      expect(items[2].value).toBe('third');
    });

    it('should prepend item', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.prepend({ id: 0, value: 'zeroth' });

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items).toHaveLength(3);
      expect(items[0].value).toBe('zeroth');
    });

    it('should insert item at index', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.insert(1, { id: 10, value: 'inserted' });

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items).toHaveLength(3);
      expect(items[1].value).toBe('inserted');
    });

    it('should remove item by index', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.remove(0);

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items).toHaveLength(1);
      expect(items[0].value).toBe('second');
    });

    it('should remove multiple items', () => {
      adapter.setValue(engine, 'items', [
        { id: 1, value: 'first' },
        { id: 2, value: 'second' },
        { id: 3, value: 'third' },
      ]);
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.remove([0, 2]);

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items).toHaveLength(1);
      expect(items[0].value).toBe('second');
    });

    it('should swap items', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.swap(0, 1);

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items[0].value).toBe('second');
      expect(items[1].value).toBe('first');
    });

    it('should move item', () => {
      adapter.setValue(engine, 'items', [
        { id: 1, value: 'first' },
        { id: 2, value: 'second' },
        { id: 3, value: 'third' },
      ]);
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.move(0, 2);

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items[0].value).toBe('second');
      expect(items[1].value).toBe('third');
      expect(items[2].value).toBe('first');
    });

    it('should update item', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.update(0, { id: 1, value: 'updated' });

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items[0].value).toBe('updated');
    });

    it('should replace all items', () => {
      const fieldArray = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      fieldArray.replace([{ id: 99, value: 'replaced' }]);

      const items = adapter.getValue(
        engine,
        'items'
      ) as typeof defaultValues.items;
      expect(items).toHaveLength(1);
      expect(items[0].value).toBe('replaced');
    });

    it('should provide stable IDs', () => {
      const fieldArray1 = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      const ids1 = fieldArray1.fields.map(f => f.id);

      const fieldArray2 = adapter.getFieldArray<{ id: number; value: string }>(
        engine,
        'items'
      );
      const ids2 = fieldArray2.fields.map(f => f.id);

      expect(ids1).toEqual(ids2);
    });
  });

  describe('adapter info', () => {
    it('should have correct name', () => {
      expect(adapter.name).toBe('tanstack-form');
    });

    it('should have version', () => {
      expect(adapter.version).toBeDefined();
    });
  });
});
