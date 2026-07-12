import type { AppConfig } from '../../core/config/types.js';
import type { IMetrics } from '../../core/metrics/types.js';
import type { CommandRegistry } from '../command-registry.js';
import type { WarningService } from '../../modules/moderation/services/warning.service.js';
import { defineCommand, type CommandDescriptor } from './define-command.js';
import type { ICommand } from '../types/command.js';
import type { HelpService } from '../../modules/general/help/help-service.js';
import { builtinCommandCatalog } from '../../generated/command-catalog.js';

export interface BuiltinCommandDependencies {
  readonly config: Readonly<AppConfig>;
  readonly registry: CommandRegistry;
  readonly helpService: HelpService;
  readonly metrics: IMetrics;
  readonly warningService: WarningService;
}

export type BuiltinCommandFactory = (dependencies: BuiltinCommandDependencies) => ICommand;

export function createBuiltinCommandDescriptors(
  owner: string,
  dependencies: BuiltinCommandDependencies,
): readonly CommandDescriptor[] {
  return builtinCommandCatalog
    .filter((entry) => entry.owner === owner)
    .map((entry) => defineCommand({ owner: entry.owner, command: entry.create(dependencies) }));
}

export function createGeneralCommandDescriptors(
  deps: Pick<BuiltinCommandDependencies, 'config' | 'helpService'>,
): readonly CommandDescriptor[] {
  return createBuiltinCommandDescriptors('builtin.general', deps as BuiltinCommandDependencies);
}

export function createModerationCommandDescriptors(
  deps: Pick<BuiltinCommandDependencies, 'metrics' | 'warningService'>,
): readonly CommandDescriptor[] {
  return createBuiltinCommandDescriptors('builtin.moderation', deps as BuiltinCommandDependencies);
}
