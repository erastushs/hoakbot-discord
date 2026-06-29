import { resolve } from 'node:path';
import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { ConnectionManager } from './services/ConnectionManager.js';
import { AudioManager } from './services/AudioManager.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import type { IEventBus } from '../../core/event-bus/types.js';
import type { VoiceMemberJoinedEvent } from '../../core/event-bus/events.js';
import type { Client, VoiceState } from 'discord.js';
import { Events } from 'discord.js';

enum VoiceStateEnum {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  PLAYING = 'PLAYING',
  RETURNING = 'RETURNING',
  COOLDOWN = 'COOLDOWN',
}

export class VoiceModule implements IModule {
  readonly name = 'voice';
  readonly version = '1.0.0';
  readonly enabled = true;

  private connectionManager: ConnectionManager | null = null;
  private audioManager: AudioManager | null = null;
  private defaultSound = '';
  private volume = 1.0;
  private cooldownMs = 5000;
  private state: VoiceStateEnum = VoiceStateEnum.IDLE;
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const eventBus = container.resolve(TOKENS.EventBus);

    const { standbyChannelId, reconnectDelayMs, maxReconnectRetries, defaultSound, volume, cooldownMs } =
      config.bot.voice;
    this.defaultSound = defaultSound;
    this.volume = volume;
    this.cooldownMs = cooldownMs;

    this.connectionManager = new ConnectionManager(client, logger, maxReconnectRetries, reconnectDelayMs);
    this.audioManager = new AudioManager(logger);

    eventBus.subscribe('bot.ready', () => {
      void this.handleReady(standbyChannelId, config.guildId, logger);
    });

    eventBus.subscribe('voice.memberJoined', (event) => {
      void this.handleMemberJoined(event, logger);
    });

    this.registerVoiceStateHandler(client, eventBus, logger);
  }

  onShutdown(): Promise<void> {
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    if (this.connectionManager) {
      return this.connectionManager.disconnect();
    }
    return Promise.resolve();
  }

  private async handleReady(standbyChannelId: string, guildId: string, logger: ILogger): Promise<void> {
    if (!standbyChannelId || !guildId) {
      logger.warn('Standby channel ID or guild ID not configured — voice module inactive');
      return;
    }

    logger.info({ channelId: standbyChannelId, guildId }, 'Voice module joining standby channel');
    await this.connectionManager!.joinStandby(standbyChannelId, guildId);
    this.transition(VoiceStateEnum.IDLE, logger);
  }

  private async handleMemberJoined(event: VoiceMemberJoinedEvent, logger: ILogger): Promise<void> {
    if (!this.connectionManager || !this.audioManager) return;

    if (this.state !== VoiceStateEnum.IDLE) {
      logger.info({ user: event.username, state: this.state }, 'Ignored voice event while busy');
      return;
    }

    this.transition(VoiceStateEnum.MOVING, logger);
    logger.info({ user: event.username, channelId: event.channelId }, 'Processing voice.memberJoined');

    await this.connectionManager.moveTo(event.channelId, event.guildId);

    const connection = this.connectionManager.getConnection();
    const soundPath = resolve('assets', 'sounds', `${this.defaultSound}.mp3`);

    this.transition(VoiceStateEnum.PLAYING, logger);

    try {
      await this.audioManager.play(connection, soundPath, this.volume);
      logger.info({ sound: this.defaultSound }, 'Playback finished');
    } catch (err) {
      logger.error({ error: err }, 'Playback error');
    }

    this.transition(VoiceStateEnum.RETURNING, logger);
    this.connectionManager.returnToStandby();
    this.enterCooldown(logger);
  }

  private enterCooldown(logger: ILogger): void {
    this.transition(VoiceStateEnum.COOLDOWN, logger);

    this.cooldownTimer = setTimeout(() => {
      this.transition(VoiceStateEnum.IDLE, logger);
    }, this.cooldownMs);
  }

  private transition(newState: VoiceStateEnum, logger: ILogger): void {
    const prev = this.state;
    this.state = newState;
    logger.info({ from: prev, to: newState }, `Voice state: ${prev} → ${newState}`);
  }

  private registerVoiceStateHandler(client: Client, eventBus: IEventBus, logger: ILogger): void {
    client.on(Events.VoiceStateUpdate, (oldState: VoiceState, newState: VoiceState) => {
      const userId = newState.member?.id;
      const guild = newState.guild;
      const member = newState.member;

      if (!userId || !member) return;
      if (member.user.bot) return;
      if (userId === client.user?.id) return;

      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      if (oldChannelId || !newChannelId) return;

      const channelName = newState.channel?.name ?? 'Unknown';

      logger.info(
        {
          userId,
          username: member.user.username,
          guildId: guild.id,
          channelId: newChannelId,
          channelName,
        },
        'User joined voice channel',
      );

      eventBus.emit('voice.memberJoined', {
        guildId: guild.id,
        userId,
        username: member.user.username,
        channelId: newChannelId,
        channelName,
        joinedAt: Date.now(),
      });
    });
  }
}
