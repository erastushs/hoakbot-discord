import type { AutocompleteInteraction, ApplicationCommandOptionChoiceData } from 'discord.js';
import type { ICommand, CommandContext } from '../types/command.js';

export type CommandScope = 'guild' | 'global';
export type CommandVisibility = 'public' | 'authorized' | 'hidden';
export type PermissionAction = 'public' | 'discord-permissions' | 'owner';

export interface CommandOptionMetadata {
  readonly type: number;
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly autocomplete?: boolean;
  readonly choices?: readonly Readonly<{ name: string; value: string | number }>[];
  readonly options?: readonly CommandOptionMetadata[];
  readonly min_length?: number;
  readonly max_length?: number;
  readonly min_value?: number;
  readonly max_value?: number;
  readonly channel_types?: readonly number[];
}

export interface CommandPayloadMetadata {
  readonly name: string;
  readonly description: string;
  readonly options?: readonly CommandOptionMetadata[];
  readonly [key: string]: unknown;
}

export interface CommandAutocompleteContext extends CommandContext {
  readonly interaction: AutocompleteInteraction;
  readonly command: ICommand;
  readonly option: string;
  readonly value: string;
  readonly signal: AbortSignal;
}

export type CommandAutocompleteHandler = (
  context: CommandAutocompleteContext,
) => Promise<readonly ApplicationCommandOptionChoiceData[]>;

export interface CommandMetadata {
  readonly owner: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly aliases: readonly string[];
  readonly scope: CommandScope;
  readonly permissionAction: PermissionAction;
  readonly requiredPermissions: readonly string[];
  readonly visibility: CommandVisibility;
  readonly autocompleteOptions: readonly string[];
  readonly payload: Readonly<CommandPayloadMetadata> | null;
}

export interface CommandDescriptor<TCommand extends ICommand = ICommand> {
  readonly metadata: CommandMetadata;
  readonly command: TCommand;
  readonly execute: (context: CommandContext) => Promise<void>;
  readonly autocomplete?: CommandAutocompleteHandler;
}

export interface DefineCommandInput<TCommand extends ICommand> {
  readonly owner: string;
  readonly command: TCommand;
  readonly permissionAction?: PermissionAction;
  readonly visibility?: CommandVisibility;
  readonly scope?: CommandScope;
  readonly autocomplete?: Readonly<Record<string, CommandAutocompleteHandler>>;
}

export function defineCommand<const TCommand extends ICommand>(
  input: DefineCommandInput<TCommand>,
): CommandDescriptor<TCommand> {
  const autocompleteOptions = Object.keys(input.autocomplete ?? {}).sort();
  const payload = input.command.slashOptions?.toJSON() as Readonly<CommandPayloadMetadata> | undefined;
  const handlers = input.autocomplete;
  return Object.freeze({
    metadata: Object.freeze({
      owner: input.owner,
      name: input.command.name,
      description: payload?.description ?? input.command.description,
      category: input.command.category,
      aliases: Object.freeze([...(input.command.prefixAliases ?? [])]),
      scope: input.scope ?? (input.command.guildOnly ? 'guild' : 'global'),
      permissionAction:
        input.permissionAction ?? (input.command.requiredPermissions?.length ? 'discord-permissions' : 'public'),
      requiredPermissions: Object.freeze((input.command.requiredPermissions ?? []).map(String)),
      visibility:
        input.visibility ??
        (input.command.hidden ? 'hidden' : input.command.requiredPermissions?.length ? 'authorized' : 'public'),
      autocompleteOptions: Object.freeze(autocompleteOptions),
      payload: payload ? Object.freeze(payload) : null,
    }),
    command: input.command,
    execute: input.command.execute.bind(input.command),
    autocomplete: handlers
      ? async (context: CommandAutocompleteContext) => handlers[context.option]?.(context) ?? []
      : undefined,
  });
}
