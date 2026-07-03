import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import { ModerationGuard } from '../services/moderation.guard.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { Errors } from '../../../shared/errors/errors.js';
import { BaseCommand } from '../../../shared/command/base-command.js';

export class BanCommand extends BaseCommand {
  readonly name = 'ban';
  readonly description = 'Bans a member from the server';
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.BanMembers];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to ban').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(false),
    );
  readonly prefixAliases = ['b'];

  private readonly guard = new ModerationGuard();

  constructor(private readonly metrics: IMetrics) {
    super();
  }

  async execute(ctx: CommandContext): Promise<void> {
    const target = await this.guard.resolveTarget(ctx);
    if (!target) return;

    const member = await this.guard.resolveMember(target, ctx);
    if (!member) return;

    const error = this.guard.validateCommon(member, ctx, 'ban');
    if (error) {
      await ctx.reply(error);
      return;
    }

    if (!member.bannable) {
      await ctx.reply(Errors.cannotBan());
      return;
    }

    const reason = this.guard.resolveReason(ctx);

    try {
      await member.ban({ reason });

      this.metrics.counter('moderation_action_total').increment();

      ctx.eventBus.emit('moderation.action', {
        guildId: ctx.guild!.id,
        moderatorId: ctx.user.id,
        targetId: target.id,
        action: 'ban',
        reason,
      });

      ctx.logger.info(
        { command: this.name, guildId: ctx.guild!.id, moderatorId: ctx.user.id, targetId: target.id, reason },
        'Ban command executed',
      );

      await this.custom(ctx, {
        color: COLORS.MODERATION.BAN,
        title: 'Member Banned',
        fields: [
          { name: 'User', value: `${target.displayName} (\`${target.id}\`)`, inline: false },
          { name: 'Moderator', value: ctx.user.displayName, inline: true },
          { name: 'Reason', value: reason, inline: true },
        ],
      });
    } catch (err) {
      ctx.logger.error({ error: err, targetId: target.id }, 'Failed to ban member');
      await ctx.reply(Errors.failedBan());
    }
  }
}
