import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commandCatalogIsCurrent, generateCommandCatalog } from '../../scripts/generate-command-catalog.js';

const root = resolve(import.meta.dirname, '../..');

describe('Phase 06 generated catalog', () => {
  it('is deterministic, sorted, complete, and current', () => {
    expect(generateCommandCatalog(root)).toBe(generateCommandCatalog(root));
    expect(commandCatalogIsCurrent(root)).toBe(true);
    const output = generateCommandCatalog(root);
    expect(output.match(/\.command\.ts/g)).toHaveLength(14);
    const files = [...output.matchAll(/"(src\/[^\"]+\.command\.ts)"/g)].map((match) => match[1]);
    expect(files).toEqual([...files].sort());
  });

  it('detects stale output after approved source changes', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'hoak-command-catalog-'));
    cpSync(join(root, 'src/modules'), join(fixture, 'src/modules'), { recursive: true });
    cpSync(join(root, 'src/generated'), join(fixture, 'src/generated'), { recursive: true });
    expect(commandCatalogIsCurrent(fixture)).toBe(true);
    const source = join(fixture, 'src/modules/general/commands/ping.command.ts');
    writeFileSync(source, `${readFileSync(source, 'utf8')}\n`);
    expect(commandCatalogIsCurrent(fixture)).toBe(false);
  });
});
