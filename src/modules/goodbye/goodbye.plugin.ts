import { defineEvent } from '@hoakbot/plugin-contracts';
import type { GuildMember, PartialGuildMember } from 'discord.js';
import { builtInGrantName, type BuiltInCapabilityGrant, type PluginFactory } from '../../plugin-core/index.js';
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
  const grant = context.grants?.[builtInGrantName] as BuiltInCapabilityGrant | undefined;
  if (!grant) throw new Error('Goodbye plugin requires an explicit built-in capability grant.');
  let started = false;
  let service: GoodbyeService | undefined;
  const declarative = context.eventMode === 'declarative';
  const events = [defineEvent({ id: 'discord.guild_member_remove', owner: goodbyeManifest.id, source: 'discord', payload: { parse: (value) => value as GuildMember | PartialGuildMember }, handler: (member) => service?.handleMemberLeave(member) })];
  const module: IModule = Object.freeze({ name: 'goodbye', version: '1.0.0', enabled: true, manifest: goodbyeManifest, register: () => undefined });
  return {
    id: goodbyeManifest.id,
    module,
    events,
    start: () => {
      if (started) return;
      const configurationService = grant.configuration;
      const config = configurationService.current();
      const settings = grant.settings;
      settings?.register('goodbye', createGoodbyeSettings(config));
      const logger = grant.logger;
      service = new GoodbyeService(grant.client, configurationService, new ImageService(logger), new TemplateService(), logger, grant.metrics);
      if (!declarative) service.register();
      else service.activate();
      started = true;
      grant.metrics.counter('plugin_migration_goodbye_cutover').increment();
      logger.info({ enabled: config.bot.goodbye.enabled }, 'Goodbye plugin registered');
    },
    stop: () => {
      if (!started) return;
      service?.dispose();
      service = undefined;
      if (grant.settings) grant.settings.unregister('goodbye');
      started = false;
    },
  };
}
