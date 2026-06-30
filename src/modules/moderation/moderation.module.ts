import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { CommandRegistry } from '../../shared/command-registry.js';
import { Events } from 'discord.js';
import { CommandRouter } from '../../adapters/command-router.js';
import { CleanCommand } from './commands/clean.command.js';
import { KickCommand } from './commands/kick.command.js';
import { BanCommand } from './commands/ban.command.js';

export class ModerationModule implements IModule {
  readonly name = 'moderation';
  readonly version = '1.0.0';
  readonly enabled = true;

  register(container: IContainer): void {
    const registry = new CommandRegistry();
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const eventBus = container.resolve(TOKENS.EventBus);
    const metrics = container.resolve(TOKENS.MetricsService);
    const client = container.resolve(TOKENS.DiscordClient);

    const cleanCommand = new CleanCommand();
    const kickCommand = new KickCommand(metrics);
    const banCommand = new BanCommand(metrics);
    registry.register(cleanCommand);
    registry.register(kickCommand);
    registry.register(banCommand);

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
