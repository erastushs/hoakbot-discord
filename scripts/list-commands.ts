import { REST, Routes } from 'discord.js';
import { ConfigService } from '../src/core/config/config.service.js';

async function main(): Promise<void> {
  const configService = new ConfigService();
  const config = configService.load();

  const { token, clientId } = config.discord;

  if (!token || !clientId) {
    console.error('Missing BOT_TOKEN or CLIENT_ID');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  const globalCommands = (await rest.get(Routes.applicationCommands(clientId))) as unknown[];
  const guildCommands = (await rest.get(Routes.applicationGuildCommands(clientId, config.guildId))) as unknown[];

  console.log('Global Commands:');
  if (globalCommands.length === 0) {
    console.log('  (none)');
  } else {
    for (const cmd of globalCommands) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log(`  /${(cmd as any).name} — ${(cmd as any).description}`);
    }
  }

  console.log(`\nGuild Commands (${config.guildId}):`);
  if (guildCommands.length === 0) {
    console.log('  (none)');
  } else {
    for (const cmd of guildCommands) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log(`  /${(cmd as any).name} — ${(cmd as any).description}`);
    }
  }
}

void main();
