import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodBridge } from './zodBridge';

describe('zodBridge', () => {
  describe('creation', () => {
    it('should create a bridge from a ZodObject', () => {
      const schema = z.object({
        name: z.string(),
      });
      const bridge = zodBridge(schema);
      expect(bridge.type).toBe('zod');
      expect(bridge.schema).toBe(schema);
    });

    it('should create a bridge from a refined ZodObject', () => {
      const schema = z
        .object({
          password: z.string(),
          confirmPassword: z.string(),
        })
        .refine(data => data.password === data.confirmPassword, {
          message: 'Passwords must match',
          path: ['confirmPassword'],
        });
      const bridge = zodBridge(schema);
      expect(bridge.type).toBe('zod');
    });
  });

  describe('validate', () => {
    const schema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email'),
      age: z.number().min(0, 'Age must be positive').optional(),
    });
    const bridge = zodBridge(schema);

    it('should return success for valid data', () => {
      const result = bridge.validate({
        name: 'John',
        email: 'john@example.com',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should return errors for invalid data', () => {
      const result = bridge.validate({
        name: 'J',
        email: 'invalid',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should return correct error paths', () => {
      const result = bridge.validate({
        name: 'J',
        email: 'invalid',
      });
      expect(result.success).toBe(false);
      const paths = result.errors?.map(e => e.path);
      expect(paths).toContain('name');
      expect(paths).toContain('email');
    });

    it('should return correct error messages', () => {
      const result = bridge.validate({
        name: 'J',
        email: 'john@example.com',
      });
      expect(result.success).toBe(false);
      const nameError = result.errors?.find(e => e.path === 'name');
      expect(nameError?.message).toBe('Name must be at least 2 characters');
    });

    it('should handle optional fields', () => {
      const result = bridge.validate({
        name: 'John',
        email: 'john@example.com',
        age: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should validate optional field when provided', () => {
      const result = bridge.validate({
        name: 'John',
        email: 'john@example.com',
        age: -5,
      });
      expect(result.success).toBe(false);
      const ageError = result.errors?.find(e => e.path === 'age');
      expect(ageError?.message).toBe('Age must be positive');
    });
  });

  describe('validateAsync', () => {
    const schema = z.object({
      email: z.string().email(),
    });
    const bridge = zodBridge(schema);

    it('should validate asynchronously', async () => {
      const result = await bridge.validateAsync({ email: 'test@example.com' });
      expect(result.success).toBe(true);
    });

    it('should return async validation errors', async () => {
      const result = await bridge.validateAsync({ email: 'invalid' });
      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('getFieldSchema', () => {
    const schema = z.object({
      name: z.string().min(2).max(50),
      age: z.number().min(0).max(150),
      role: z.enum(['admin', 'user', 'guest']),
      isActive: z.boolean(),
      tags: z.array(z.string()),
      profile: z.object({
        bio: z.string().optional(),
        avatar: z.string().url(),
      }),
    });
    const bridge = zodBridge(schema);

    it('should return string field schema', () => {
      const fieldSchema = bridge.getFieldSchema('name');
      expect(fieldSchema?.type).toBe('string');
      expect(fieldSchema?.required).toBe(true);
      expect(fieldSchema?.min).toBe(2);
      expect(fieldSchema?.max).toBe(50);
    });

    it('should return number field schema', () => {
      const fieldSchema = bridge.getFieldSchema('age');
      expect(fieldSchema?.type).toBe('number');
      expect(fieldSchema?.min).toBe(0);
      expect(fieldSchema?.max).toBe(150);
    });

    it('should return enum field schema', () => {
      const fieldSchema = bridge.getFieldSchema('role');
      expect(fieldSchema?.type).toBe('enum');
      expect(fieldSchema?.options).toEqual([
        { label: 'admin', value: 'admin' },
        { label: 'user', value: 'user' },
        { label: 'guest', value: 'guest' },
      ]);
    });

    it('should return boolean field schema', () => {
      const fieldSchema = bridge.getFieldSchema('isActive');
      expect(fieldSchema?.type).toBe('boolean');
    });

    it('should return array field schema', () => {
      const fieldSchema = bridge.getFieldSchema('tags');
      expect(fieldSchema?.type).toBe('array');
      expect(fieldSchema?.items?.type).toBe('string');
    });

    it('should return object field schema', () => {
      const fieldSchema = bridge.getFieldSchema('profile');
      expect(fieldSchema?.type).toBe('object');
      expect(fieldSchema?.properties).toBeDefined();
      expect(fieldSchema?.properties?.bio).toBeDefined();
      expect(fieldSchema?.properties?.avatar).toBeDefined();
    });

    it('should return nested field schema', () => {
      const fieldSchema = bridge.getFieldSchema('profile.bio');
      expect(fieldSchema?.type).toBe('string');
      expect(fieldSchema?.required).toBe(false);
    });

    it('should return undefined for non-existent path', () => {
      const fieldSchema = bridge.getFieldSchema('nonexistent');
      expect(fieldSchema).toBeUndefined();
    });

    it('should handle array index paths', () => {
      const fieldSchema = bridge.getFieldSchema('tags.0');
      expect(fieldSchema?.type).toBe('string');
    });
  });

  describe('getDefaultValues', () => {
    it('should return empty defaults for required fields', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
        tags: z.array(z.string()),
      });
      const bridge = zodBridge(schema);
      const defaults = bridge.getDefaultValues();

      expect(defaults.name).toBe('');
      expect(defaults.age).toBe(0);
      expect(defaults.active).toBe(false);
      expect(defaults.tags).toEqual([]);
    });

    it('should return explicit defaults', () => {
      const schema = z.object({
        name: z.string().default('Anonymous'),
        count: z.number().default(10),
      });
      const bridge = zodBridge(schema);
      const defaults = bridge.getDefaultValues();

      expect(defaults.name).toBe('Anonymous');
      expect(defaults.count).toBe(10);
    });
  });

  describe('getFieldDefault', () => {
    const schema = z.object({
      name: z.string().default('Default Name'),
      age: z.number(),
    });
    const bridge = zodBridge(schema);

    it('should return explicit field default', () => {
      expect(bridge.getFieldDefault('name')).toBe('Default Name');
    });

    it('should return type-based default for fields without explicit default', () => {
      expect(bridge.getFieldDefault('age')).toBe(0);
    });
  });

  describe('toJSONSchema', () => {
    it('should convert to basic JSON Schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      });
      const bridge = zodBridge(schema);
      const jsonSchema = bridge.toJSONSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(
        (jsonSchema.properties as Record<string, { type: string }>).name.type
      ).toBe('string');
      expect(
        (jsonSchema.properties as Record<string, { type: string }>).age.type
      ).toBe('number');
      expect(
        (jsonSchema.properties as Record<string, { type: string }>).active.type
      ).toBe('boolean');
    });

    it('should convert nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });
      const bridge = zodBridge(schema);
      const jsonSchema = bridge.toJSONSchema();
      const userProp = (
        jsonSchema.properties as Record<string, Record<string, unknown>>
      ).user;

      expect(userProp.type).toBe('object');
      expect(userProp.properties).toBeDefined();
    });

    it('should convert arrays', () => {
      const schema = z.object({
        items: z.array(z.string()),
      });
      const bridge = zodBridge(schema);
      const jsonSchema = bridge.toJSONSchema();
      const itemsProp = (
        jsonSchema.properties as Record<string, Record<string, unknown>>
      ).items;

      expect(itemsProp.type).toBe('array');
      expect((itemsProp.items as { type: string }).type).toBe('string');
    });
  });

  describe('complex schemas', () => {
    it('should validate nested objects', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });
      const bridge = zodBridge(schema);

      const result = bridge.validate({
        user: { profile: { name: '' } },
      });
      expect(result.success).toBe(false);
      expect(result.errors?.[0].path).toBe('user.profile.name');
    });

    it('should validate arrays of objects', () => {
      const schema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string().min(1),
          })
        ),
      });
      const bridge = zodBridge(schema);

      const result = bridge.validate({
        items: [
          { id: 1, name: '' },
          { id: 2, name: 'Valid' },
        ],
      });
      expect(result.success).toBe(false);
      expect(result.errors?.[0].path).toBe('items.0.name');
    });

    it('should handle refinements', () => {
      const schema = z
        .object({
          password: z.string(),
          confirmPassword: z.string(),
        })
        .refine(data => data.password === data.confirmPassword, {
          message: 'Passwords must match',
          path: ['confirmPassword'],
        });
      const bridge = zodBridge(schema);

      const result = bridge.validate({
        password: 'secret123',
        confirmPassword: 'different',
      });
      expect(result.success).toBe(false);
      expect(
        result.errors?.find(e => e.path === 'confirmPassword')
      ).toBeDefined();
    });
  });

  describe('isAsync', () => {
    it('should return true (assumes potentially async)', () => {
      const schema = z.object({ name: z.string() });
      const bridge = zodBridge(schema);
      expect(bridge.isAsync()).toBe(true);
    });
  });
});
