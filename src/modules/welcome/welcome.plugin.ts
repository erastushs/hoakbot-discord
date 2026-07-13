import { TOKENS } from '../../core/container/tokens.js';
import { defineEvent } from '@hoakbot/plugin-contracts';
import type { GuildMember } from 'discord.js';
import { pluginInternalCapabilities, type PluginFactory } from '../../plugin-core/index.js';
import { ImageService } from '../../shared/image/image.service.js';
import { TemplateService } from '../../shared/template/template.service.js';
import type { IModule } from '../module.interface.js';
import { welcomeManifest } from './manifest.js';
import { WelcomeService } from './services/welcome.service.js';
import { createWelcomeSettings } from './settings.js';

export const welcomePluginParity = Object.freeze({
  id: welcomeManifest.id,
  settings: Object.freeze([...(welcomeManifest.settings ?? [])]),
  commands: Object.freeze([...(welcomeManifest.commands ?? [])]),
  events: Object.freeze([...(welcomeManifest.events ?? [])]),
  routes: Object.freeze([...(welcomeManifest.routes ?? [])]),
  permissions: Object.freeze([...(welcomeManifest.permissions ?? [])]),
  dashboard: welcomeManifest.dashboard,
});

export const createWelcomePlugin: PluginFactory = (context) => {
  const container = context[pluginInternalCapabilities]?.container;
  if (!container) throw new Error('Welcome plugin requires the built-in capability bridge.');
  let started = false;
  let service: WelcomeService | undefined;
  const declarative = context[pluginInternalCapabilities]?.eventMode === 'declarative';
  const events = [defineEvent({ id: 'discord.guild_member_add', owner: welcomeManifest.id, source: 'discord', payload: { parse: (value) => value as GuildMember }, handler: (member) => service?.handleMemberJoin(member) })];
  const module: IModule = Object.freeze({ name: 'welcome', version: '1.0.0', enabled: true, manifest: welcomeManifest, register: () => undefined });
  return {
    id: welcomeManifest.id,
    module,
    events,
    start: () => {
      if (started) return;
      const configurationService = container.resolve(TOKENS.ConfigurationService);
      const config = configurationService.current();
      const settings = container.has(TOKENS.SettingsRegistry) ? container.resolve(TOKENS.SettingsRegistry) : undefined;
      settings?.register('welcome', createWelcomeSettings(config));
      const logger = container.resolve(TOKENS.Logger);
      service = new WelcomeService(
        container.resolve(TOKENS.DiscordClient),
        configurationService,
        new ImageService(logger),
        new TemplateService(),
        logger,
        container.resolve(TOKENS.MetricsService),
      );
      if (!declarative) service.register();
      else service.activate();
      started = true;
      container.resolve(TOKENS.MetricsService).counter('plugin_migration_welcome_cutover').increment();
      logger.info({ enabled: config.bot.welcome.enabled }, 'Welcome plugin registered');
    },
    stop: () => {
      if (!started) return;
      service?.dispose();
      service = undefined;
      if (container.has(TOKENS.SettingsRegistry)) container.resolve(TOKENS.SettingsRegistry).unregister('welcome');
      started = false;
    },
  };
}
