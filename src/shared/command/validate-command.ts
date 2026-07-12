import { ApplicationCommandOptionType } from 'discord.js';
import type { CommandDescriptor, CommandOptionMetadata } from './define-command.js';

const namePattern = /^[a-z0-9_-]{1,32}$/;
const actionPattern = /^(public|discord-permissions|owner)$/;
const valueTypes = new Set<number>([
  ApplicationCommandOptionType.String,
  ApplicationCommandOptionType.Integer,
  ApplicationCommandOptionType.Boolean,
  ApplicationCommandOptionType.User,
  ApplicationCommandOptionType.Channel,
  ApplicationCommandOptionType.Role,
  ApplicationCommandOptionType.Mentionable,
  ApplicationCommandOptionType.Number,
  ApplicationCommandOptionType.Attachment,
]);
const autocompleteTypes = new Set<number>([
  ApplicationCommandOptionType.String,
  ApplicationCommandOptionType.Integer,
  ApplicationCommandOptionType.Number,
]);

function fail(message: string, path: string): never {
  throw new Error(`${message}: ${path}`);
}

function validateOptions(
  options: readonly CommandOptionMetadata[],
  path: string,
  bindings: Set<string>,
  discovered: Set<string>,
): void {
  if (options.length > 25) fail('Too many options', path);
  const names = new Set<string>();
  let optionalSeen = false;
  for (const option of options) {
    const optionPath = `${path}.${option.name}`;
    if (!namePattern.test(option.name) || names.has(option.name)) fail('Invalid option', optionPath);
    names.add(option.name);
    const nested =
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup;
    if (nested) {
      if (option.description === undefined || option.description.length < 1 || option.description.length > 100)
        fail('Invalid option description', optionPath);
      if (option.required !== undefined || option.autocomplete !== undefined || option.choices !== undefined)
        fail('Invalid nested option fields', optionPath);
      const children = option.options ?? [];
      if (!children.length) fail('Missing nested options', optionPath);
      if (
        option.type === ApplicationCommandOptionType.SubcommandGroup &&
        children.some((child) => child.type !== ApplicationCommandOptionType.Subcommand)
      )
        fail('Invalid subcommand group child', optionPath);
      if (
        option.type === ApplicationCommandOptionType.Subcommand &&
        children.some((child) => !valueTypes.has(child.type))
      )
        fail('Invalid subcommand child', optionPath);
      validateOptions(children, optionPath, bindings, discovered);
      continue;
    }
    if (!valueTypes.has(option.type)) fail('Invalid option type', optionPath);
    if (option.description === undefined || option.description.length < 1 || option.description.length > 100)
      fail('Invalid option description', optionPath);
    if (option.required) {
      if (optionalSeen) fail('Required option after optional option', optionPath);
    } else optionalSeen = true;
    if ((option.choices?.length ?? 0) > 25) fail('Too many choices', optionPath);
    if (option.choices && option.autocomplete) fail('Choices and autocomplete conflict', optionPath);
    if (option.autocomplete) {
      if (!autocompleteTypes.has(option.type)) fail('Invalid autocomplete option', optionPath);
      discovered.add(option.name);
      if (!bindings.has(option.name)) fail('Missing autocomplete binding', optionPath);
    }
    if (option.type === ApplicationCommandOptionType.String) {
      if (
        option.min_length !== undefined &&
        (!Number.isInteger(option.min_length) || option.min_length < 0 || option.min_length > 6000)
      )
        fail('Invalid string minimum', optionPath);
      if (
        option.max_length !== undefined &&
        (!Number.isInteger(option.max_length) || option.max_length < 1 || option.max_length > 6000)
      )
        fail('Invalid string maximum', optionPath);
      if (option.min_length !== undefined && option.max_length !== undefined && option.min_length > option.max_length)
        fail('Invalid string bounds', optionPath);
    }
    if (option.min_value !== undefined && option.max_value !== undefined && option.min_value > option.max_value)
      fail('Invalid numeric bounds', optionPath);
    if (
      option.type === ApplicationCommandOptionType.Integer &&
      [option.min_value, option.max_value].some((value) => value !== undefined && !Number.isSafeInteger(value))
    )
      fail('Invalid integer bound', optionPath);
  }
}

export function validateCommandDescriptors(descriptors: readonly CommandDescriptor[]): void {
  const names = new Set<string>();
  const aliases = new Set<string>();
  for (const { metadata, command } of descriptors) {
    const name = metadata.name.toLowerCase();
    if (!namePattern.test(name)) fail('Invalid command name', metadata.name);
    if (!metadata.owner.trim()) fail('Missing command owner', name);
    if (!actionPattern.test(metadata.permissionAction)) fail('Invalid permission action', name);
    if (metadata.scope === 'global' && command.guildOnly) fail('Invalid command scope', name);
    if (metadata.description.length < 1 || metadata.description.length > 100) fail('Invalid command description', name);
    if (names.has(name) || aliases.has(name)) fail('Duplicate command', name);
    names.add(name);
    for (const value of metadata.aliases) {
      const alias = value.toLowerCase();
      if (!namePattern.test(alias) || names.has(alias) || aliases.has(alias))
        fail('Duplicate alias', `${alias} for command ${name}`);
      aliases.add(alias);
    }
    const payload = metadata.payload;
    const bindings = new Set(metadata.autocompleteOptions);
    const discovered = new Set<string>();
    validateOptions(payload?.options ?? [], name, bindings, discovered);
    for (const binding of bindings)
      if (!discovered.has(binding)) fail('Invalid autocomplete binding', `${name}.${binding}`);
    if (payload && (payload.name !== metadata.name || payload.description !== metadata.description))
      fail('Payload metadata mismatch', name);
  }
}
