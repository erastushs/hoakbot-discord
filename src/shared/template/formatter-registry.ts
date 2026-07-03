import type { FormatterFn } from './types.js';

function upper(value: string): string {
  return value.toUpperCase();
}

function lower(value: string): string {
  return value.toLowerCase();
}

function title(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function number(value: string): string {
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  return num.toLocaleString();
}

function ordinal(value: string): string {
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  return toOrdinal(num);
}

function ordinalId(value: string): string {
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  return `ke-${num}`;
}

function relative(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return value;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return years === 1 ? '1 year ago' : `${years} years ago`;
  if (months > 0) return months === 1 ? '1 month ago' : `${months} months ago`;
  if (weeks > 0) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

  return 'just now';
}

function toOrdinal(n: number): string {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return String(n);

  const last = n % 10;
  const lastTwo = n % 100;

  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;

  switch (last) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const FORMATTERS = new Map<string, FormatterFn>([
  ['upper', upper],
  ['lower', lower],
  ['title', title],
  ['number', number],
  ['ordinal', ordinal],
  ['ordinal_id', ordinalId],
  ['relative', relative],
]);

export class FormatterRegistry {
  has(name: string): boolean {
    return FORMATTERS.has(name);
  }

  format(value: string, name: string): string {
    const fn = FORMATTERS.get(name);
    if (!fn) return value;
    return fn(value);
  }
}
