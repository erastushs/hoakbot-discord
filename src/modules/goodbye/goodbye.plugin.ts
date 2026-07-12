import { TOKENS } from '../../core/container/tokens.js';
import { pluginInternalCapabilities, type PluginFactory } from '../../plugin-core/index.js';
import { ImageService } from '../../shared/image/image.service.js';
import { TemplateService } from '../../shared/template/template.service.js';
import type { IModule } from '../module.interface.js';
import { goodbyeManifest } from './manifest.js';
import { GoodbyeService } from './services/goodbye.service.js';
import { createGoodbyeSettings } from './settings.js';

export const goodbyePluginParity = Object.freeze({
  id: goodbyeManifest.id,
  settings: Object.freeze([...(goodbyeManifest.settings ?? [])]),
  commands: Object.freeze([...(goodbyeManifest.commands ?? [])]),
  events: Object.freeze([...(goodbyeManifest.events ?? [])]),
  routes: Object.freeze([...(goodbyeManifest.routes ?? [])]),
  permissions: Object.freeze([...(goodbyeManifest.permissions ?? [])]),
  dashboard: goodbyeManifest.dashboard,
});

export const createGoodbyePlugin: PluginFactory = (context) => {
  const container = context[pluginInternalCapabilities]?.container;
  if (!container) throw new Error('Goodbye plugin requires the built-in capability bridge.');
  let started = false;
  let service: GoodbyeService | undefined;
  const module: IModule = Object.freeze({ name: 'goodbye', version: '1.0.0', enabled: true, manifest: goodbyeManifest, register: () => undefined });
  return {
    id: goodbyeManifest.id,
    module,
    start: () => {
      if (started) return;
      const configurationService = container.resolve(TOKENS.ConfigurationService);
      const config = configurationService.current();
      const settings = container.has(TOKENS.SettingsRegistry) ? container.resolve(TOKENS.SettingsRegistry) : undefined;
      settings?.register('goodbye', createGoodbyeSettings(config));
      const logger = container.resolve(TOKENS.Logger);
      service = new GoodbyeService(container.resolve(TOKENS.DiscordClient), configurationService, new ImageService(logger), new TemplateService(), logger, container.resolve(TOKENS.MetricsService));
      service.register();
      started = true;
      container.resolve(TOKENS.MetricsService).counter('plugin_migration_goodbye_cutover').increment();
      logger.info({ enabled: config.bot.goodbye.enabled }, 'Goodbye plugin registered');
    },
    stop: () => {
      if (!started) return;
      service?.dispose();
      service = undefined;
      if (container.has(TOKENS.SettingsRegistry)) container.resolve(TOKENS.SettingsRegistry).unregister('goodbye');
      started = false;
    },
  };
}
