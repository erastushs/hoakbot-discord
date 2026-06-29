import { REST, Routes } from 'discord.js';
import { ConfigService } from '../src/core/config/config.service.js';
import { CommandRegistry } from '../src/shared/command-registry.js';
import { PingCommand } from '../src/modules/general/commands/ping.command.js';
import { HelpCommand } from '../src/modules/general/commands/help.command.js';

async function main(): Promise<void> {
  const configService = new ConfigService();
  const config = configService.load();

  const { token, clientId } = config.discord;
  const guildId = config.guildId;

  if (!token || !clientId) {
    console.error('Missing BOT_TOKEN or CLIENT_ID in environment');
    process.exit(1);
  }

  if (!guildId) {
    console.error('Missing GUILD_ID — cannot deploy guild commands');
    process.exit(1);
  }

  const registry = new CommandRegistry();

  // Register all commands that have slash options
  const commands = [new PingCommand(), new HelpCommand(registry)];

  for (const cmd of commands) {
    if (cmd.slashOptions) {
      registry.register(cmd);
    }
  }

  const commandData = registry
    .all()
    .filter((cmd) => cmd.slashOptions)
    .map((cmd) => cmd.slashOptions!.toJSON());

  console.log(`Deploying ${commandData.length} guild commands to guild ${guildId}...`);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });
    console.log(`Successfully deployed ${commandData.length} guild commands.`);
    commandData.forEach((cmd: Record<string, unknown>) => {
      console.log(`  /${cmd['name']} — ${cmd['description']}`);
    });
  } catch (err) {
    console.error('Failed to deploy commands:', err);
    process.exit(1);
  }
}

void main();
