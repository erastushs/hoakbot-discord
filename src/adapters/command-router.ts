import { Collection } from '@discordjs/collection';
import { ApplicationCommandOptionType, type ChatInputCommandInteraction, type Message } from 'discord.js';
import type { ICommand, CommandContext } from '../shared/types/command.js';
import type { CommandRegistry } from '../shared/command-registry.js';
import type { ILogger } from '../core/logger/logger.service.js';
import type { IEventBus } from '../core/event-bus/types.js';
import type { IMetrics } from '../core/metrics/types.js';
import type { AppConfig } from '../core/config/types.js';
import { PermissionMiddleware } from '../shared/middleware/permission.middleware.js';

export class CommandRouter {
  private readonly cooldowns = new Collection<string, number>();
  private readonly permissionMiddleware: PermissionMiddleware;

  constructor(
    private readonly registry: CommandRegistry,
    private readonly config: Readonly<AppConfig>,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus,
    private readonly metrics: IMetrics,
  ) {
    this.permissionMiddleware = new PermissionMiddleware(config, logger, eventBus, metrics);
  }

  async handleSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.registry.find(interaction.commandName);
    if (!command) {
      this.logger.warn({ command: interaction.commandName }, 'Unknown slash command');
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const ctx = this.createSlashContext(interaction);
    await this.executeCommand(command, ctx, interaction.commandName, interaction);
  }

  async handlePrefix(message: Message): Promise<void> {
    const prefix = this.config.bot.prefix.toLowerCase();
    const content = message.content.trim();

    if (!content.toLowerCase().startsWith(prefix)) return;

    const withoutPrefix = content.slice(prefix.length);
    const tokens = withoutPrefix.split(/\s+/);
    const commandName = tokens[0] ?? '';
    if (!commandName) return;

    const command = this.registry.find(commandName) ?? this.registry.findByAlias(commandName);
    if (!command) return;

    const ctx = this.createPrefixContext(message, tokens.slice(1).join(' '));
    await this.executeCommand(command, ctx, commandName);
  }

  private async executeCommand(
    command: ICommand,
    ctx: CommandContext,
    _commandName: string,
    interaction?: ChatInputCommandInteraction,
  ): Promise<void> {
    const start = performance.now();

    const permissionResult = await this.permissionMiddleware.check(command, ctx);
    if (!permissionResult.ok) {
      return;
    }

    this.logger.debug({ command: command.name, source: ctx.source, user: ctx.user.id }, 'Executing command');

    try {
      await command.execute(ctx);
      const latencyMs = Math.round(performance.now() - start);

      this.metrics.counter('command_execution_total').increment();
      this.metrics.gauge('command_execution_duration_ms').set(latencyMs);
      this.eventBus.emit('command.executed', {
        command: command.name,
        source: ctx.source,
        userId: ctx.user.id,
        guildId: ctx.guild?.id ?? '',
        latencyMs,
      });

      this.logger.info(
        {
          command: command.name,
          userId: ctx.user.id,
          guildId: ctx.guild?.id ?? '',
          source: ctx.source,
          durationMs: latencyMs,
          success: true,
        },
        'Command executed',
      );
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);

      this.metrics.counter('command_failed_total').increment();
      this.logger.error(
        {
          command: command.name,
          userId: ctx.user.id,
          guildId: ctx.guild?.id ?? '',
          source: ctx.source,
          durationMs: latencyMs,
          success: false,
          error: err,
        },
        'Command execution failed',
      );

      this.eventBus.emit('command.failed', {
        command: command.name,
        source: ctx.source,
        userId: ctx.user.id,
        guildId: ctx.guild?.id ?? '',
        error: err instanceof Error ? err : new Error(String(err)),
      });

      if (interaction) {
        try {
          const response = { content: 'Command failed. Please try again later.' };
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(response);
          } else {
            await interaction.reply({ ...response, ephemeral: true });
          }
        } catch (responseErr) {
          this.logger.warn(
            { command: command.name, error: responseErr },
            'Failed to send command failure response',
          );
        }
      }
    }
  }

  private createSlashContext(interaction: ChatInputCommandInteraction): CommandContext {
    const args = new Map<string, unknown>();

    for (const option of interaction.options.data) {
      if (option.type === ApplicationCommandOptionType.User) {
        args.set(option.name, option.user ?? undefined);
      } else {
        args.set(option.name, option.value);
      }
    }

    return {
      source: 'slash',
      user: interaction.user,
      member: interaction.member as never,
      guild: interaction.guild,
      channel: interaction.channel as never,
      args,
      logger: this.logger,
      eventBus: this.eventBus,
      createdAt: interaction.createdAt,
      reply: (content) => interaction.editReply(content as never),
      deferReply: () => interaction.deferReply(),
    };
  }

  private createPrefixContext(message: Message, suffix: string): CommandContext {
    const args = new Map<string, unknown>();

    args.set('_suffix', suffix);

    const mentionMatch = suffix.trim().match(/^<@!?(\d+)>/);
    if (mentionMatch && mentionMatch[1]) {
      const userId = mentionMatch[1];
      const user = message.mentions.users.get(userId) ?? null;
      if (user) {
        args.set('target', user);
      } else {
        args.set('target_user_id', userId);
      }
    }

    return {
      source: 'prefix',
      user: message.author,
      member: message.member,
      guild: message.guild,
      channel: message.channel as never,
      args,
      logger: this.logger,
      eventBus: this.eventBus,
      createdAt: message.createdAt,
      reply: (content) => message.reply(content as never),
      deferReply: async () => {},
    };
  }
}
