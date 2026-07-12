import type { AppConfig } from '../../core/config/types.js';
import type { IMetrics } from '../../core/metrics/types.js';
import type { CommandRegistry } from '../command-registry.js';
import type { WarningService } from '../../modules/moderation/services/warning.service.js';
import { defineCommand, type CommandDescriptor } from './define-command.js';
import { PingCommand } from '../../modules/general/commands/ping.command.js';
import { HelpCommand } from '../../modules/general/commands/help.command.js';
import { AvatarCommand } from '../../modules/general/commands/avatar.command.js';
import { UserInfoCommand } from '../../modules/general/commands/userinfo.command.js';
import { ServerInfoCommand } from '../../modules/general/commands/serverinfo.command.js';
import { BotInfoCommand } from '../../modules/general/commands/botinfo.command.js';
import { CleanCommand } from '../../modules/moderation/commands/clean.command.js';
import { KickCommand } from '../../modules/moderation/commands/kick.command.js';
import { BanCommand } from '../../modules/moderation/commands/ban.command.js';
import { TimeoutCommand } from '../../modules/moderation/commands/timeout.command.js';
import { WarnCommand } from '../../modules/moderation/commands/warn.command.js';
import { WarningsCommand } from '../../modules/moderation/commands/warnings.command.js';
import { WarnRemoveCommand } from '../../modules/moderation/commands/warn-remove.command.js';
import { WarnClearCommand } from '../../modules/moderation/commands/warn-clear.command.js';
import type { HelpService } from '../../modules/general/help/help-service.js';
import { builtinCommandCatalog } from '../../generated/command-catalog.js';

export interface BuiltinCommandDependencies {
  readonly config: Readonly<AppConfig>;
  readonly registry: CommandRegistry;
  readonly helpService: HelpService;
  readonly metrics: IMetrics;
  readonly warningService: WarningService;
}

if (builtinCommandCatalog.length !== 14) throw new Error(`Expected 14 built-in commands, found ${builtinCommandCatalog.length}.`);

export function createGeneralCommandDescriptors(deps: Pick<BuiltinCommandDependencies, 'config' | 'helpService'>): readonly CommandDescriptor[] {
  return [new PingCommand(), new HelpCommand(deps.helpService), new AvatarCommand(), new UserInfoCommand(), new ServerInfoCommand(), new BotInfoCommand(deps.config)].map((command) => defineCommand({ owner: 'builtin.general', command }));
}

export function createModerationCommandDescriptors(deps: Pick<BuiltinCommandDependencies, 'metrics' | 'warningService'>): readonly CommandDescriptor[] {
  return [new CleanCommand(), new KickCommand(deps.metrics), new BanCommand(deps.metrics), new TimeoutCommand(deps.metrics), new WarnCommand(deps.warningService), new WarningsCommand(deps.warningService), new WarnRemoveCommand(deps.warningService), new WarnClearCommand(deps.warningService)].map((command) => defineCommand({ owner: 'builtin.moderation', command }));
}
