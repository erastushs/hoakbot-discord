import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { VoiceLogService } from './services/voice-log.service.js';

export class LoggingModule implements IModule {
  readonly name = 'logging';
  readonly version = '1.0.0';
  readonly enabled = true;

  private voiceLogService: VoiceLogService | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const metrics = container.resolve(TOKENS.MetricsService);

    if (!config.bot.logging.enabled) {
      logger.info('Logging module disabled via config');
      return;
    }

    this.voiceLogService = new VoiceLogService(client, config.bot.logging.voice, logger, metrics);
    this.voiceLogService.register();

    logger.info('Logging module registered');
  }
}
