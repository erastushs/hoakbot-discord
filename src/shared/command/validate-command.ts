import { ApplicationCommandOptionType } from 'discord.js';
import type { CommandDescriptor } from './define-command.js';

const commandName = /^[a-z0-9_-]{1,32}$/;

export function validateCommandDescriptors(descriptors: readonly CommandDescriptor[]): void {
  const names = new Set<string>();
  const aliases = new Set<string>();
  for (const descriptor of descriptors) {
    const { metadata } = descriptor;
    const name = metadata.name.toLowerCase();
    if (!commandName.test(name)) throw new Error(`Invalid command name: ${metadata.name}`);
    if (!metadata.owner.trim()) throw new Error(`Missing command owner: ${name}`);
    if (!metadata.permissionAction.trim()) throw new Error(`Invalid permission action: ${name}`);
    if (metadata.description.length < 1 || metadata.description.length > 100) throw new Error(`Invalid command description: ${name}`);
    if (names.has(name) || aliases.has(name)) throw new Error(`Duplicate command: ${name}`);
    names.add(name);
    for (const aliasValue of metadata.aliases) {
      const alias = aliasValue.toLowerCase();
      if (!commandName.test(alias) || names.has(alias) || aliases.has(alias)) throw new Error(`Duplicate alias: ${alias} for command ${name}`);
      aliases.add(alias);
    }
    const options = Array.isArray(metadata.payload?.options) ? metadata.payload.options as Array<Record<string, unknown>> : [];
    const optionNames = new Set<string>();
    const autocomplete = new Set<string>();
    for (const option of options) {
      const optionName = String(option.name ?? '');
      if (!commandName.test(optionName) || optionNames.has(optionName)) throw new Error(`Invalid option: ${name}.${optionName}`);
      optionNames.add(optionName);
      if (option.autocomplete === true) autocomplete.add(optionName);
      if (option.autocomplete === true && option.type !== ApplicationCommandOptionType.String && option.type !== ApplicationCommandOptionType.Integer && option.type !== ApplicationCommandOptionType.Number) throw new Error(`Invalid autocomplete option: ${name}.${optionName}`);
    }
    for (const option of metadata.autocompleteOptions) {
      if (!optionNames.has(option) || !autocomplete.has(option)) throw new Error(`Invalid autocomplete binding: ${name}.${option}`);
    }
    for (const option of autocomplete) if (!metadata.autocompleteOptions.includes(option)) throw new Error(`Missing autocomplete binding: ${name}.${option}`);
  }
}
