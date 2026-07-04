import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { CleanCommand } from './commands/clean.command.js';
import { KickCommand } from './commands/kick.command.js';
import { BanCommand } from './commands/ban.command.js';
import { TimeoutCommand } from './commands/timeout.command.js';
import { WarnCommand } from './commands/warn.command.js';
import { WarningsCommand } from './commands/warnings.command.js';
import { WarnRemoveCommand } from './commands/warn-remove.command.js';
import { WarnClearCommand } from './commands/warn-clear.command.js';
import { WarningRepository } from './repositories/warning.repository.js';
import { WarningService } from './services/warning.service.js';
import { moderationManifest } from './manifest.js';
import { createModerationSettings } from './settings.js';

export class ModerationModule implements IModule {
  readonly name = 'moderation';
  readonly version = '1.0.0';
  readonly enabled = true;
  readonly manifest = moderationManifest;

  register(container: IContainer): void {
    const registry = container.resolve(TOKENS.CommandRegistry);
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const eventBus = container.resolve(TOKENS.EventBus);
    const metrics = container.resolve(TOKENS.MetricsService);

    if (container.has(TOKENS.SettingsRegistry)) {
      container.resolve(TOKENS.SettingsRegistry).register(this.name, createModerationSettings(config));
    }

    const cleanCommand = new CleanCommand();
    const kickCommand = new KickCommand(metrics);
    const banCommand = new BanCommand(metrics);
    const timeoutCommand = new TimeoutCommand(metrics);
    registry.register(cleanCommand);
    registry.register(kickCommand);
    registry.register(banCommand);
    registry.register(timeoutCommand);

    const databaseAdapter = container.resolve(TOKENS.DatabaseAdapter);
    const warningRepository = new WarningRepository(databaseAdapter);
    const warningService = new WarningService(warningRepository, logger, eventBus, metrics);
    const warnCommand = new WarnCommand(warningService);
    const warningsCommand = new WarningsCommand(warningService);
    const warnRemoveCommand = new WarnRemoveCommand(warningService);
    const warnClearCommand = new WarnClearCommand(warningService);
    registry.register(warnCommand);
    registry.register(warningsCommand);
    registry.register(warnRemoveCommand);
    registry.register(warnClearCommand);
  }
}
