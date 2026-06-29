import { joinVoiceChannel, VoiceConnectionStatus, type VoiceConnection } from '@discordjs/voice';
import { PermissionFlagsBits, ChannelType, type Client, type VoiceChannel } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';

export class ConnectionManager {
  private connection: VoiceConnection | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private standbyChannelId = '';
  private guildId = '';

  constructor(
    private readonly client: Client,
    private readonly logger: ILogger,
    private readonly maxReconnectRetries: number,
    private readonly reconnectDelayMs: number,
  ) {}

  async joinStandby(standbyChannelId: string, guildId: string): Promise<void> {
    this.standbyChannelId = standbyChannelId;
    this.guildId = guildId;
    this.reconnectAttempts = 0;
    await this.connect(standbyChannelId, guildId);
  }

  async moveTo(targetChannelId: string, guildId: string): Promise<void> {
    const validationError = this.validateChannel(targetChannelId, guildId);
    if (validationError) {
      this.logger.warn({ targetChannelId, guildId, reason: validationError }, 'Cannot move to voice channel');
      return;
    }

    this.logger.info({ from: this.currentChannelId(), to: targetChannelId }, 'Moving to user voice channel');
    await this.connect(targetChannelId, guildId);
  }

  returnToStandby(): void {
    if (!this.standbyChannelId || !this.guildId) {
      this.logger.warn('Cannot return to standby — no standby configured');
      return;
    }

    this.logger.info({ standbyChannelId: this.standbyChannelId }, 'Returning to standby channel');
    this.connect(this.standbyChannelId, this.guildId).catch((err) => {
      this.logger.error({ error: this.serializeError(err) }, 'Failed to return to standby');
    });
  }

  async disconnect(): Promise<void> {
    this.clearReconnectTimer();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
      this.logger.info('Voice connection destroyed');
    }
  }

  isConnected(): boolean {
    return this.connection?.state.status === VoiceConnectionStatus.Ready;
  }

  getConnection(): VoiceConnection | null {
    return this.connection;
  }

  getStandbyChannelId(): string {
    return this.standbyChannelId;
  }

  currentChannelId(): string | null {
    return this.connection?.joinConfig.channelId ?? null;
  }

  private validateChannel(channelId: string, guildId: string): string | null {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return 'Guild not found';

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return 'Channel not found';
    if (channel.type !== ChannelType.GuildVoice) return 'Channel is not a voice channel';

    const voiceChannel = channel as VoiceChannel;
    const botMember = guild.members.me;
    if (!botMember) return 'Bot member not found in guild';

    const permissions = voiceChannel.permissionsFor(botMember);

    if (permissions) {
      if (!permissions.has(PermissionFlagsBits.ViewChannel)) return 'Missing View Channel permission';
      if (!permissions.has(PermissionFlagsBits.Connect)) return 'Missing Connect permission';
      if (!permissions.has(PermissionFlagsBits.Speak)) return 'Missing Speak permission';
    }

    return null;
  }

  private async connect(channelId: string, guildId: string): Promise<void> {
    if (this.connection) {
      this.connection.destroy();
    }

    this.logger.info({ channelId }, 'Connecting to voice channel');

    this.connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: this.client.guilds.cache.get(guildId)?.voiceAdapterCreator as never,
      selfDeaf: true,
      selfMute: false,
    });

    this.connection.on(VoiceConnectionStatus.Ready, () => {
      this.reconnectAttempts = 0;
      this.logger.info({ channelId: this.connection?.joinConfig.channelId }, 'Voice connection ready');
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.logger.warn({ channelId: this.connection?.joinConfig.channelId }, 'Voice connection disconnected');
      this.scheduleReconnect();
    });

    this.connection.on(VoiceConnectionStatus.Connecting, () => {
      this.logger.debug({ channelId: this.connection?.joinConfig.channelId }, 'Voice connection connecting');
    });

    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.logger.info({ channelId: this.connection?.joinConfig.channelId }, 'Voice connection destroyed');
    });

    this.connection.on('error', (error: Error) => {
      this.logger.error(
        { error: this.serializeError(error), channelId: this.connection?.joinConfig.channelId },
        'Voice connection error',
      );
    });
  }

  private scheduleReconnect(): void {
    if (!this.standbyChannelId || !this.guildId) return;

    if (this.reconnectAttempts >= this.maxReconnectRetries) {
      this.logger.error(
        { standbyChannelId: this.standbyChannelId, attempts: this.reconnectAttempts },
        'Max reconnection attempts reached',
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);

    this.logger.warn(
      {
        standbyChannelId: this.standbyChannelId,
        attempt: this.reconnectAttempts,
        maxRetries: this.maxReconnectRetries,
        delay,
      },
      'Scheduling voice reconnection to standby',
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.standbyChannelId, this.guildId).catch((err) => {
        this.logger.error({ error: this.serializeError(err) }, 'Reconnection attempt failed');
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private serializeError(err: unknown): { message: string; stack?: string } {
    if (err instanceof Error) {
      return { message: err.message, stack: err.stack };
    }
    return { message: String(err) };
  }
}
