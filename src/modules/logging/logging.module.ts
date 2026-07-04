import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { VoiceLogService } from './services/voice-log.service.js';
import { MemberLogService } from './services/member-log.service.js';
import { MessageLogService } from './services/message-log.service.js';
import { ModerationLogService } from './services/moderation-log.service.js';
import { loggingManifest } from './manifest.js';
import { createLoggingSettings } from './settings.js';

export class LoggingModule implements IModule {
  readonly name = 'logging';
  readonly version = '1.0.0';
  readonly enabled = true;
  readonly manifest = loggingManifest;

  private voiceLogService: VoiceLogService | null = null;
  private memberLogService: MemberLogService | null = null;
  private messageLogService: MessageLogService | null = null;
  private moderationLogService: ModerationLogService | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const metrics = container.resolve(TOKENS.MetricsService);
    const eventBus = container.resolve(TOKENS.EventBus);

    if (container.has(TOKENS.SettingsRegistry)) {
      container.resolve(TOKENS.SettingsRegistry).register(this.name, createLoggingSettings(config));
    }

    if (!config.bot.logging.enabled) {
      logger.info('Logging module disabled via config');
      return;
    }

    this.voiceLogService = new VoiceLogService(client, config.bot.logging.voice, logger, metrics);
    this.voiceLogService.register();

    this.memberLogService = new MemberLogService(client, config.bot.logging.member, logger, metrics, eventBus);
    this.memberLogService.register();

    this.messageLogService = new MessageLogService(client, config.bot.logging.message, logger, metrics, eventBus);
    this.messageLogService.register();

    this.moderationLogService = new ModerationLogService(client, config.bot.logging.moderation, logger, metrics, eventBus);
    this.moderationLogService.register();

    logger.info('Logging module registered');
  }
}
