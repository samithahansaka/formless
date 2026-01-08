import { describe, it, expect } from 'vitest';
import {
  getByPath,
  setByPath,
  deleteByPath,
  hasPath,
  getAllPaths,
  parsePath,
  joinPath,
  getParentPath,
  getLastSegment,
  isArrayPath,
  getArrayInfo,
} from './path';

describe('path utilities', () => {
  describe('getByPath', () => {
    it('should return the object if path is empty', () => {
      const obj = { foo: 'bar' };
      expect(getByPath(obj, '')).toBe(obj);
    });

    it('should get a top-level value', () => {
      expect(getByPath({ name: 'John' }, 'name')).toBe('John');
    });

    it('should get a nested value', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(getByPath(obj, 'user.profile.name')).toBe('John');
    });

    it('should get array elements by index', () => {
      const obj = { items: ['a', 'b', 'c'] };
      expect(getByPath(obj, 'items.1')).toBe('b');
    });

    it('should get nested object in array', () => {
      const obj = { items: [{ id: 1 }, { id: 2 }] };
      expect(getByPath(obj, 'items.0.id')).toBe(1);
    });

    it('should return undefined for non-existent path', () => {
      expect(getByPath({ foo: 'bar' }, 'baz')).toBeUndefined();
    });

    it('should return undefined when traversing null', () => {
      expect(getByPath({ foo: null }, 'foo.bar')).toBeUndefined();
    });

    it('should return undefined when traversing undefined', () => {
      expect(getByPath({}, 'foo.bar')).toBeUndefined();
    });

    it('should return undefined when traversing non-object', () => {
      expect(getByPath({ foo: 'string' }, 'foo.bar')).toBeUndefined();
    });
  });

  describe('setByPath', () => {
    it('should set a top-level value', () => {
      const obj = { name: 'John' };
      const result = setByPath(obj, 'name', 'Jane');
      expect(result.name).toBe('Jane');
      expect(obj.name).toBe('John'); // original unchanged
    });

    it('should set a nested value', () => {
      const obj = { user: { name: 'John' } };
      const result = setByPath(obj, 'user.name', 'Jane');
      expect(result.user.name).toBe('Jane');
      expect(obj.user.name).toBe('John'); // original unchanged
    });

    it('should create intermediate objects', () => {
      const obj = {};
      const result = setByPath(obj, 'user.profile.name', 'John');
      expect(result).toEqual({ user: { profile: { name: 'John' } } });
    });

    it('should create arrays for numeric keys', () => {
      const obj = {};
      const result = setByPath(obj, 'items.0.name', 'First');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items[0].name).toBe('First');
    });

    it('should handle array index paths', () => {
      const obj = { items: ['a', 'b', 'c'] };
      const result = setByPath(obj, 'items.1', 'x');
      expect(result.items[1]).toBe('x');
      expect(obj.items[1]).toBe('b'); // original unchanged
    });

    it('should replace the whole object when path is empty', () => {
      const obj = { foo: 'bar' };
      const result = setByPath(obj, '', { baz: 'qux' });
      expect(result).toEqual({ baz: 'qux' });
    });
  });

  describe('deleteByPath', () => {
    it('should delete a top-level property', () => {
      const obj = { name: 'John', age: 30 };
      const result = deleteByPath(obj, 'name');
      expect(result).toEqual({ age: 30 });
      expect(obj.name).toBe('John'); // original unchanged
    });

    it('should delete a nested property', () => {
      const obj = { user: { name: 'John', age: 30 } };
      const result = deleteByPath(obj, 'user.name');
      expect(result).toEqual({ user: { age: 30 } });
    });

    it('should return empty object when path is empty', () => {
      const obj = { foo: 'bar' };
      expect(deleteByPath(obj, '')).toEqual({});
    });

    it('should return original when path does not exist', () => {
      const obj = { foo: 'bar' };
      const result = deleteByPath(obj, 'baz.qux');
      expect(result).toEqual({ foo: 'bar' });
    });
  });

  describe('hasPath', () => {
    it('should return true for existing path', () => {
      expect(hasPath({ user: { name: 'John' } }, 'user.name')).toBe(true);
    });

    it('should return true for empty path', () => {
      expect(hasPath({ foo: 'bar' }, '')).toBe(true);
    });

    it('should return false for non-existent path', () => {
      expect(hasPath({ foo: 'bar' }, 'baz')).toBe(false);
    });

    it('should return false when traversing null', () => {
      expect(hasPath({ foo: null }, 'foo.bar')).toBe(false);
    });

    it('should return true for array elements', () => {
      expect(hasPath({ items: [1, 2, 3] }, 'items.1')).toBe(true);
    });
  });

  describe('getAllPaths', () => {
    it('should return all paths in a flat object', () => {
      const paths = getAllPaths({ a: 1, b: 2 });
      expect(paths).toEqual(['a', 'b']);
    });

    it('should return all paths in a nested object', () => {
      const paths = getAllPaths({ user: { name: 'John', age: 30 } });
      expect(paths).toContain('user');
      expect(paths).toContain('user.name');
      expect(paths).toContain('user.age');
    });

    it('should include array indices', () => {
      const paths = getAllPaths({ items: ['a', 'b'] });
      expect(paths).toContain('items');
      expect(paths).toContain('items.0');
      expect(paths).toContain('items.1');
    });

    it('should return empty array for null or undefined', () => {
      expect(getAllPaths(null)).toEqual([]);
      expect(getAllPaths(undefined)).toEqual([]);
    });
  });

  describe('parsePath', () => {
    it('should split path by dots', () => {
      expect(parsePath('user.profile.name')).toEqual([
        'user',
        'profile',
        'name',
      ]);
    });

    it('should handle single segment', () => {
      expect(parsePath('name')).toEqual(['name']);
    });

    it('should filter empty segments', () => {
      expect(parsePath('user..name')).toEqual(['user', 'name']);
    });
  });

  describe('joinPath', () => {
    it('should join segments with dots', () => {
      expect(joinPath('user', 'profile', 'name')).toBe('user.profile.name');
    });

    it('should handle numbers', () => {
      expect(joinPath('items', 0, 'name')).toBe('items.0.name');
    });

    it('should filter empty strings', () => {
      expect(joinPath('user', '', 'name')).toBe('user.name');
    });
  });

  describe('getParentPath', () => {
    it('should return parent path', () => {
      expect(getParentPath('user.profile.name')).toBe('user.profile');
    });

    it('should return empty string for top-level path', () => {
      expect(getParentPath('name')).toBe('');
    });
  });

  describe('getLastSegment', () => {
    it('should return the last segment', () => {
      expect(getLastSegment('user.profile.name')).toBe('name');
    });

    it('should return the segment for single path', () => {
      expect(getLastSegment('name')).toBe('name');
    });

    it('should return empty string for empty path', () => {
      expect(getLastSegment('')).toBe('');
    });
  });

  describe('isArrayPath', () => {
    it('should return true for paths with array indices', () => {
      expect(isArrayPath('items.0')).toBe(true);
      expect(isArrayPath('items.0.name')).toBe(true);
      expect(isArrayPath('users.0.addresses.1')).toBe(true);
    });

    it('should return false for paths without array indices', () => {
      expect(isArrayPath('items')).toBe(false);
      expect(isArrayPath('user.profile')).toBe(false);
    });
  });

  describe('getArrayInfo', () => {
    it('should return array info for valid array path', () => {
      expect(getArrayInfo('items.0.name')).toEqual({
        basePath: 'items',
        index: 0,
        remainder: 'name',
      });
    });

    it('should handle paths ending at array index', () => {
      expect(getArrayInfo('items.2')).toEqual({
        basePath: 'items',
        index: 2,
        remainder: '',
      });
    });

    it('should return null for non-array paths', () => {
      expect(getArrayInfo('user.name')).toBeNull();
    });

    it('should handle nested arrays', () => {
      const info = getArrayInfo('users.0.addresses.1.city');
      expect(info).toEqual({
        basePath: 'users',
        index: 0,
        remainder: 'addresses.1.city',
      });
    });
  });
});
