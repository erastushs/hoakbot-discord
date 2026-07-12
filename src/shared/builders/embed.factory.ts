import { EmbedBuilder } from 'discord.js';
import type { ColorResolvable } from 'discord.js';
import type { CommandContext } from '../types/command.js';
import { COLORS } from '../constants/colors.js';
import { DISCORD_EMBED_LIMITS, neutralizeMassMentions, truncateDiscordText } from './discord-content.js';

interface EmbedOptions {
  title?: string;
  description?: string | null;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: string;
  image?: string;
  footer?: string;
  timestamp?: boolean;
}

export class EmbedFactory {
  private static base(ctx: CommandContext): EmbedBuilder {
    return new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `Requested by ${ctx.user.displayName}`, iconURL: ctx.user.displayAvatarURL() });
  }

  static build(opts: EmbedOptions): EmbedBuilder {
    const embed = new EmbedBuilder();
    if (opts.timestamp !== false) embed.setTimestamp();
    if (opts.color) embed.setColor(opts.color);
    if (opts.title) embed.setTitle(truncateDiscordText(opts.title, DISCORD_EMBED_LIMITS.title));
    if (opts.description !== undefined) embed.setDescription(opts.description === null ? null : truncateDiscordText(opts.description, DISCORD_EMBED_LIMITS.description));
    if (opts.fields) embed.addFields(...opts.fields.map((field) => ({
      ...field,
      name: truncateDiscordText(field.name, DISCORD_EMBED_LIMITS.fieldName),
      value: truncateDiscordText(field.value, DISCORD_EMBED_LIMITS.fieldValue),
    })));
    if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);
    if (opts.image) embed.setImage(opts.image);
    if (opts.footer) embed.setFooter({ text: truncateDiscordText(opts.footer, DISCORD_EMBED_LIMITS.footer) });
    return embed;
  }

  static success(ctx: CommandContext): EmbedBuilder {
    return EmbedFactory.base(ctx).setColor(COLORS.SUCCESS);
  }

  static error(ctx: CommandContext): EmbedBuilder {
    return EmbedFactory.base(ctx).setColor(COLORS.ERROR);
  }

  static warning(ctx: CommandContext): EmbedBuilder {
    return EmbedFactory.base(ctx).setColor(COLORS.WARNING);
  }

  static info(ctx: CommandContext): EmbedBuilder {
    return EmbedFactory.base(ctx).setColor(COLORS.PRIMARY);
  }

  static custom(ctx: CommandContext, opts: EmbedOptions): EmbedBuilder {
    const embed = EmbedFactory.base(ctx);
    if (opts.color) embed.setColor(opts.color);
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
    return embed;
  }
}
