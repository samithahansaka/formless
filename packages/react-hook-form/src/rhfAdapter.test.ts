import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rhfAdapter } from './rhfAdapter';
import type { RHFEngine } from './rhfAdapter';
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

describe('rhfAdapter', () => {
  let adapter: ReturnType<typeof rhfAdapter>;
  let engine: RHFEngine;

  const defaultValues = {
    name: '',
    email: '',
    age: 0,
    items: [] as { id: number; value: string }[],
  };

  beforeEach(() => {
    adapter = rhfAdapter();
    engine = adapter.createForm({
      defaultValues,
      mode: 'onSubmit',
    });
  });

  describe('createForm', () => {
    it('should create a form engine', () => {
      expect(engine).toBeDefined();
      expect(engine.values).toBeDefined();
      expect(engine.fieldMeta).toBeDefined();
      expect(engine.subscribers).toBeDefined();
    });

    it('should initialize with default values', () => {
      const values = adapter.getValues(engine);
      expect(values).toEqual(defaultValues);
    });

    it('should store the schema', () => {
      const schema = createMockSchema(() => ({
        success: true,
        data: defaultValues,
      }));
      const engineWithSchema = adapter.createForm({
        defaultValues,
        mode: 'onSubmit',
        schema,
      });
      expect(engineWithSchema.schema).toBeDefined();
    });
  });

  describe('destroyForm', () => {
    it('should clean up resources', () => {
      const callback = vi.fn();
      adapter.subscribe(engine, callback);
      expect(engine.subscribers.size).toBeGreaterThan(0);

      adapter.destroyForm(engine);
      expect(engine.subscribers.size).toBe(0);
      expect(engine.fieldMeta.size).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return complete form state', () => {
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

    it('should return initial isValid as true', () => {
      const state = adapter.getState(engine);
      expect(state.isValid).toBe(true);
    });

    it('should return isValid false when errors exist', () => {
      adapter.setError(engine, 'name', 'Required');
      const state = adapter.getState(engine);
      expect(state.isValid).toBe(false);
    });
  });

  describe('getValue / getValues', () => {
    it('should get a single value', () => {
      adapter.setValue(engine, 'name', 'John');
      expect(adapter.getValue(engine, 'name')).toBe('John');
    });

    it('should get nested value', () => {
      adapter.setValue(engine, 'items', [{ id: 1, value: 'test' }]);
      expect(adapter.getValue(engine, 'items.0.value')).toBe('test');
    });

    it('should get all values', () => {
      adapter.setValue(engine, 'name', 'John');
      const values = adapter.getValues(engine);
      expect(values.name).toBe('John');
    });
  });

  describe('setValue / setValues', () => {
    it('should set a single value', () => {
      adapter.setValue(engine, 'name', 'John');
      expect(adapter.getValue(engine, 'name')).toBe('John');
    });

    it('should mark field as dirty by default', () => {
      adapter.setValue(engine, 'name', 'John');
      const state = adapter.getFieldState(engine, 'name');
      expect(state.isDirty).toBe(true);
    });

    it('should not mark dirty when shouldDirty is false', () => {
      adapter.setValue(engine, 'name', 'John', { shouldDirty: false });
      const state = adapter.getFieldState(engine, 'name');
      expect(state.isDirty).toBe(false);
    });

    it('should set multiple values', () => {
      adapter.setValues(engine, { name: 'John', email: 'john@example.com' });
      expect(adapter.getValue(engine, 'name')).toBe('John');
      expect(adapter.getValue(engine, 'email')).toBe('john@example.com');
    });

    it('should notify subscribers on value change', () => {
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

    it('should set and get error object', () => {
      adapter.setError(engine, 'name', {
        message: 'Required',
        type: 'required',
      });
      const error = adapter.getError(engine, 'name');
      expect(error?.message).toBe('Required');
      expect(error?.type).toBe('required');
    });

    it('should set error from string', () => {
      adapter.setError(engine, 'email', 'Invalid email');
      const error = adapter.getError(engine, 'email');
      expect(error?.message).toBe('Invalid email');
      expect(error?.type).toBe('manual');
    });

    it('should get all errors', () => {
      adapter.setError(engine, 'name', 'Required');
      adapter.setError(engine, 'email', 'Invalid');
      const errors = adapter.getErrors(engine);
      expect(Object.keys(errors)).toHaveLength(2);
    });

    it('should not set error for undefined/null', () => {
      adapter.setError(engine, 'name', undefined as unknown as string);
      expect(adapter.getError(engine, 'name')).toBeUndefined();
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

    it('should reflect touched state', () => {
      const props = adapter.register(engine, 'name');
      props.onBlur(null);
      const state = adapter.getFieldState(engine, 'name');
      expect(state.isTouched).toBe(true);
    });

    it('should reflect error state', () => {
      adapter.setError(engine, 'name', 'Required');
      const state = adapter.getFieldState(engine, 'name');
      expect(state.error?.message).toBe('Required');
      expect(state.isInvalid).toBe(true);
    });
  });

  describe('register', () => {
    it('should return field registration props', () => {
      const props = adapter.register(engine, 'name');
      expect(props.name).toBe('name');
      expect(typeof props.onChange).toBe('function');
      expect(typeof props.onBlur).toBe('function');
      expect(typeof props.ref).toBe('function');
    });

    it('should initialize field meta on register', () => {
      adapter.register(engine, 'newField');
      expect(engine.fieldMeta.has('newField')).toBe(true);
    });

    it('should handle text input onChange', () => {
      const props = adapter.register(engine, 'name');
      props.onChange({ target: { value: 'John', type: 'text' } });
      expect(adapter.getValue(engine, 'name')).toBe('John');
    });

    it('should handle checkbox onChange', () => {
      const props = adapter.register(engine, 'isActive');
      props.onChange({ target: { checked: true, type: 'checkbox' } });
      expect(adapter.getValue(engine, 'isActive')).toBe(true);
    });

    it('should handle direct value onChange', () => {
      const props = adapter.register(engine, 'name');
      props.onChange('Direct Value');
      expect(adapter.getValue(engine, 'name')).toBe('Direct Value');
    });

    it('should mark as touched on blur', () => {
      const props = adapter.register(engine, 'name');
      props.onBlur(null);
      const state = adapter.getFieldState(engine, 'name');
      expect(state.isTouched).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove field meta', () => {
      adapter.register(engine, 'name');
      expect(engine.fieldMeta.has('name')).toBe(true);

      adapter.unregister(engine, 'name');
      expect(engine.fieldMeta.has('name')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial values', () => {
      adapter.setValue(engine, 'name', 'John');
      adapter.reset(engine);
      expect(adapter.getValue(engine, 'name')).toBe('');
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

    it('should keep errors if specified', () => {
      adapter.setError(engine, 'name', 'Error');
      adapter.reset(engine, undefined, { keepErrors: true });
      expect(adapter.getError(engine, 'name')).toBeDefined();
    });

    it('should reset submitCount', () => {
      engine.submitCount = 5;
      adapter.reset(engine);
      expect(engine.submitCount).toBe(0);
    });
  });

  describe('trigger', () => {
    it('should validate all fields with schema', async () => {
      const schema = createMockSchema(data => {
        const d = data as typeof defaultValues;
        if (!d.name) {
          return {
            success: false,
            errors: [{ path: 'name', message: 'Required', type: 'required' }],
          };
        }
        return { success: true, data: d };
      });

      const engineWithSchema = adapter.createForm({
        defaultValues,
        mode: 'onSubmit',
        schema,
      });

      const isValid = await adapter.trigger(engineWithSchema);
      expect(isValid).toBe(false);
      expect(adapter.getError(engineWithSchema, 'name')).toBeDefined();
    });

    it('should validate specific fields', async () => {
      const schema = createMockSchema(data => {
        const errors = [];
        const d = data as typeof defaultValues;
        if (!d.name)
          errors.push({ path: 'name', message: 'Required', type: 'required' });
        if (!d.email)
          errors.push({ path: 'email', message: 'Required', type: 'required' });
        return errors.length
          ? { success: false, errors }
          : { success: true, data: d };
      });

      const engineWithSchema = adapter.createForm({
        defaultValues,
        mode: 'onSubmit',
        schema,
      });

      const isValid = await adapter.trigger(engineWithSchema, ['name']);
      expect(isValid).toBe(false);
    });

    it('should return true without schema', async () => {
      const isValid = await adapter.trigger(engine);
      expect(isValid).toBe(true);
    });

    it('should set isValidating during validation', async () => {
      let wasValidating = false;
      adapter.subscribe(engine, state => {
        if (state.isValidating) wasValidating = true;
      });

      await adapter.trigger(engine);
      // The state should have been validating at some point
    });
  });

  describe('handleSubmit', () => {
    it('should call onValid with form values when valid', async () => {
      const onValid = vi.fn();
      adapter.setValue(engine, 'name', 'John');

      const handler = adapter.handleSubmit(engine, onValid);
      await handler({ preventDefault: vi.fn() });

      expect(onValid).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John' })
      );
    });

    it('should call onInvalid when validation fails', async () => {
      const schema = createMockSchema(data => {
        const d = data as typeof defaultValues;
        if (!d.name) {
          return {
            success: false,
            errors: [{ path: 'name', message: 'Required', type: 'required' }],
          };
        }
        return { success: true, data: d };
      });

      const engineWithSchema = adapter.createForm({
        defaultValues,
        mode: 'onSubmit',
        schema,
      });

      const onValid = vi.fn();
      const onInvalid = vi.fn();

      const handler = adapter.handleSubmit(
        engineWithSchema,
        onValid,
        onInvalid
      );
      await handler({ preventDefault: vi.fn() });

      expect(onValid).not.toHaveBeenCalled();
      expect(onInvalid).toHaveBeenCalled();
    });

    it('should increment submitCount', async () => {
      expect(engine.submitCount).toBe(0);

      const handler = adapter.handleSubmit(engine, vi.fn());
      await handler({ preventDefault: vi.fn() });

      expect(engine.submitCount).toBe(1);
    });

    it('should set isSubmitting during submission', async () => {
      let wasSubmitting = false;

      const onValid = vi.fn(() => {
        if (engine.isSubmitting) wasSubmitting = true;
      });

      const handler = adapter.handleSubmit(engine, onValid);
      await handler();

      expect(wasSubmitting).toBe(true);
      expect(engine.isSubmitting).toBe(false);
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

      unsubscribe();
      adapter.setValue(engine, 'name', 'John');
      // callback should not be called after unsubscribe
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

    it('should remove item', () => {
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
      expect(adapter.name).toBe('react-hook-form');
    });

    it('should have version', () => {
      expect(adapter.version).toBeDefined();
    });
  });
});
