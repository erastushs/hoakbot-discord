import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { GuildMember, User } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import type { IMetrics } from '../../../core/metrics/types.js';

export class KickCommand implements ICommand {
  readonly name = 'kick';
  readonly description = 'Kicks a member from the server';
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.KickMembers];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to kick').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the kick').setRequired(false),
    );
  readonly prefixAliases = ['k'];

  constructor(private readonly metrics: IMetrics) {}

  async execute(ctx: CommandContext): Promise<void> {
    const target = await this.resolveTarget(ctx);
    if (!target) {
      return;
    }

    const member = await this.resolveMember(target, ctx);
    if (!member) {
      return;
    }

    const validationError = this.validate(member, ctx);
    if (validationError) {
      await ctx.reply(validationError);
      return;
    }

    const reason = this.resolveReason(ctx);

    try {
      await member.kick(reason);

      this.metrics.counter('moderation_actions').increment();

      ctx.eventBus.emit('moderation.action', {
        guildId: ctx.guild!.id,
        moderatorId: ctx.user.id,
        targetId: target.id,
        action: 'kick',
        reason,
      });

      ctx.logger.info(
        {
          command: this.name,
          guildId: ctx.guild!.id,
          moderatorId: ctx.user.id,
          targetId: target.id,
          reason,
        },
        'Kick command executed',
      );

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('Member Kicked')
        .addFields(
          { name: 'User', value: `${target.displayName} (\`${target.id}\`)`, inline: false },
          { name: 'Moderator', value: ctx.user.displayName, inline: true },
          { name: 'Reason', value: reason, inline: true },
        );

      await ctx.reply({ embeds: [embed] });
    } catch (err) {
      ctx.logger.error({ error: err, targetId: target.id }, 'Failed to kick member');
      await ctx.reply('Failed to kick the member. Check my permissions and role hierarchy.');
    }
  }

  private async resolveTarget(ctx: CommandContext): Promise<User | null> {
    const direct = ctx.args.get('user') as User | undefined;
    if (direct) return direct;

    const byId = ctx.args.get('target') as User | undefined;
    if (byId) return byId;

    const userId = ctx.args.get('target_user_id') as string | undefined;
    if (userId) {
      try {
        return await ctx.user.client.users.fetch(userId);
      } catch {
        await ctx.reply('User not found.');
        return null;
      }
    }

    await ctx.reply('Please specify a user to kick.');
    return null;
  }

  private async resolveMember(target: User, ctx: CommandContext): Promise<GuildMember | null> {
    try {
      return await ctx.guild!.members.fetch(target.id);
    } catch {
      await ctx.reply('That user is not a member of this server.');
      return null;
    }
  }

  private validate(member: GuildMember, ctx: CommandContext): string | null {
    if (member.id === ctx.user.id) {
      return 'You cannot kick yourself.';
    }

    if (member.id === ctx.user.client.user?.id) {
      return 'I cannot kick myself.';
    }

    if (member.id === ctx.guild?.ownerId) {
      return 'You cannot kick the server owner.';
    }

    if (ctx.member) {
      const executorHighest = ctx.member.roles.highest.position;
      const targetHighest = member.roles.highest.position;
      if (executorHighest <= targetHighest) {
        return 'You cannot kick this member due to role hierarchy.';
      }
    }

    const botMember = ctx.guild?.members.me;
    if (botMember) {
      const botHighest = botMember.roles.highest.position;
      const targetHighest = member.roles.highest.position;
      if (botHighest <= targetHighest) {
        return 'I cannot kick this member due to role hierarchy.';
      }
    }

    if (!member.kickable) {
      return 'I cannot kick this member.';
    }

    return null;
  }

  private resolveReason(ctx: CommandContext): string {
    const fromSlash = ctx.args.get('reason');
    if (typeof fromSlash === 'string' && fromSlash.trim().length > 0) {
      return fromSlash.trim();
    }

    const suffix = ctx.args.get('_suffix') as string | undefined;
    if (!suffix) return 'No reason provided.';

    const trimmed = suffix.trim();
    const mentionMatch = trimmed.match(/^<@!?(\d+)>/);
    if (!mentionMatch) return 'No reason provided.';

    const afterMention = trimmed.slice(mentionMatch[0].length).trim();
    return afterMention.length > 0 ? afterMention : 'No reason provided.';
  }
}
