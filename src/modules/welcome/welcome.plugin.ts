import { defineEvent } from '@hoakbot/plugin-contracts';
import type { GuildMember } from 'discord.js';
import { builtInGrantName, type BuiltInCapabilityGrant, type PluginFactory } from '../../plugin-core/index.js';
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
  const grant = context.grants?.[builtInGrantName] as BuiltInCapabilityGrant | undefined;
  if (!grant) throw new Error('Welcome plugin requires an explicit built-in capability grant.');
  let started = false;
  let service: WelcomeService | undefined;
  const declarative = context.eventMode === 'declarative';
  const events = [defineEvent({ id: 'discord.guild_member_add', owner: welcomeManifest.id, source: 'discord', payload: { parse: (value) => value as GuildMember }, handler: (member) => service?.handleMemberJoin(member) })];
  const module: IModule = Object.freeze({ name: 'welcome', version: '1.0.0', enabled: true, manifest: welcomeManifest, register: () => undefined });
  return {
    id: welcomeManifest.id,
    module,
    events,
    start: () => {
      if (started) return;
      const configurationService = grant.configuration;
      const config = configurationService.current();
      const settings = grant.settings;
      settings?.register('welcome', createWelcomeSettings(config));
      const logger = grant.logger;
      service = new WelcomeService(
        grant.client,
        configurationService,
        new ImageService(logger),
        new TemplateService(),
        logger,
        grant.metrics,
      );
      if (!declarative) service.register();
      else service.activate();
      started = true;
      grant.metrics.counter('plugin_migration_welcome_cutover').increment();
      logger.info({ enabled: config.bot.welcome.enabled }, 'Welcome plugin registered');
    },
    stop: () => {
      if (!started) return;
      service?.dispose();
      service = undefined;
      if (grant.settings) grant.settings.unregister('welcome');
      started = false;
    },
  };
}
