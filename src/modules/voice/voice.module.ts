import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { ConnectionManager } from './services/ConnectionManager.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import type { IEventBus } from '../../core/event-bus/types.js';
import type { VoiceMemberJoinedEvent } from '../../core/event-bus/events.js';
import type { Client, VoiceState } from 'discord.js';
import { Events } from 'discord.js';

export class VoiceModule implements IModule {
  readonly name = 'voice';
  readonly version = '1.0.0';
  readonly enabled = true;

  private connectionManager: ConnectionManager | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const eventBus = container.resolve(TOKENS.EventBus);

    const { standbyChannelId, reconnectDelayMs, maxReconnectRetries } = config.bot.voice;

    this.connectionManager = new ConnectionManager(client, logger, maxReconnectRetries, reconnectDelayMs);

    eventBus.subscribe('bot.ready', () => {
      void this.handleReady(standbyChannelId, config.guildId, logger);
    });

    eventBus.subscribe('voice.memberJoined', (event) => {
      void this.handleMemberJoined(event);
    });

    this.registerVoiceStateHandler(client, eventBus, logger);
  }

  onShutdown(): Promise<void> {
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
  }

  private async handleMemberJoined(event: VoiceMemberJoinedEvent): Promise<void> {
    if (!this.connectionManager) return;
    await this.connectionManager.moveTo(event.channelId, event.guildId);
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

      // LEAVE: was in a channel, now not — ignore
      // MOVE: was in a channel, now in different channel — ignore
      // JOIN: was not in a channel, now is
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
