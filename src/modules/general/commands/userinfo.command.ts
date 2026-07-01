import { SlashCommandBuilder, time } from 'discord.js';
import type { GuildMember, User } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';

export class UserInfoCommand implements ICommand {
  readonly name = 'userinfo';
  readonly description = "Displays information about a user";
  readonly category = 'general';
  readonly slashOptions = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription("Displays information about a user")
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to get information about').setRequired(false),
    );
  readonly prefixAliases = ['ui'];

  async execute(ctx: CommandContext): Promise<void> {
    let target: User | null = (ctx.args.get('target') as User | undefined) ?? null;

    if (!target) {
      const userId = ctx.args.get('target_user_id') as string | undefined;
      if (userId) {
        try {
          target = await ctx.user.client.users.fetch(userId);
        } catch {
          ctx.logger.warn({ userId, command: this.name }, 'Target user not found');
          await ctx.reply('User not found.');
          return;
        }
      }
    }

    if (!target) {
      target = ctx.user;
    }

    let member: GuildMember | null = null;
    if (ctx.guild) {
      try {
        member = await ctx.guild.members.fetch(target.id);
      } catch {
        member = null;
      }
    }

    const isInGuild = ctx.guild !== null && member !== null;
    const color = member?.displayColor && member.displayColor !== 0
      ? member.displayColor
      : COLORS.PRIMARY;

    const avatarURL = target.displayAvatarURL({
      extension: 'png',
      size: 4096,
      forceStatic: false,
    });

    const embed = EmbedFactory.custom(ctx, { color })
      .setTitle(`${target.displayName}'s Information`)
      .setThumbnail(avatarURL)
      .addFields(
        {
          name: 'Identity',
          value: [
            `**Username:** ${target.username}`,
            target.globalName ? `**Global Name:** ${target.globalName}` : null,
            `**Display Name:** ${target.displayName}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
        {
          name: 'Account',
          value: [
            `**User ID:** \`${target.id}\``,
            `**Bot:** ${target.bot ? 'Yes' : 'No'}`,
            `**Created:** ${time(target.createdAt, 'F')} (${time(target.createdAt, 'R')})`,
          ].join('\n'),
          inline: false,
        },
      );

    if (isInGuild) {
      const totalRoles = member!.roles.cache.size - 1;
      const highestRole = member!.roles.highest;

      embed.addFields({
        name: 'Guild',
        value: [
          `**Joined:** ${time(member!.joinedAt!, 'F')} (${time(member!.joinedAt!, 'R')})`,
          `**Highest Role:** ${highestRole}`,
          `**Total Roles:** ${totalRoles}`,
        ].join('\n'),
      });
    }

    await ctx.reply({ embeds: [embed] });
  }
}
