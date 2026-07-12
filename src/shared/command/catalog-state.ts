import { createHash } from 'node:crypto';

export function normalizeCommandCatalog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeCommandCatalog);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalizeCommandCatalog(child)]),
    );
  }
  return value;
}

export function normalizedCatalogHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(normalizeCommandCatalog(value)))
    .digest('hex');
}
