import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { ConnectionManager } from './services/ConnectionManager.js';
import type { ILogger } from '../../core/logger/logger.service.js';

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
}
