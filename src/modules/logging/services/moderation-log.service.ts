import type { Client, TextChannel, EmbedBuilder } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { ModerationLogConfig } from '../../../core/config/types.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import type { ModerationActionEvent } from '../../../core/event-bus/events.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';

const KICK_COLOR = 0xf59e0b;

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
  }

  async handleModerationAction(event: ModerationActionEvent): Promise<void> {
    if (event.action !== 'kick') return;

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

    const embed = this.buildKickEmbed(event);

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('moderation_kick_log_total').increment();
      this.logger.info(
        {
          guildId: event.guildId,
          moderatorId: event.moderatorId,
          targetId: event.targetId,
          reason: event.reason,
        },
        'Kick log sent',
      );
      this.eventBus.emit('logging.moderation.kick_logged', {
        guildId: event.guildId,
        moderatorId: event.moderatorId,
        targetId: event.targetId,
        reason: event.reason,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send kick log');
    }
  }

  private buildKickEmbed(event: ModerationActionEvent): EmbedBuilder {
    const reason = event.reason?.trim() || null;

    return EmbedFactory.build({
      title: '\uD83D\uDD28 Member Kicked',
      color: KICK_COLOR,
      description: `<@${event.moderatorId}> kicked <@${event.targetId}>.`,
      fields: [
        {
          name: 'Reason',
          value: reason ? reason : 'No reason provided.',
          inline: false,
        },
      ],
      footer: 'Kick',
    });
  }
}
