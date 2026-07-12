import { SlashCommandBuilder, time } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { Errors } from '../../../shared/errors/errors.js';
import { BaseCommand } from '../../../shared/command/base-command.js';

export class ServerInfoCommand extends BaseCommand {
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
    let owner;
    try {
      owner = await guild.fetchOwner();
      await guild.members.fetch();
    } catch (error) {
      ctx.logger.warn({ error, command: this.name }, 'Failed to fetch server information');
      await ctx.reply('Server information is currently unavailable.');
      return;
    }

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

    await this.custom(ctx, {
      color,
      title: `🏠 ${guild.name}`,
      description: guild.description ? `${guild.description}\n\`${guild.id}\`` : `\`${guild.id}\``,
      thumbnail: iconURL ?? undefined,
      image: bannerURL ?? undefined,
      fields: [
        {
          name: '👑 Server',
          value: [`**Owner**  ${owner.user.displayName}`, `**Created**  ${time(guild.createdAt, 'R')}`, `**Roles**  ${roleCount}`].join('\n'),
          inline: true,
        },
        {
          name: '👥 Members',
          value: [`**Total**  ${totalMembers}`, `**Humans**  ${humans}`, `**Bots**  ${bots}`].join('\n'),
          inline: true,
        },
        {
          name: '💬 Channels',
          value: [`**Text**  ${textChannels}`, `**Voice**  ${voiceChannels}`, `**Categories**  ${categories}`].join('\n'),
          inline: true,
        },
        {
          name: '✨ Community',
          value: [`**Boosts**  ${boostCount} • Tier ${boostTier}`, `**Emojis**  ${emojiCount}`, `**Stickers**  ${stickerCount}`].join('\n'),
          inline: true,
        },
      ],
    });
  }
}
