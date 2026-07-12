import type { ICommand } from '../../../shared/types/command.js';
import type { CommandRegistry } from '../../../shared/command-registry.js';

export interface HelpCategory {
  readonly name: string;
  readonly commands: readonly ICommand[];
}

export class CommandIndexer {
  constructor(private readonly registry: CommandRegistry) {}

  commands(): readonly ICommand[] {
    return this.registry
      .all()
      .filter((command) => !command.hidden)
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

  find(value: string): ICommand | null {
    const name = value.trim().toLowerCase();
    return this.registry.find(name) ?? this.registry.findByAlias(name);
  }
}
