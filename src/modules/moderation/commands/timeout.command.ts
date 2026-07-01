import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import { ModerationGuard } from '../services/moderation.guard.js';
import { parseDuration, formatDuration } from '../../../shared/utils/duration.js';
import { Response } from '../../../shared/responses/response.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { Errors } from '../../../shared/errors/errors.js';

export class TimeoutCommand implements ICommand {
  readonly name = 'timeout';
  readonly description = 'Timeouts a member in the server';
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.ModerateMembers];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeouts a member in the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to timeout').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Duration (e.g. 10m, 2h, 7d, max 28d)').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the timeout').setRequired(false),
    );
  readonly prefixAliases = ['to'];

  private readonly guard = new ModerationGuard();

  constructor(private readonly metrics: IMetrics) {}

  async execute(ctx: CommandContext): Promise<void> {
    const target = await this.guard.resolveTarget(ctx);
    if (!target) return;

    const member = await this.guard.resolveMember(target, ctx);
    if (!member) return;

    const error = this.guard.validateCommon(member, ctx, 'timeout');
    if (error) {
      await ctx.reply(error);
      return;
    }

    if (!member.moderatable) {
      await ctx.reply(Errors.cannotTimeout());
      return;
    }

    const durationResult = this.resolveDuration(ctx);
    if (durationResult.error) {
      await ctx.reply(durationResult.error);
      return;
    }

    const reason = this.guard.resolveReason(ctx);
    const ms = durationResult.ms;

    try {
      await member.timeout(ms, reason);

      this.metrics.counter('moderation_actions').increment();

      ctx.eventBus.emit('moderation.action', {
        guildId: ctx.guild!.id,
        moderatorId: ctx.user.id,
        targetId: target.id,
        action: 'timeout',
        reason: `${formatDuration(ms)} — ${reason}`,
      });

      ctx.logger.info(
        {
          command: this.name,
          guildId: ctx.guild!.id,
          moderatorId: ctx.user.id,
          targetId: target.id,
          durationMs: ms,
          reason,
        },
        'Timeout command executed',
      );

      await Response.custom(ctx, {
        color: COLORS.MODERATION.TIMEOUT,
        title: 'Member Timed Out',
        fields: [
          { name: 'User', value: `${target.displayName} (\`${target.id}\`)`, inline: false },
          { name: 'Duration', value: formatDuration(ms), inline: true },
          { name: 'Moderator', value: ctx.user.displayName, inline: true },
          { name: 'Reason', value: reason, inline: false },
        ],
      });
    } catch (err) {
      ctx.logger.error({ error: err, targetId: target.id }, 'Failed to timeout member');
      await ctx.reply(Errors.failedTimeout());
    }
  }

  private resolveDuration(ctx: CommandContext): { ms: number; error?: string } {
    const fromSlash = ctx.args.get('duration');
    if (typeof fromSlash === 'string') {
      return parseDuration(fromSlash);
    }

    const suffix = ctx.args.get('_suffix') as string | undefined;
    if (!suffix) return { ms: 0, error: Errors.durationRequired() };

    const trimmed = suffix.trim();
    const mentionMatch = trimmed.match(/^<@!?(\d+)>/);
    const afterMention = mentionMatch ? trimmed.slice(mentionMatch[0].length).trim() : trimmed;
    const token = afterMention.split(/\s+/)[0] ?? '';

    if (!token) return { ms: 0, error: Errors.durationRequired() };

    return parseDuration(token);
  }
}
