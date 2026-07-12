import type { CommandRegistry } from '../shared/command-registry.js';
import type { CommandContext, ICommand } from '../shared/types/command.js';
import { CommandIndexer } from '../modules/general/help/command-indexer.js';

export type CommandIndexMode = 'catalog' | 'legacy';

export function commandIndexMode(value = process.env.COMMAND_INDEX_MODE): CommandIndexMode {
  return value === 'legacy' ? 'legacy' : 'catalog';
}

export function routerCommand(registry: CommandRegistry, name: string, mode = commandIndexMode()): ICommand | null {
  return mode === 'legacy'
    ? (registry.find(name) ?? registry.findByAlias(name))
    : (registry.descriptor(name)?.command ?? registry.findByAlias(name));
}

export function helpCommands(
  registry: CommandRegistry,
  context?: CommandContext,
  ownerIds: readonly string[] = [],
  mode = commandIndexMode(),
): readonly ICommand[] {
  return mode === 'legacy'
    ? registry
        .all()
        .filter((command) => !command.hidden)
        .sort((a, b) => a.name.localeCompare(b.name))
    : new CommandIndexer(registry, ownerIds).commands(context);
}
