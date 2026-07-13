import type { Client, VoiceState, TextChannel } from 'discord.js';
import { Events } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { VoiceLogConfig } from '../../../core/config/types.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';

export type VoiceLogAction = 'join' | 'leave' | 'move';

interface VoiceLogEvent {
  action: VoiceLogAction;
  userId: string;
  username: string;
  displayName: string;
  avatarURL: string | null;
  oldChannelName: string | null;
  newChannelName: string | null;
  guildId: string;
}

export class VoiceLogService {
  private active = false;
  private readonly listener = (oldState: VoiceState, newState: VoiceState) => {
    if (!this.active) return;
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot || oldState.channelId === newState.channelId) return;
    const action: VoiceLogAction = !oldState.channelId ? 'join' : !newState.channelId ? 'leave' : 'move';
    void this.handleVoiceEvent({ action, userId: member.id, username: member.user.username, displayName: member.displayName, avatarURL: member.user.displayAvatarURL(), oldChannelName: oldState.channel?.name ?? null, newChannelName: newState.channel?.name ?? null, guildId: newState.guild.id });
  };

  constructor(
    private readonly client: Client,
    private readonly config: VoiceLogConfig,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
  ) {}

  activate(): void { this.active = true; }
  handleDiscordVoiceState(oldState: VoiceState, newState: VoiceState): void {
    if (!this.active) return;
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot || oldState.channelId === newState.channelId) return;
    const action: VoiceLogAction = !oldState.channelId ? 'join' : !newState.channelId ? 'leave' : 'move';
    void this.handleVoiceEvent({ action, userId: member.id, username: member.user.username, displayName: member.displayName, avatarURL: member.user.displayAvatarURL(), oldChannelName: oldState.channel?.name ?? null, newChannelName: newState.channel?.name ?? null, guildId: newState.guild.id });
  }

  register(): void {
    if (this.active) return;
    this.active = true;
    this.client.on(Events.VoiceStateUpdate, this.listener);
  }

  dispose(): void {
    this.active = false;
    this.client.off(Events.VoiceStateUpdate, this.listener);
  }

  async handleVoiceEvent(event: VoiceLogEvent): Promise<void> {
    if (!this.config.enabled) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Voice logging channelId not configured');
      return;
    }

    const guild = this.client.guilds.cache.get(event.guildId);
    if (!guild) {
      this.logger.warn({ guildId: event.guildId }, 'Guild not found for voice log');
      return;
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId }, 'Voice log channel not found in guild');
      return;
    }

    const embed = this.buildEmbed(event);

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('voice_log_total').increment();
      this.logger.info(
        { userId: event.userId, action: event.action, channelId },
        'Voice log sent',
      );
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send voice log');
    }
  }

  private buildEmbed(event: VoiceLogEvent) {
    const { title, color, footer } = this.getEmbedMetadata(event.action);
    const fields = this.buildFields(event);
    const thumbnail = event.avatarURL;

    return EmbedFactory.build({
      title,
      color,
      fields,
      thumbnail: thumbnail ?? undefined,
      footer,
    });
  }

  private getEmbedMetadata(action: VoiceLogAction): { title: string; color: number; footer: string } {
    switch (action) {
      case 'join':
        return { title: '\u27A1\uFE0F Voice Channel Join', color: COLORS.VOICE.JOIN, footer: 'Voice Join' };
      case 'leave':
        return { title: '\u{1F519} Voice Channel Leave', color: COLORS.VOICE.LEAVE, footer: 'Voice Leave' };
      case 'move':
        return { title: '\uD83D\uDD04 Voice Channel Move', color: COLORS.VOICE.MOVE, footer: 'Voice Move' };
    }
  }

  private buildFields(event: VoiceLogEvent) {
    const fields = [
      {
        name: 'User',
        value: `<@${event.userId}> (${event.username})`,
        inline: true,
      },
    ];

    if (event.action === 'move') {
      fields.push({
        name: 'From',
        value: event.oldChannelName ?? 'Unknown',
        inline: true,
      });
      fields.push({
        name: 'To',
        value: event.newChannelName ?? 'Unknown',
        inline: true,
      });
    } else if (event.action === 'join') {
      fields.push({
        name: 'Channel',
        value: event.newChannelName ?? 'Unknown',
        inline: true,
      });
    } else if (event.action === 'leave') {
      fields.push({
        name: 'Channel',
        value: event.oldChannelName ?? 'Unknown',
        inline: true,
      });
    }

    return fields;
  }
}
