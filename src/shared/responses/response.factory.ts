import type { ColorResolvable } from 'discord.js';
import type { CommandContext } from '../types/command.js';
import { EmbedFactory } from '../builders/embed.factory.js';
import type { EmbedBuilder } from 'discord.js';
import { DISCORD_EMBED_LIMITS, neutralizeMassMentions, truncateDiscordText } from '../builders/discord-content.js';

export interface ResponseOptions {
  title?: string;
  description?: string | null;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: string;
  image?: string;
  footer?: string;
}

export class Response {
  static async success(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    const embed = EmbedFactory.success(ctx);
    applyOptions(embed, opts);
    await ctx.reply({ embeds: [embed] });
  }

  static async error(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    const embed = EmbedFactory.error(ctx);
    applyOptions(embed, opts);
    await ctx.reply({ embeds: [embed] });
  }

  static async warning(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    const embed = EmbedFactory.warning(ctx);
    applyOptions(embed, opts);
    await ctx.reply({ embeds: [embed] });
  }

  static async info(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    const embed = EmbedFactory.info(ctx);
    applyOptions(embed, opts);
    await ctx.reply({ embeds: [embed] });
  }

  static async custom(ctx: CommandContext, opts: ResponseOptions & { build?: (embed: EmbedBuilder) => EmbedBuilder }): Promise<void> {
    const embed = EmbedFactory.custom(ctx, opts);
    const built = opts.build ? opts.build(embed) : embed;
    await ctx.reply({ embeds: [built] });
  }
}

function applyOptions(embed: EmbedBuilder, opts?: ResponseOptions): void {
  if (!opts) return;
  if (opts.title) embed.setTitle(truncateDiscordText(neutralizeMassMentions(opts.title), DISCORD_EMBED_LIMITS.title));
  if (opts.description !== undefined) embed.setDescription(opts.description === null ? null : truncateDiscordText(neutralizeMassMentions(opts.description), DISCORD_EMBED_LIMITS.description));
  if (opts.fields) embed.addFields(...opts.fields.map((field) => ({
    ...field,
    name: truncateDiscordText(neutralizeMassMentions(field.name), DISCORD_EMBED_LIMITS.fieldName),
    value: truncateDiscordText(neutralizeMassMentions(field.value), DISCORD_EMBED_LIMITS.fieldValue),
  })));
  if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);
  if (opts.image) embed.setImage(opts.image);
  if (opts.footer) embed.setFooter({ text: truncateDiscordText(neutralizeMassMentions(opts.footer), DISCORD_EMBED_LIMITS.footer) });
}
