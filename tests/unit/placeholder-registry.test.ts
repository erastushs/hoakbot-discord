import { describe, it, expect } from 'vitest';
import { PlaceholderRegistry } from '../../src/shared/template/placeholder-registry.js';

describe('PlaceholderRegistry', () => {
  const registry = new PlaceholderRegistry();

  describe('getAll', () => {
    it('returns all placeholders', () => {
      const all = registry.getAll();
      expect(all.length).toBeGreaterThanOrEqual(6);
    });

    it('each placeholder has key, description, example, category', () => {
      for (const entry of registry.getAll()) {
        expect(entry).toHaveProperty('key');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('example');
        expect(entry).toHaveProperty('category');
        expect(typeof entry.key).toBe('string');
        expect(typeof entry.description).toBe('string');
        expect(typeof entry.example).toBe('string');
        expect(typeof entry.category).toBe('string');
      }
    });
  });

  describe('get', () => {
    it('returns server placeholder', () => {
      const entry = registry.get('server');
      expect(entry).toBeDefined();
      expect(entry!.key).toBe('server');
      expect(entry!.category).toBe('Guild');
    });

    it('returns user placeholder', () => {
      const entry = registry.get('user');
      expect(entry).toBeDefined();
      expect(entry!.category).toBe('User');
    });

    it('returns membercount placeholder', () => {
      const entry = registry.get('membercount');
      expect(entry).toBeDefined();
      expect(entry!.category).toBe('Guild');
    });

    it('returns undefined for unknown key', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('categories', () => {
    it('returns unique categories', () => {
      const cats = registry.categories();
      expect(cats).toContain('User');
      expect(cats).toContain('Guild');
      expect(cats.length).toBe(new Set(cats).size);
    });
  });
});
