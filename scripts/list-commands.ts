import { REST, Routes } from 'discord.js';
import { ConfigService } from '../src/core/config/config.service.js';
import { normalizedCatalogHash } from '../src/shared/command/catalog-state.js';
import { createScriptRegistry } from './command-registry.js';
import { defaultDeploymentStatePath, readDeploymentCatalogState } from './deployment-state.js';

interface RestReader {
  get(route: string): Promise<unknown>;
}

export async function listCommands(
  options: boolean | { dryRun?: boolean; rest?: RestReader; statePath?: string } = process.argv.includes('--dry-run'),
): Promise<void> {
  const settings = typeof options === 'boolean' ? { dryRun: options } : options;
  const config = new ConfigService().load();
  const registry = createScriptRegistry();
  const local = registry.deployment('guild');
  const hash = normalizedCatalogHash(local);
  console.log(`Canonical Commands (${registry.catalog().length}, hash ${hash}):`);
  for (const descriptor of registry.catalog())
    console.log(`  /${descriptor.metadata.name} — ${descriptor.metadata.description}`);
  const state = await readDeploymentCatalogState(settings.statePath ?? defaultDeploymentStatePath());
  console.log(`Persisted deployment: ${state ? state.hash : 'none'}${state?.hash === hash ? ' (current)' : ''}`);
  if (settings.dryRun) return;
  const { token, clientId } = config.discord;
  if (!settings.rest && (!token || !clientId)) throw new Error('Missing BOT_TOKEN or CLIENT_ID');
  if (!clientId) throw new Error('Missing CLIENT_ID');
  const rest = settings.rest ?? new REST({ version: '10' }).setToken(token!);
  const deployed = await rest.get(Routes.applicationGuildCommands(clientId, config.guildId));
  console.log(`Deployment drift: ${normalizedCatalogHash(deployed) === hash ? 'none' : `detected (local ${hash})`}`);
}

if (process.argv[1] && import.meta.filename.endsWith(process.argv[1]))
  void listCommands().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
