import type { ICommand } from './types/command.js';

export class CommandRegistry {
  private readonly commands = new Map<string, ICommand>();
  private readonly aliasMap = new Map<string, ICommand>();

  register(command: ICommand): void {
    const name = command.name.toLowerCase();
    if (this.commands.has(name)) {
      throw new Error(`Duplicate command: ${name}`);
    }
    this.commands.set(name, command);

    if (command.prefixAliases) {
      for (const alias of command.prefixAliases) {
        const lower = alias.toLowerCase();
        if (this.aliasMap.has(lower)) {
          throw new Error(`Duplicate alias: ${lower} for command ${name}`);
        }
        this.aliasMap.set(lower, command);
      }
    }
  }

  find(name: string): ICommand | null {
    return this.commands.get(name.toLowerCase()) ?? null;
  }

  findByAlias(alias: string): ICommand | null {
    return this.aliasMap.get(alias.toLowerCase()) ?? null;
  }

  all(): ReadonlyArray<ICommand> {
    return [...this.commands.values()];
  }
}
