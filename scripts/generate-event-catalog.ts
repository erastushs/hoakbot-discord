import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function generateEventCatalog(root: string): string {
  const sourcePath = 'src/core/event-bus/event-inventory.ts';
  const source = readFileSync(resolve(root, sourcePath), 'utf8');
  const hash = createHash('sha256').update(`${sourcePath}\0${source}`).digest('hex');
  return `export { eventCatalogInventory as eventCatalog } from '../core/event-bus/event-inventory.js';\nexport const eventCatalogHash = '${hash}';\n`;
}
export function eventCatalogIsCurrent(root: string): boolean { return readFileSync(resolve(root, 'src/generated/event-catalog.ts'), 'utf8') === generateEventCatalog(root); }
const root = resolve(import.meta.dirname, '..');
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const target = resolve(root, 'src/generated/event-catalog.ts');
  if (process.argv.includes('--check')) { if (!eventCatalogIsCurrent(root)) throw new Error('Generated event catalog is stale. Run npm run generate:events.'); }
  else writeFileSync(target, generateEventCatalog(root));
}
