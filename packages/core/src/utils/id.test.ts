import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, resetIdCounter, generateFieldId } from './id';

describe('id utilities', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
    });

    it('should follow the ufa_ prefix pattern', () => {
      const id = generateId();
      expect(id).toMatch(/^ufa_\d+$/);
    });

    it('should increment sequentially', () => {
      expect(generateId()).toBe('ufa_1');
      expect(generateId()).toBe('ufa_2');
      expect(generateId()).toBe('ufa_3');
    });
  });

  describe('resetIdCounter', () => {
    it('should reset the counter', () => {
      generateId();
      generateId();
      resetIdCounter();
      expect(generateId()).toBe('ufa_1');
    });
  });

  describe('generateFieldId', () => {
    it('should generate id from path', () => {
      expect(generateFieldId('user.name')).toBe('user_name');
    });

    it('should include index if provided', () => {
      expect(generateFieldId('items', 0)).toBe('items_0');
      expect(generateFieldId('items', 5)).toBe('items_5');
    });

    it('should handle nested paths with index', () => {
      expect(generateFieldId('user.addresses', 1)).toBe('user_addresses_1');
    });
  });
});
