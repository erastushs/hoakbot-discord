import type { GuildMember, User } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';

export class ModerationGuard {
  async resolveTarget(ctx: CommandContext): Promise<User | null> {
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

    await ctx.reply('Please specify a user.');
    return null;
  }

  async resolveMember(target: User, ctx: CommandContext): Promise<GuildMember | null> {
    try {
      return await ctx.guild!.members.fetch(target.id);
    } catch {
      await ctx.reply('That user is not a member of this server.');
      return null;
    }
  }

  resolveReason(ctx: CommandContext): string {
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

  validateCommon(member: GuildMember, ctx: CommandContext, action: string): string | null {
    if (member.id === ctx.user.id) {
      return `You cannot ${action} yourself.`;
    }

    if (member.id === ctx.user.client.user?.id) {
      return `I cannot ${action} myself.`;
    }

    if (member.id === ctx.guild?.ownerId) {
      return `You cannot ${action} the server owner.`;
    }

    if (ctx.member) {
      const executorHighest = ctx.member.roles.highest.position;
      const targetHighest = member.roles.highest.position;
      if (executorHighest <= targetHighest) {
        return `You cannot ${action} this member due to role hierarchy.`;
      }
    }

    const botMember = ctx.guild?.members.me;
    if (botMember) {
      const botHighest = botMember.roles.highest.position;
      const targetHighest = member.roles.highest.position;
      if (botHighest <= targetHighest) {
        return `I cannot ${action} this member due to role hierarchy.`;
      }
    }

    return null;
  }
}
