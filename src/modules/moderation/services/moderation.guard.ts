import type { GuildMember, User } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import { Errors } from '../../../shared/errors/errors.js';

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
        await ctx.reply(Errors.memberNotFound());
        return null;
      }
    }

    await ctx.reply(Errors.userRequired());
    return null;
  }

  async resolveMember(target: User, ctx: CommandContext): Promise<GuildMember | null> {
    try {
      return await ctx.guild!.members.fetch(target.id);
    } catch {
      await ctx.reply(Errors.memberNotInGuild());
      return null;
    }
  }

  resolveReason(ctx: CommandContext): string {
    const fromSlash = ctx.args.get('reason');
    if (typeof fromSlash === 'string' && fromSlash.trim().length > 0) {
      return fromSlash.trim();
    }

    const suffix = ctx.args.get('_suffix') as string | undefined;
    if (!suffix) return Errors.noReasonProvided();

    const trimmed = suffix.trim();
    const mentionMatch = trimmed.match(/^<@!?(\d+)>/);
    if (!mentionMatch) return Errors.noReasonProvided();

    const afterMention = trimmed.slice(mentionMatch[0].length).trim();
    return afterMention.length > 0 ? afterMention : Errors.noReasonProvided();
  }

  validateCommon(member: GuildMember, ctx: CommandContext, action: string): string | null {
    if (member.id === ctx.user.id) {
      return Errors.selfAction(action);
    }

    if (member.id === ctx.user.client.user?.id) {
      return Errors.botSelf(action);
    }

    if (member.id === ctx.guild?.ownerId) {
      return Errors.serverOwner(action);
    }

    if (ctx.member) {
      const executorHighest = ctx.member.roles.highest.position;
      const targetHighest = member.roles.highest.position;
      if (executorHighest <= targetHighest) {
        return Errors.roleHierarchy(action);
      }
    }

    const botMember = ctx.guild?.members.me;
    if (botMember) {
      const botHighest = botMember.roles.highest.position;
      const targetHighest = member.roles.highest.position;
      if (botHighest <= targetHighest) {
        return Errors.botHierarchy(action);
      }
    }

    return null;
  }
}
