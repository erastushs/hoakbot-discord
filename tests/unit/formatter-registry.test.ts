import { describe, it, expect, vi, afterEach } from 'vitest';
import { FormatterRegistry } from '../../src/shared/template/formatter-registry.js';

describe('FormatterRegistry', () => {
  const registry = new FormatterRegistry();

  describe('has', () => {
    it('returns true for known formatters', () => {
      expect(registry.has('upper')).toBe(true);
      expect(registry.has('lower')).toBe(true);
      expect(registry.has('title')).toBe(true);
      expect(registry.has('number')).toBe(true);
      expect(registry.has('ordinal')).toBe(true);
      expect(registry.has('ordinal_id')).toBe(true);
      expect(registry.has('relative')).toBe(true);
    });

    it('returns false for unknown formatters', () => {
      expect(registry.has('reverse')).toBe(false);
      expect(registry.has('foo')).toBe(false);
    });
  });

  describe('format', () => {
    describe('upper', () => {
      it('converts to uppercase', () => {
        expect(registry.format('hello', 'upper')).toBe('HELLO');
      });

      it('handles already uppercase', () => {
        expect(registry.format('HELLO', 'upper')).toBe('HELLO');
      });

      it('handles mixed case', () => {
        expect(registry.format('Hello World', 'upper')).toBe('HELLO WORLD');
      });
    });

    describe('lower', () => {
      it('converts to lowercase', () => {
        expect(registry.format('HELLO', 'lower')).toBe('hello');
      });

      it('handles already lowercase', () => {
        expect(registry.format('hello', 'lower')).toBe('hello');
      });

      it('handles mixed case', () => {
        expect(registry.format('Hello World', 'lower')).toBe('hello world');
      });
    });

    describe('title', () => {
      it('title-cases each word', () => {
        expect(registry.format('hello world', 'title')).toBe('Hello World');
      });

      it('handles single word', () => {
        expect(registry.format('hello', 'title')).toBe('Hello');
      });

      it('handles mixed case input', () => {
        expect(registry.format('hELLO wORLD', 'title')).toBe('Hello World');
      });
    });

    describe('number', () => {
      it('formats numbers with commas', () => {
        expect(registry.format('1000', 'number')).toBe('1,000');
      });

      it('formats large numbers', () => {
        expect(registry.format('1000000', 'number')).toBe('1,000,000');
      });

      it('returns original for non-numeric input', () => {
        expect(registry.format('abc', 'number')).toBe('abc');
      });
    });

    describe('ordinal', () => {
      it('formats ordinal (English)', () => {
        expect(registry.format('1', 'ordinal')).toBe('1st');
        expect(registry.format('2', 'ordinal')).toBe('2nd');
        expect(registry.format('3', 'ordinal')).toBe('3rd');
        expect(registry.format('4', 'ordinal')).toBe('4th');
        expect(registry.format('11', 'ordinal')).toBe('11th');
        expect(registry.format('21', 'ordinal')).toBe('21st');
      });

      it('returns original for non-numeric input', () => {
        expect(registry.format('abc', 'ordinal')).toBe('abc');
      });
    });

    describe('ordinal_id', () => {
      it('formats Indonesian ordinal', () => {
        expect(registry.format('1', 'ordinal_id')).toBe('ke-1');
        expect(registry.format('126', 'ordinal_id')).toBe('ke-126');
      });

      it('returns original for non-numeric input', () => {
        expect(registry.format('abc', 'ordinal_id')).toBe('abc');
      });
    });

    describe('relative', () => {
      afterEach(() => {
        vi.useRealTimers();
      });

      it('returns "just now" for recent dates', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const recent = new Date(now.getTime() - 30 * 1000).toISOString();
        expect(registry.format(recent, 'relative')).toBe('just now');
      });

      it('returns minutes ago', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const past = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        expect(registry.format(past, 'relative')).toBe('5 minutes ago');
      });

      it('returns hours ago', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const past = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
        expect(registry.format(past, 'relative')).toBe('3 hours ago');
      });

      it('returns days ago', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const past = new Date(now.getTime() - 2 * 86400 * 1000).toISOString();
        expect(registry.format(past, 'relative')).toBe('2 days ago');
      });

      it('returns weeks ago', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const past = new Date(now.getTime() - 10 * 86400 * 1000).toISOString();
        expect(registry.format(past, 'relative')).toBe('1 week ago');
      });

      it('returns months ago', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const past = new Date(now.getTime() - 45 * 86400 * 1000).toISOString();
        expect(registry.format(past, 'relative')).toBe('1 month ago');
      });

      it('returns years ago', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const past = new Date(now.getTime() - 400 * 86400 * 1000).toISOString();
        expect(registry.format(past, 'relative')).toBe('1 year ago');
      });
    });

    describe('unknown formatter', () => {
      it('returns original value unchanged', () => {
        expect(registry.format('hello', 'unknown')).toBe('hello');
      });
    });
  });
});
