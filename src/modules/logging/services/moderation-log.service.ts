import type { Client, TextChannel, EmbedBuilder } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { ModerationLogConfig } from '../../../core/config/types.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import type { ModerationActionEvent, WarningIssuedEvent } from '../../../core/event-bus/events.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';

const COLORS = {
  kick: 0xf59e0b,
  ban: 0xef4444,
  timeout: 0x5865f2,
  warn: 0xfacc15,
  warn_remove: 0xf59e0b,
  warn_clear: 0xfacc15,
  unban: 0x22c55e,
} as const;

const TITLES: Record<string, string> = {
  kick: '\uD83D\uDD28 Member Kicked',
  ban: '\u26D4 Member Banned',
  timeout: '\u23F3 Member Timed Out',
  warn: '\u26A0 Warning Issued',
  warn_remove: '\uD83D\uDDD1 Warning Removed',
  warn_clear: '\uD83E\uDDF9 Warnings Cleared',
  unban: '\u2705 Member Unbanned',
};

const ACTIONS: Record<string, string> = {
  kick: 'kicked',
  ban: 'banned',
  timeout: 'timed out',
  warn: 'warned',
  warn_remove: 'removed a warning from',
  warn_clear: 'cleared all warnings for',
  unban: 'unbanned',
};

const FOOTERS: Record<string, string> = {
  kick: 'Kick',
  ban: 'Ban',
  timeout: 'Timeout',
  warn: 'Warn',
  warn_remove: 'Warn Remove',
  warn_clear: 'Warn Clear',
  unban: 'Unban',
};

interface ModerationEmbedOptions {
  action: string;
  moderatorId: string;
  targetId?: string | null;
  reason?: string;
  extraFields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export class ModerationLogService {
  constructor(
    private readonly client: Client,
    private readonly config: ModerationLogConfig,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
    private readonly eventBus: IEventBus,
  ) {}

  register(): void {
    this.eventBus.subscribe('moderation.action', (payload: ModerationActionEvent) => {
      void this.handleModerationAction(payload);
    });

    this.eventBus.subscribe('moderation.warningIssued', (payload: WarningIssuedEvent) => {
      void this.handleWarningIssued(payload);
    });
  }

  async handleModerationAction(event: ModerationActionEvent): Promise<void> {
    const supported = ['kick', 'ban', 'timeout', 'warn_remove', 'warn_clear'];
    if (!supported.includes(event.action)) return;

    if (!this.config.enabled) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Moderation log channelId not configured');
      return;
    }

    const guild = this.client.guilds.cache.get(event.guildId);
    if (!guild) {
      this.logger.warn({ guildId: event.guildId }, 'Guild not found for moderation log');
      return;
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Moderation log channel not found');
      return;
    }

    const extraFields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (event.action === 'timeout') {
      const duration = this.extractDuration(event.reason);
      if (duration) {
        extraFields.push({ name: 'Duration', value: duration, inline: true });
      }
    }

    if (event.action === 'warn_clear') {
      const count = this.extractWarningCount(event.reason);
      if (count) {
        extraFields.push({ name: 'Warnings Removed', value: count, inline: true });
      }
      event.reason = '';
    }

    const embed = this.buildModerationEmbed({
      action: event.action,
      moderatorId: event.moderatorId,
      targetId: event.targetId || null,
      reason: event.reason,
      extraFields,
    });

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('moderation_action_log_total').increment();
      this.logger.info(
        {
          guildId: event.guildId,
          moderatorId: event.moderatorId,
          targetId: event.targetId,
          action: event.action,
          reason: event.reason,
        },
        `${event.action} log sent`,
      );
      this.eventBus.emit('logging.moderation.logged', {
        guildId: event.guildId,
        action: event.action,
        moderatorId: event.moderatorId,
        targetId: event.targetId,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send moderation log');
    }
  }

  async handleWarningIssued(event: WarningIssuedEvent): Promise<void> {
    if (!this.config.enabled) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Moderation log channelId not configured');
      return;
    }

    const guild = this.client.guilds.cache.get(event.guildId);
    if (!guild) {
      this.logger.warn({ guildId: event.guildId }, 'Guild not found for warn log');
      return;
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Warn log channel not found');
      return;
    }

    const embed = this.buildModerationEmbed({
      action: 'warn',
      moderatorId: event.moderatorId,
      targetId: event.targetId,
      reason: '',
    });

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('moderation_action_log_total').increment();
      this.logger.info(
        {
          guildId: event.guildId,
          moderatorId: event.moderatorId,
          targetId: event.targetId,
          action: 'warn',
        },
        'warn log sent',
      );
      this.eventBus.emit('logging.moderation.logged', {
        guildId: event.guildId,
        action: 'warn',
        moderatorId: event.moderatorId,
        targetId: event.targetId,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send warn log');
    }
  }

  private buildModerationEmbed(opts: ModerationEmbedOptions): EmbedBuilder {
    const title = TITLES[opts.action] ?? 'Moderation Action';
    const color = COLORS[opts.action as keyof typeof COLORS] ?? 0x5865f2;
    const verb = ACTIONS[opts.action] ?? 'acted on';
    const footer = FOOTERS[opts.action] ?? 'Moderation';
    const reason = opts.reason?.trim() || null;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      {
        name: 'Reason',
        value: reason || 'No reason provided.',
        inline: false,
      },
    ];

    if (opts.extraFields) {
      fields.push(...opts.extraFields);
    }

    let description: string;
    const targetId = opts.targetId || null;
    if (targetId) {
      description = `<@${opts.moderatorId}> ${verb} <@${targetId}>.`;
    } else {
      description = `<@${opts.moderatorId}> ${verb}.`;
    }

    return EmbedFactory.build({ title, color, description, fields, footer });
  }

  private extractDuration(reason: string): string | null {
    const match = reason.match(/^(\d+[smhd])/);
    return match ? (match[1] ?? null) : null;
  }

  private extractWarningCount(reason: string): string | null {
    const match = reason.match(/^(\d+)/);
    return match ? (match[1] ?? null) : null;
  }
}
