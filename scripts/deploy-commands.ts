import { REST, Routes } from 'discord.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '../src/core/config/config.service.js';
import { builtinCommandCatalogHash } from '../src/generated/command-catalog.js';
import { createScriptRegistry } from './command-registry.js';

export async function deployCommands(options: { dryRun?: boolean; rollback?: boolean } = {}): Promise<void> {
  const config = new ConfigService().load();
  const registry = createScriptRegistry();
  const commandData = options.rollback ? JSON.parse(readFileSync(resolve(import.meta.dirname, '../tests/fixtures/commands-3.2.3.json'), 'utf8')) as readonly Record<string, unknown>[] : registry.deployment('guild');
  console.log(`${options.dryRun ? 'Dry-run' : 'Deploying'} ${commandData.length} guild commands; catalog hash ${builtinCommandCatalogHash}${options.rollback ? '; rollback 3.2.3 input' : ''}.`);
  if (options.dryRun) return;
  const { token, clientId } = config.discord;
  if (!token || !clientId || !config.guildId) throw new Error('Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID');
  await new REST({ version: '10' }).setToken(token).put(Routes.applicationGuildCommands(clientId, config.guildId), { body: commandData });
}

if (process.argv[1] && import.meta.filename.endsWith(process.argv[1])) void deployCommands({ dryRun: process.argv.includes('--dry-run'), rollback: process.argv.includes('--rollback-3.2.3') }).catch((error) => { console.error(error); process.exitCode = 1; });
