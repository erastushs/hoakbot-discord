import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { CommandRegistry } from '../../shared/command-registry.js';
import { Events } from 'discord.js';
import { CommandRouter } from '../../adapters/command-router.js';
import { PingCommand } from './commands/ping.command.js';
import { HelpCommand } from './commands/help.command.js';
import { AvatarCommand } from './commands/avatar.command.js';
import { UserInfoCommand } from './commands/userinfo.command.js';

export class GeneralModule implements IModule {
  readonly name = 'general';
  readonly version = '1.0.0';
  readonly enabled = true;

  register(container: IContainer): void {
    const registry = new CommandRegistry();
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const eventBus = container.resolve(TOKENS.EventBus);
    const metrics = container.resolve(TOKENS.MetricsService);
    const client = container.resolve(TOKENS.DiscordClient);

    const pingCommand = new PingCommand();
    const helpCommand = new HelpCommand(registry);
    const avatarCommand = new AvatarCommand();
    const userInfoCommand = new UserInfoCommand();
    registry.register(pingCommand);
    registry.register(helpCommand);
    registry.register(avatarCommand);
    registry.register(userInfoCommand);

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
