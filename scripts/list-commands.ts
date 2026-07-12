import { REST, Routes } from 'discord.js';
import { ConfigService } from '../src/core/config/config.service.js';
import { builtinCommandCatalogHash } from '../src/generated/command-catalog.js';
import { createScriptRegistry } from './command-registry.js';

export async function listCommands(dryRun = process.argv.includes('--dry-run')): Promise<void> {
  const config = new ConfigService().load();
  const registry = createScriptRegistry();
  console.log(`Canonical Commands (${registry.catalog().length}, hash ${builtinCommandCatalogHash}):`);
  for (const descriptor of registry.catalog()) console.log(`  /${descriptor.metadata.name} — ${descriptor.metadata.description}`);
  if (dryRun) return;
  const { token, clientId } = config.discord;
  if (!token || !clientId) throw new Error('Missing BOT_TOKEN or CLIENT_ID');
  const rest = new REST({ version: '10' }).setToken(token);
  const globalCommands = await rest.get(Routes.applicationCommands(clientId)) as Array<Record<string, unknown>>;
  const guildCommands = await rest.get(Routes.applicationGuildCommands(clientId, config.guildId)) as Array<Record<string, unknown>>;
  console.log(`Deployment drift: ${JSON.stringify([...globalCommands, ...guildCommands]) === JSON.stringify(registry.deployment('guild')) ? 'none' : `detected (local ${builtinCommandCatalogHash})`}`);
}

if (process.argv[1] && import.meta.filename.endsWith(process.argv[1])) void listCommands().catch((error) => { console.error(error); process.exitCode = 1; });
