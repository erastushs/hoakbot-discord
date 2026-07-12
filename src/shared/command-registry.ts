import type { ICommand } from './types/command.js';
import { defineCommand, type CommandDescriptor } from './command/define-command.js';
import { validateCommandDescriptors } from './command/validate-command.js';

function immutable<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

export class CommandRegistry {
  private readonly commands = new Map<string, ICommand>();
  private readonly aliasMap = new Map<string, ICommand>();
  private readonly descriptors = new Map<string, CommandDescriptor>();

  register(command: ICommand | CommandDescriptor): void {
    const descriptor = 'metadata' in command ? command : defineCommand({ owner: 'legacy', command });
    const name = descriptor.metadata.name.toLowerCase();
    validateCommandDescriptors([...this.descriptors.values(), descriptor]);
    const nextCommands = new Map(this.commands);
    const nextAliases = new Map(this.aliasMap);
    nextCommands.set(name, descriptor.command);
    for (const alias of descriptor.metadata.aliases) nextAliases.set(alias.toLowerCase(), descriptor.command);
    this.commands.clear();
    this.aliasMap.clear();
    for (const entry of nextCommands) this.commands.set(...entry);
    for (const entry of nextAliases) this.aliasMap.set(...entry);
    this.descriptors.set(name, descriptor);
  }

  registerMany(commands: readonly (ICommand | CommandDescriptor)[]): void {
    const descriptors = commands.map((command) => 'metadata' in command ? command : defineCommand({ owner: 'legacy', command }));
    validateCommandDescriptors([...this.descriptors.values(), ...descriptors]);
    const nextCommands = new Map(this.commands);
    const nextAliases = new Map(this.aliasMap);
    const nextDescriptors = new Map(this.descriptors);
    for (const descriptor of descriptors) {
      const name = descriptor.metadata.name.toLowerCase();
      nextCommands.set(name, descriptor.command);
      nextDescriptors.set(name, descriptor);
      for (const alias of descriptor.metadata.aliases) nextAliases.set(alias.toLowerCase(), descriptor.command);
    }
    this.commands.clear();
    this.aliasMap.clear();
    this.descriptors.clear();
    for (const entry of nextCommands) this.commands.set(...entry);
    for (const entry of nextAliases) this.aliasMap.set(...entry);
    for (const entry of nextDescriptors) this.descriptors.set(...entry);
  }

  descriptor(name: string): CommandDescriptor | null {
    return this.descriptors.get(name.toLowerCase()) ?? null;
  }

  catalog(): readonly CommandDescriptor[] {
    return immutable([...this.descriptors.values()].sort((a, b) => a.metadata.name.localeCompare(b.metadata.name)).map((descriptor) => ({ ...descriptor, metadata: structuredClone(descriptor.metadata) } as CommandDescriptor)));
  }

  deployment(scope: 'guild' | 'global' = 'guild'): readonly Readonly<Record<string, unknown>>[] {
    return immutable(this.catalog().filter(({ metadata }) => metadata.scope === scope && metadata.payload).map(({ metadata }) => structuredClone(metadata.payload!)));
  }

  unregister(name: string): void {
    const command = this.commands.get(name.toLowerCase());
    if (!command) return;
    this.commands.delete(name.toLowerCase());
    this.descriptors.delete(name.toLowerCase());
    for (const [alias, registered] of this.aliasMap) {
      if (registered === command) this.aliasMap.delete(alias);
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
