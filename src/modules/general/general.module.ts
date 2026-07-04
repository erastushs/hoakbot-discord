import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { Events } from 'discord.js';
import { CommandRouter } from '../../adapters/command-router.js';
import { PingCommand } from './commands/ping.command.js';
import { HelpCommand } from './commands/help.command.js';
import { AvatarCommand } from './commands/avatar.command.js';
import { UserInfoCommand } from './commands/userinfo.command.js';
import { ServerInfoCommand } from './commands/serverinfo.command.js';
import { BotInfoCommand } from './commands/botinfo.command.js';
import { generalManifest } from './manifest.js';
import { createGeneralSettings } from './settings.js';

export class GeneralModule implements IModule {
  readonly name = 'general';
  readonly version = '1.0.0';
  readonly enabled = true;
  readonly manifest = generalManifest;

  register(container: IContainer): void {
    const registry = container.resolve(TOKENS.CommandRegistry);
    const config = container.resolve(TOKENS.ConfigurationService).current();
    const logger = container.resolve(TOKENS.Logger);
    const eventBus = container.resolve(TOKENS.EventBus);
    const metrics = container.resolve(TOKENS.MetricsService);
    const client = container.resolve(TOKENS.DiscordClient);

    if (container.has(TOKENS.SettingsRegistry)) {
      container.resolve(TOKENS.SettingsRegistry).register(this.name, createGeneralSettings(config));
    }

    const pingCommand = new PingCommand();
    const helpCommand = new HelpCommand(registry, config);
    const avatarCommand = new AvatarCommand();
    const userInfoCommand = new UserInfoCommand();
    const serverInfoCommand = new ServerInfoCommand();
    const botInfoCommand = new BotInfoCommand(config);
    registry.register(pingCommand);
    registry.register(helpCommand);
    registry.register(avatarCommand);
    registry.register(userInfoCommand);
    registry.register(serverInfoCommand);
    registry.register(botInfoCommand);

    const router = new CommandRouter(registry, config, logger, eventBus, metrics);

    client.on(Events.InteractionCreate, (interaction) => {
      if (interaction.isChatInputCommand()) {
        router.handleSlash(interaction).catch((err) => {
          logger.error({ error: err }, 'Slash command handler failed');
        });
      }
    });

    client.on(Events.MessageCreate, (message) => {
      if (message.author.bot) return;
      router.handlePrefix(message).catch((err) => {
        logger.error({ error: err }, 'Prefix command handler failed');
      });
    });
  }
}
