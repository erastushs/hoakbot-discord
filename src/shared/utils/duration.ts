import { Errors } from '../errors/errors.js';

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDuration(input: string): { ms: number; error?: string } {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) {
    return { ms: 0, error: Errors.invalidDuration() };
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const ms = value * (UNIT_MS[unit] ?? 0);

  if (ms <= 0) {
    return { ms: 0, error: Errors.durationZero() };
  }

  if (ms > MAX_TIMEOUT_MS) {
    return { ms: 0, error: Errors.durationTooLong() };
  }

  return { ms };
}

export function formatDuration(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}
