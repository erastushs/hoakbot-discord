import { REST, Routes } from 'discord.js';
import { ConfigService } from '../src/core/config/config.service.js';
import { CommandRegistry } from '../src/shared/command-registry.js';
import { PingCommand } from '../src/modules/general/commands/ping.command.js';
import { HelpCommand } from '../src/modules/general/commands/help.command.js';
import { AvatarCommand } from '../src/modules/general/commands/avatar.command.js';
import { UserInfoCommand } from '../src/modules/general/commands/userinfo.command.js';
import { ServerInfoCommand } from '../src/modules/general/commands/serverinfo.command.js';

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
  const commands = [new PingCommand(), new HelpCommand(registry), new AvatarCommand(), new UserInfoCommand(), new ServerInfoCommand()];

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

    for (const cmd of commandData) {
      console.log(`  /${(cmd as Record<string, unknown>)['name']} — ${(cmd as Record<string, unknown>)['description']}`);
    }
    console.log(`\nGuild commands deployed successfully.\n`);

    const globalCommands = (await rest.get(Routes.applicationCommands(clientId))) as unknown[];
    if (globalCommands.length > 0) {
      console.log('⚠ Warning: Found global commands that may conflict:');
      for (const cmd of globalCommands) {
        console.log(`  /${(cmd as Record<string, unknown>)['name']} — ${(cmd as Record<string, unknown>)['description']}`);
      }
      console.log(`\nRun: npm run clear:global-commands\n`);
    }
  } catch (err) {
    console.error('Failed to deploy commands:', err);
    process.exit(1);
  }
}

void main();
