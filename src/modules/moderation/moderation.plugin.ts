import { builtInGrantName, type BuiltInCapabilityGrant, type PluginFactory } from '../../plugin-core/index.js';
import type { CommandDescriptor } from '../../shared/command/define-command.js';
import { createModerationCommandDescriptors } from '../../shared/command/builtin-commands.js';
import type { IModule } from '../module.interface.js';
import { moderationManifest } from './manifest.js';
import { WarningRepository } from './repositories/warning.repository.js';
import { WarningService } from './services/warning.service.js';
import { createModerationSettings } from './settings.js';

export const moderationPluginParity = Object.freeze({
  id: moderationManifest.id,
  settings: Object.freeze([...(moderationManifest.settings ?? [])]),
  commands: Object.freeze([...(moderationManifest.commands ?? [])]),
  events: Object.freeze([...(moderationManifest.events ?? [])]),
  routes: Object.freeze([...(moderationManifest.routes ?? [])]),
  permissions: Object.freeze([...(moderationManifest.permissions ?? [])]),
  dashboard: moderationManifest.dashboard,
});

export const createModerationPlugin: PluginFactory = (context) => {
  const grant = context.grants?.[builtInGrantName] as BuiltInCapabilityGrant | undefined;
  if (!grant) throw new Error('Moderation plugin requires an explicit built-in capability grant.');
  let started = false;
  let commands: CommandDescriptor[] = [];
  const publications = ['moderation.action', 'moderation.warningIssued'] as const;
  const module: IModule = Object.freeze({ name: 'moderation', version: '1.0.0', enabled: true, manifest: moderationManifest, register: () => undefined });
  return {
    id: moderationManifest.id,
    module,
    publications,
    start: () => {
      if (started) return;
      const registry = grant.commands;
      const config = grant.configuration.current();
      const metrics = grant.metrics;
      const warningService = new WarningService(new WarningRepository(grant.database), grant.logger, grant.events, metrics);
      commands = [...createModerationCommandDescriptors({ metrics, warningService })];
      if (grant.settings) grant.settings.register('moderation', createModerationSettings(config));
      registry.registerMany(commands);
      started = true;
      metrics.counter('plugin_migration_moderation_cutover').increment();
    },
    stop: () => {
      if (!started) return;
      const registry = grant.commands;
      for (const descriptor of commands) if (registry.find(descriptor.metadata.name) === descriptor.command) registry.unregister(descriptor.metadata.name);
      commands = [];
      if (grant.settings) grant.settings.unregister('moderation');
      started = false;
    },
  };
}
