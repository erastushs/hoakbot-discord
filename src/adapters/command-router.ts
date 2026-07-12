import { Collection } from '@discordjs/collection';
import {
  ApplicationCommandOptionType,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import type { ICommand, CommandContext } from '../shared/types/command.js';
import type { CommandRegistry } from '../shared/command-registry.js';
import type { ILogger } from '../core/logger/logger.service.js';
import type { IEventBus } from '../core/event-bus/types.js';
import type { IMetrics } from '../core/metrics/types.js';
import type { AppConfig } from '../core/config/types.js';
import { PermissionMiddleware } from '../shared/middleware/permission.middleware.js';
import type { CommandMetadata, CommandOptionMetadata } from '../shared/command/define-command.js';

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
    const descriptor = this.registry.descriptor(interaction.commandName);
    const command = descriptor?.command;
    if (!command) {
      this.logger.warn({ command: interaction.commandName }, 'Unknown slash command');
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const ctx = this.createSlashContext(interaction);
    await this.executeCommand(command, ctx, interaction.commandName, interaction, descriptor.metadata);
  }

  async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const descriptor = this.registry.descriptor(interaction.commandName);
    const focused = interaction.options.getFocused(true);
    if (!descriptor?.autocomplete || !descriptor.metadata.autocompleteOptions.includes(focused.name)) {
      await interaction.respond([]);
      return;
    }
    const ctx = this.createAutocompleteContext(interaction);
    const permission = await this.permissionMiddleware.check(descriptor.command, ctx, descriptor.metadata);
    if (!permission.ok) {
      await interaction.respond([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);
    try {
      const choices = await Promise.race([
        descriptor.autocomplete({
          ...ctx,
          interaction,
          command: descriptor.command,
          option: focused.name,
          value: String(focused.value),
          signal: controller.signal,
        }),
        new Promise<readonly never[]>((resolve) =>
          controller.signal.addEventListener('abort', () => resolve([]), { once: true }),
        ),
      ]);
      const option = this.findOption(descriptor.metadata.payload?.options ?? [], focused.name);
      const normalized = choices
        .filter((choice) => this.validAutocompleteChoice(choice, option?.type))
        .filter(
          (choice, index, all) =>
            all.findIndex((candidate) => candidate.name === choice.name && candidate.value === choice.value) === index,
        )
        .slice(0, 25);
      await interaction.respond(normalized);
    } catch {
      await interaction.respond([]).catch(() => undefined);
    } finally {
      clearTimeout(timeout);
    }
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
    metadata?: CommandMetadata,
  ): Promise<void> {
    const start = performance.now();

    const permissionResult = await this.permissionMiddleware.check(command, ctx, metadata);
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
          this.logger.warn({ command: command.name, error: responseErr }, 'Failed to send command failure response');
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

  private createAutocompleteContext(interaction: AutocompleteInteraction): CommandContext {
    const args = new Map<string, unknown>();
    for (const option of interaction.options.data ?? []) args.set(option.name, option.value);
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
      reply: async () => undefined,
      deferReply: async () => undefined,
    };
  }

  private findOption(options: readonly CommandOptionMetadata[], name: string): CommandOptionMetadata | undefined {
    for (const option of options) {
      if (option.name === name) return option;
      const nested = this.findOption(option.options ?? [], name);
      if (nested) return nested;
    }
    return undefined;
  }

  private validAutocompleteChoice(choice: { name: string; value: string | number }, optionType?: number): boolean {
    if (typeof choice.name !== 'string' || choice.name.length < 1 || choice.name.length > 100) return false;
    if (optionType === ApplicationCommandOptionType.String)
      return typeof choice.value === 'string' && choice.value.length >= 1 && choice.value.length <= 100;
    if (optionType === ApplicationCommandOptionType.Integer)
      return (
        typeof choice.value === 'number' &&
        Number.isSafeInteger(choice.value) &&
        Math.abs(choice.value) <= 9_007_199_254_740_991
      );
    if (optionType === ApplicationCommandOptionType.Number)
      return typeof choice.value === 'number' && Number.isFinite(choice.value);
    return false;
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
