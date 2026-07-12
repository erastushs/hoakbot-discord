import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../src/core/config/config.service.js';
import { createScriptRegistry } from '../../scripts/command-registry.js';
import { listCommands } from '../../scripts/list-commands.js';
import { deployCommands } from '../../scripts/deploy-commands.js';

vi.mock('../../src/core/config/config.service.js', () => ({ ConfigService: vi.fn(function ConfigService() {}) }));

describe('Phase 06 canonical projections', () => {
  it('preserves the 3.2.3 command payload projection', () => {
    vi.mocked(ConfigService).mockImplementation(function ConfigService() { return { load: () => ({ bot: {}, discord: {}, featureFlags: {}, permissions: {} }) } as never; });
    const registry = createScriptRegistry();
    expect(registry.catalog().map(({ metadata }) => metadata.name)).toEqual(['avatar', 'ban', 'botinfo', 'clean', 'help', 'kick', 'ping', 'serverinfo', 'timeout', 'userinfo', 'warn', 'warn-clear', 'warn-remove', 'warnings']);
    const fixture = JSON.parse(readFileSync(resolve(import.meta.dirname, '../fixtures/commands-3.2.3.json'), 'utf8'));
    expect(registry.deployment('guild')).toEqual(fixture);
    expect(registry.deployment('guild')).toMatchSnapshot();
    expect(Object.isFrozen(registry.deployment('guild')[0])).toBe(true);
    expect(registry.deployment('global')).toEqual([]);
  });

  it('supports offline list and deploy dry-runs', async () => {
    vi.mocked(ConfigService).mockImplementation(function ConfigService() { return { load: () => ({ bot: {}, discord: {}, featureFlags: {}, permissions: {}, guildId: '' }) } as never; });
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await expect(listCommands(true)).resolves.toBeUndefined();
    await expect(deployCommands({ dryRun: true })).resolves.toBeUndefined();
    expect(output.mock.calls.flat().join(' ')).toContain('hash');
    output.mockRestore();
  });

  it('provides identical list and deploy source projections', () => {
    vi.mocked(ConfigService).mockImplementation(function ConfigService() { return { load: () => ({ bot: {}, discord: {}, featureFlags: {}, permissions: {} }) } as never; });
    const registry = createScriptRegistry();
    expect(registry.catalog().filter(({ metadata }) => metadata.payload).map(({ metadata }) => metadata.payload)).toEqual(registry.deployment('guild'));
  });
});
