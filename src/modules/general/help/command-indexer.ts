import type { ICommand } from '../../../shared/types/command.js';
import type { CommandRegistry } from '../../../shared/command-registry.js';
import type { CommandContext } from '../../../shared/types/command.js';
import { evaluateCommandAuthorization } from '../../../shared/command/authorize-command.js';

export interface HelpCategory {
  readonly name: string;
  readonly commands: readonly ICommand[];
}

export class CommandIndexer {
  constructor(private readonly registry: CommandRegistry, private readonly ownerIds: readonly string[] = []) {}

  commands(ctx?: CommandContext): readonly ICommand[] {
    return this.registry
      .catalog()
      .filter(({ metadata, command }) => metadata.visibility !== 'hidden' && (!ctx || this.visible(command, ctx)))
      .map(({ command }) => command)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  categories(): readonly HelpCategory[] {
    const grouped = new Map<string, ICommand[]>();
    for (const command of this.commands()) {
      const name = command.category.charAt(0).toUpperCase() + command.category.slice(1);
      grouped.set(name, [...(grouped.get(name) ?? []), command]);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, commands]) => ({ name, commands }));
  }

  visible(command: ICommand, ctx: CommandContext): boolean {
    const descriptor = this.registry.descriptor(command.name);
    if (!descriptor || descriptor.metadata.visibility === 'hidden') return false;
    return evaluateCommandAuthorization(descriptor.metadata, command, ctx, this.ownerIds, false).ok;
  }

  find(value: string): ICommand | null {
    const name = value.trim().toLowerCase();
    return this.registry.find(name) ?? this.registry.findByAlias(name);
  }
}
