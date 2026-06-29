import { joinVoiceChannel, VoiceConnectionStatus, type VoiceConnection } from '@discordjs/voice';
import type { Client } from 'discord.js';
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

  async disconnect(): Promise<void> {
    this.clearReconnectTimer();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
      this.logger.info({ channelId: this.standbyChannelId }, 'Voice connection destroyed');
    }
  }

  isConnected(): boolean {
    return this.connection?.state.status === VoiceConnectionStatus.Ready;
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
      this.logger.info({ channelId }, 'Voice connection ready');
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.logger.warn({ channelId }, 'Voice connection disconnected');
      this.scheduleReconnect();
    });

    this.connection.on(VoiceConnectionStatus.Connecting, () => {
      this.logger.debug({ channelId }, 'Voice connection connecting');
    });

    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.logger.info({ channelId }, 'Voice connection destroyed');
    });

    this.connection.on('error', (error: Error) => {
      this.logger.error({ error, channelId }, 'Voice connection error');
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectRetries) {
      this.logger.error(
        { channelId: this.standbyChannelId, attempts: this.reconnectAttempts },
        'Max reconnection attempts reached',
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);

    this.logger.warn(
      {
        channelId: this.standbyChannelId,
        attempt: this.reconnectAttempts,
        maxRetries: this.maxReconnectRetries,
        delay,
      },
      'Scheduling voice reconnection',
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.standbyChannelId, this.guildId).catch((err) => {
        this.logger.error({ error: err }, 'Reconnection attempt failed');
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
