import type {
  Guild,
  GuildMember,
  GuildTextBasedChannel,
  User,
  InteractionReplyOptions,
  MessagePayload,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import type { IEventBus } from '../../core/event-bus/types.js';

export interface CommandContext {
  readonly source: 'slash' | 'prefix';
  readonly user: User;
  readonly member: GuildMember | null;
  readonly guild: Guild | null;
  readonly channel: GuildTextBasedChannel | null;
  readonly args: ReadonlyMap<string, unknown>;
  readonly logger: ILogger;
  readonly eventBus: IEventBus;
  reply(content: string | MessagePayload | InteractionReplyOptions): Promise<unknown>;
  deferReply(): Promise<unknown>;
  readonly createdAt: Date;
}

export interface ICommand {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly hidden?: boolean;
  readonly cooldown?: number;
  readonly guildOnly?: boolean;
  readonly requiredPermissions?: bigint[];
  readonly slashOptions?: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  readonly prefixAliases?: string[];
  execute(ctx: CommandContext): Promise<void>;
}
