import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { JsonConfigProvider } from '../../src/core/config/json-config.provider.js';

function createConfigFile(config: Record<string, unknown>): string {
  const directory = mkdtempSync(join(tmpdir(), 'hoakbot-json-config-'));
  const filePath = join(directory, 'bot.json');
  writeFileSync(filePath, JSON.stringify(config), 'utf-8');
  return filePath;
}

describe('JsonConfigProvider', () => {
  it('reads values from bot.json by dot path', async () => {
    const provider = new JsonConfigProvider(
      createConfigFile({
        prefix: 'hoak',
        voice: {
          volume: 1,
        },
      }),
    );

    await expect(provider.get<string>('prefix')).resolves.toBe('hoak');
    await expect(provider.get<number>('voice.volume')).resolves.toBe(1);
  });

  it('returns multiple values', async () => {
    const provider = new JsonConfigProvider(
      createConfigFile({
        prefix: 'hoak',
        defaultLanguage: 'en',
      }),
    );

    await expect(provider.getMany<string>(['prefix', 'defaultLanguage'])).resolves.toEqual({
      prefix: 'hoak',
      defaultLanguage: 'en',
    });
  });

  it('returns cloned defaults', async () => {
    const provider = new JsonConfigProvider(
      createConfigFile({
        voice: {
          volume: 1,
        },
      }),
    );

    const defaults = await provider.getDefaults();
    (defaults['voice'] as Record<string, unknown>)['volume'] = 2;

    await expect(provider.get<number>('voice.volume')).resolves.toBe(1);
  });

  it('throws for unknown keys', async () => {
    const provider = new JsonConfigProvider(createConfigFile({ prefix: 'hoak' }));

    await expect(provider.get('voice.volume')).resolves.toBeUndefined();
  });

  it('does not write to bot.json in Milestone 2', async () => {
    const provider = new JsonConfigProvider(createConfigFile({ prefix: 'hoak' }));

    await expect(provider.set('prefix', '!')).rejects.toThrow(
      'JsonConfigProvider is read-only in Milestone 2.',
    );
    await expect(provider.setMany([{ key: 'prefix', value: '!' }])).rejects.toThrow(
      'JsonConfigProvider is read-only in Milestone 2.',
    );
    await expect(provider.delete('prefix')).rejects.toThrow(
      'JsonConfigProvider is read-only in Milestone 2.',
    );
  });

  it('checks whether keys exist', async () => {
    const provider = new JsonConfigProvider(createConfigFile({ prefix: 'hoak' }));

    await expect(provider.exists('prefix')).resolves.toBe(true);
    await expect(provider.exists('missing')).resolves.toBe(false);
  });
});
