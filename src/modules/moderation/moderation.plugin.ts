import { TOKENS } from '../../core/container/tokens.js';
import { pluginInternalCapabilities, type PluginFactory } from '../../plugin-core/index.js';
import type { ICommand } from '../../shared/types/command.js';
import type { IModule } from '../module.interface.js';
import { BanCommand } from './commands/ban.command.js';
import { CleanCommand } from './commands/clean.command.js';
import { KickCommand } from './commands/kick.command.js';
import { TimeoutCommand } from './commands/timeout.command.js';
import { WarnClearCommand } from './commands/warn-clear.command.js';
import { WarnRemoveCommand } from './commands/warn-remove.command.js';
import { WarnCommand } from './commands/warn.command.js';
import { WarningsCommand } from './commands/warnings.command.js';
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
  const container = context[pluginInternalCapabilities]?.container;
  if (!container) throw new Error('Moderation plugin requires the built-in capability bridge.');
  let started = false;
  let commands: ICommand[] = [];
  const module: IModule = Object.freeze({ name: 'moderation', version: '1.0.0', enabled: true, manifest: moderationManifest, register: () => undefined });
  return {
    id: moderationManifest.id,
    module,
    start: () => {
      if (started) return;
      const registry = container.resolve(TOKENS.CommandRegistry);
      const config = container.resolve(TOKENS.ConfigurationService).current();
      const metrics = container.resolve(TOKENS.MetricsService);
      const warningService = new WarningService(new WarningRepository(container.resolve(TOKENS.DatabaseAdapter)), container.resolve(TOKENS.Logger), container.resolve(TOKENS.EventBus), metrics);
      commands = [new CleanCommand(), new KickCommand(metrics), new BanCommand(metrics), new TimeoutCommand(metrics), new WarnCommand(warningService), new WarningsCommand(warningService), new WarnRemoveCommand(warningService), new WarnClearCommand(warningService)];
      if (container.has(TOKENS.SettingsRegistry)) container.resolve(TOKENS.SettingsRegistry).register('moderation', createModerationSettings(config));
      for (const command of commands) registry.register(command);
      started = true;
      metrics.counter('plugin_migration_moderation_cutover').increment();
    },
    stop: () => {
      if (!started) return;
      const registry = container.resolve(TOKENS.CommandRegistry);
      for (const command of commands) if (registry.find(command.name) === command) registry.unregister(command.name);
      commands = [];
      if (container.has(TOKENS.SettingsRegistry)) container.resolve(TOKENS.SettingsRegistry).unregister('moderation');
      started = false;
    },
  };
}
