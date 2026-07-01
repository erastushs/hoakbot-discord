import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration } from '../../src/shared/utils/duration.js';

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('10s')).toEqual({ ms: 10_000 });
  });

  it('parses minutes', () => {
    expect(parseDuration('5m')).toEqual({ ms: 300_000 });
    expect(parseDuration('30m')).toEqual({ ms: 1_800_000 });
  });

  it('parses hours', () => {
    expect(parseDuration('2h')).toEqual({ ms: 7_200_000 });
  });

  it('parses days', () => {
    expect(parseDuration('1d')).toEqual({ ms: 86_400_000 });
    expect(parseDuration('7d')).toEqual({ ms: 604_800_000 });
  });

  it('parses 28d as valid', () => {
    expect(parseDuration('28d')).toEqual({ ms: 2_419_200_000 });
  });

  it('rejects 29d as too long', () => {
    const result = parseDuration('29d');
    expect(result.ms).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('rejects non-numeric input', () => {
    const result = parseDuration('abc');
    expect(result.ms).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('rejects empty string', () => {
    const result = parseDuration('');
    expect(result.ms).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('rejects zero duration', () => {
    const result = parseDuration('0s');
    expect(result.ms).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('trims whitespace', () => {
    expect(parseDuration('  10s  ')).toEqual({ ms: 10_000 });
  });

  it('handles uppercase unit', () => {
    expect(parseDuration('5M')).toEqual({ ms: 300_000 });
    expect(parseDuration('2H')).toEqual({ ms: 7_200_000 });
    expect(parseDuration('1D')).toEqual({ ms: 86_400_000 });
  });

  it('handles space between number and unit', () => {
    expect(parseDuration('10 s')).toEqual({ ms: 10_000 });
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(5_000)).toBe('5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(65_000)).toBe('1m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(7_200_000 + 600_000)).toBe('2h 10m');
  });

  it('formats days, hours, minutes, seconds', () => {
    expect(formatDuration(90061000)).toBe('1d 1h 1m 1s');
  });

  it('omits zero units', () => {
    expect(formatDuration(3_600_000)).toBe('1h');
  });

  it('shows seconds when all units are zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});
