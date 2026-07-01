import { SlashCommandBuilder, time } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import { Response } from '../../../shared/responses/response.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { Errors } from '../../../shared/errors/errors.js';

export class ServerInfoCommand implements ICommand {
  readonly name = 'serverinfo';
  readonly description = 'Displays information about the current server';
  readonly category = 'general';
  readonly slashOptions = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays information about the current server');
  readonly prefixAliases = ['si'];

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply(Errors.guildOnly());
      return;
    }

    const guild = ctx.guild;
    const owner = await guild.fetchOwner();

    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter((m) => !m.user.bot).size;
    const bots = totalMembers - humans;
    const textChannels = guild.channels.cache.filter((c) => c.isTextBased()).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.isVoiceBased()).size;
    const categories = guild.channels.cache.filter((c) => c.type === 4).size;
    const roleCount = guild.roles.cache.size;
    const boostTier = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount ?? 0;
    const emojiCount = guild.emojis.cache.size;
    const stickerCount = guild.stickers.cache.size;

    const color = guild.ownerId ? owner?.displayColor ?? COLORS.PRIMARY : COLORS.PRIMARY;
    const iconURL = guild.iconURL({ extension: 'png', size: 4096 });
    const bannerURL = guild.bannerURL({ extension: 'png', size: 4096 });

    await Response.custom(ctx, {
      color,
      title: guild.name,
      description: guild.description ? `*${guild.description}*` : null,
      thumbnail: iconURL ?? undefined,
      image: bannerURL ?? undefined,
      fields: [
        {
          name: 'General',
          value: [
            `**Server Name:** ${guild.name}`,
            `**Server ID:** \`${guild.id}\``,
            `**Owner:** ${owner.user.displayName}`,
            `**Created:** ${time(guild.createdAt, 'F')} (${time(guild.createdAt, 'R')})`,
          ].join('\n'),
        },
        {
          name: 'Members',
          value: [
            `**Total Members:** ${totalMembers}`,
            `**Humans:** ${humans}`,
            `**Bots:** ${bots}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Channels',
          value: [
            `**Text:** ${textChannels}`,
            `**Voice:** ${voiceChannels}`,
            `**Categories:** ${categories}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Server',
          value: [
            `**Role Count:** ${roleCount}`,
            `**Boost Tier:** ${boostTier}`,
            `**Boost Count:** ${boostCount}`,
            `**Emoji Count:** ${emojiCount}`,
            `**Sticker Count:** ${stickerCount}`,
          ].join('\n'),
        },
      ],
    });
  }
}
