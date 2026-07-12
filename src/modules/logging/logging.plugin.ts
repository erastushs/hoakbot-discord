import { TOKENS } from '../../core/container/tokens.js';
import { pluginInternalCapabilities, type PluginFactory } from '../../plugin-core/index.js';
import type { IModule } from '../module.interface.js';
import { loggingManifest } from './manifest.js';
import { createLoggingSettings } from './settings.js';
import { MemberLogService } from './services/member-log.service.js';
import { MessageLogService } from './services/message-log.service.js';
import { ModerationLogService } from './services/moderation-log.service.js';
import { VoiceLogService } from './services/voice-log.service.js';

export const loggingPluginParity = Object.freeze({
  id: loggingManifest.id,
  settings: Object.freeze([...(loggingManifest.settings ?? [])]),
  commands: Object.freeze([...(loggingManifest.commands ?? [])]),
  events: Object.freeze([...(loggingManifest.events ?? [])]),
  routes: Object.freeze([...(loggingManifest.routes ?? [])]),
  dashboard: loggingManifest.dashboard,
});

export const createLoggingPlugin: PluginFactory = (context) => {
  const container = context[pluginInternalCapabilities]?.container;
  if (!container) throw new Error('Logging plugin requires the built-in capability bridge.');
  let started = false;
  let services: Array<{ register(): void; dispose(): void }> = [];
  const module: IModule = Object.freeze({ name: 'logging', version: '1.0.0', enabled: true, manifest: loggingManifest, register: () => undefined });
  return {
    id: loggingManifest.id,
    module,
    start: () => {
      if (started) return;
      const config = container.resolve(TOKENS.ConfigurationService).current();
      const settings = container.has(TOKENS.SettingsRegistry) ? container.resolve(TOKENS.SettingsRegistry) : undefined;
      settings?.register('logging', createLoggingSettings(config));
      started = true;
      const logger = container.resolve(TOKENS.Logger);
      const metrics = container.resolve(TOKENS.MetricsService);
      metrics.counter('plugin_migration_logging_cutover').increment();
      if (!config.bot.logging.enabled) {
        logger.info('Logging module disabled via config');
        return;
      }
      const client = container.resolve(TOKENS.DiscordClient);
      const eventBus = container.resolve(TOKENS.EventBus);
      services = [
        new VoiceLogService(client, config.bot.logging.voice, logger, metrics),
        new MemberLogService(client, config.bot.logging.member, logger, metrics, eventBus),
        new MessageLogService(client, config.bot.logging.message, logger, metrics, eventBus),
        new ModerationLogService(client, config.bot.logging.moderation, logger, metrics, eventBus),
      ];
      for (const service of services) service.register();
      logger.info('Logging plugin registered');
    },
    stop: () => {
      if (!started) return;
      for (const service of [...services].reverse()) service.dispose();
      services = [];
      if (container.has(TOKENS.SettingsRegistry)) container.resolve(TOKENS.SettingsRegistry).unregister('logging');
      started = false;
    },
  };
}
