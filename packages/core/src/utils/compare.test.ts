import { describe, it, expect } from 'vitest';
import {
  deepEqual,
  shallowEqual,
  getDirtyPaths,
  getDirtyFields,
} from './compare';

describe('compare utilities', () => {
  describe('deepEqual', () => {
    it('should return true for identical primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('a', 'a')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual('a', 'b')).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
    });

    it('should return false for different types', () => {
      expect(deepEqual(1, '1')).toBe(false);
      expect(deepEqual(null, undefined)).toBe(false);
      expect(deepEqual({}, [])).toBe(false);
    });

    it('should compare flat objects', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('should compare nested objects', () => {
      expect(
        deepEqual(
          { user: { name: 'John', age: 30 } },
          { user: { name: 'John', age: 30 } }
        )
      ).toBe(true);

      expect(
        deepEqual(
          { user: { name: 'John', age: 30 } },
          { user: { name: 'Jane', age: 30 } }
        )
      ).toBe(false);
    });

    it('should compare arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should compare arrays of objects', () => {
      expect(deepEqual([{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 2 }])).toBe(
        true
      );

      expect(deepEqual([{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 3 }])).toBe(
        false
      );
    });

    it('should handle null vs object', () => {
      expect(deepEqual(null, {})).toBe(false);
      expect(deepEqual({}, null)).toBe(false);
    });
  });

  describe('shallowEqual', () => {
    it('should return true for identical primitives', () => {
      expect(shallowEqual(1, 1)).toBe(true);
      expect(shallowEqual('a', 'a')).toBe(true);
    });

    it('should compare object references for arrays', () => {
      const nestedObj = { id: 1 };
      expect(shallowEqual([nestedObj], [nestedObj])).toBe(true);
      expect(shallowEqual([{ id: 1 }], [{ id: 1 }])).toBe(false);
    });

    it('should compare object references for nested objects', () => {
      const nested = { name: 'John' };
      expect(shallowEqual({ user: nested }, { user: nested })).toBe(true);
      expect(
        shallowEqual({ user: { name: 'John' } }, { user: { name: 'John' } })
      ).toBe(false);
    });

    it('should compare flat objects with primitives', () => {
      expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
      expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'y' })).toBe(false);
    });
  });

  describe('getDirtyPaths', () => {
    it('should return changed paths', () => {
      const original = { name: 'John', age: 30 };
      const current = { name: 'Jane', age: 30 };

      const paths = getDirtyPaths(original, current);

      expect(paths).toContain('name');
      expect(paths).not.toContain('age');
    });

    it('should detect added keys', () => {
      const original = { name: 'John' };
      const current = { name: 'John', age: 30 };

      const paths = getDirtyPaths(original, current as typeof original);

      expect(paths).toContain('age');
    });

    it('should detect removed keys', () => {
      const original = { name: 'John', age: 30 };
      const current = { name: 'John' };

      const paths = getDirtyPaths(original, current as typeof original);

      expect(paths).toContain('age');
    });

    it('should detect nested changes', () => {
      const original = { user: { name: 'John', email: 'john@test.com' } };
      const current = { user: { name: 'Jane', email: 'john@test.com' } };

      const paths = getDirtyPaths(original, current);

      expect(paths).toContain('user');
      expect(paths).toContain('user.name');
      expect(paths).not.toContain('user.email');
    });

    it('should return empty array when no changes', () => {
      const obj = { name: 'John', age: 30 };
      expect(getDirtyPaths(obj, { ...obj })).toEqual([]);
    });
  });

  describe('getDirtyFields', () => {
    it('should return a map of dirty paths', () => {
      const original = { name: 'John', age: 30 };
      const current = { name: 'Jane', age: 30 };

      const dirty = getDirtyFields(original, current);

      expect(dirty).toEqual({ name: true });
    });

    it('should handle nested dirty fields', () => {
      const original = { user: { name: 'John' }, score: 100 };
      const current = { user: { name: 'Jane' }, score: 100 };

      const dirty = getDirtyFields(original, current);

      expect(dirty.user).toBe(true);
      expect(dirty['user.name']).toBe(true);
      expect(dirty.score).toBeUndefined();
    });

    it('should return empty object when no changes', () => {
      const obj = { name: 'John' };
      expect(getDirtyFields(obj, { ...obj })).toEqual({});
    });
  });
});
