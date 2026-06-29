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
  const count = globalCommands.length;

  if (count === 0) {
    console.log('No global commands to remove.');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log(`Removed ${count} global command(s).`);
  }
}

void main();
