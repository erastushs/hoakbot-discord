import { REST, Routes } from 'discord.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '../src/core/config/config.service.js';
import { normalizedCatalogHash } from '../src/shared/command/catalog-state.js';
import { createScriptRegistry } from './command-registry.js';
import { defaultDeploymentStatePath, writeDeploymentCatalogState } from './deployment-state.js';

interface RestWriter {
  put(route: string, options: { body: unknown }): Promise<unknown>;
}

export async function deployCommands(
  options: { dryRun?: boolean; rollback?: boolean; rest?: RestWriter; statePath?: string } = {},
): Promise<void> {
  const config = new ConfigService().load();
  const registry = createScriptRegistry();
  const commandData = options.rollback
    ? (JSON.parse(
        readFileSync(resolve(import.meta.dirname, '../tests/fixtures/commands-3.2.3.json'), 'utf8'),
      ) as readonly Record<string, unknown>[])
    : registry.deployment('guild');
  const hash = normalizedCatalogHash(commandData);
  console.log(
    `${options.dryRun ? 'Dry-run' : 'Deploying'} ${commandData.length} guild commands; catalog hash ${hash}${options.rollback ? '; rollback 3.2.3 input' : ''}.`,
  );
  if (options.dryRun) return;
  const { token, clientId } = config.discord;
  if (!options.rest && (!token || !clientId || !config.guildId))
    throw new Error('Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID');
  if (!clientId || !config.guildId) throw new Error('Missing CLIENT_ID or GUILD_ID');
  const rest = options.rest ?? new REST({ version: '10' }).setToken(token!);
  await rest.put(Routes.applicationGuildCommands(clientId, config.guildId), { body: commandData });
  await writeDeploymentCatalogState(options.statePath ?? defaultDeploymentStatePath(), {
    hash,
    scope: 'guild',
    deployedAt: new Date().toISOString(),
  });
}

if (process.argv[1] && import.meta.filename.endsWith(process.argv[1]))
  void deployCommands({
    dryRun: process.argv.includes('--dry-run'),
    rollback: process.argv.includes('--rollback-3.2.3'),
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
