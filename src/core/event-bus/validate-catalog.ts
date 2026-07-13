import type { EventInventoryEntry } from './event-inventory.js';

export function validateGeneratedEventCatalog(catalog: readonly EventInventoryEntry[], expectedHash: string): void {
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('Generated event catalog hash is invalid.');
  const ids = new Set<string>();
  const aliases = new Set<string>();
  for (const entry of catalog) {
    if (ids.has(entry.id)) throw new Error(`Duplicate event inventory id: ${entry.id}`);
    ids.add(entry.id);
    for (const alias of entry.aliases) {
      if (ids.has(alias) || aliases.has(alias)) throw new Error(`Duplicate event inventory alias: ${alias}`);
      aliases.add(alias);
    }
  }
}
