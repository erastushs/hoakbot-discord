import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import { ModerationGuard } from '../services/moderation.guard.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { Errors } from '../../../shared/errors/errors.js';

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

  private readonly guard = new ModerationGuard();

  constructor(private readonly metrics: IMetrics) {}

  async execute(ctx: CommandContext): Promise<void> {
    const target = await this.guard.resolveTarget(ctx);
    if (!target) return;

    const member = await this.guard.resolveMember(target, ctx);
    if (!member) return;

    const error = this.guard.validateCommon(member, ctx, 'kick');
    if (error) {
      await ctx.reply(error);
      return;
    }

    if (!member.kickable) {
      await ctx.reply(Errors.cannotKick());
      return;
    }

    const reason = this.guard.resolveReason(ctx);

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
        { command: this.name, guildId: ctx.guild!.id, moderatorId: ctx.user.id, targetId: target.id, reason },
        'Kick command executed',
      );

      const embed = EmbedFactory.custom(ctx, { color: COLORS.MODERATION.KICK, title: 'Member Kicked' })
        .addFields(
          { name: 'User', value: `${target.displayName} (\`${target.id}\`)`, inline: false },
          { name: 'Moderator', value: ctx.user.displayName, inline: true },
          { name: 'Reason', value: reason, inline: true },
        );

      await ctx.reply({ embeds: [embed] });
    } catch (err) {
      ctx.logger.error({ error: err, targetId: target.id }, 'Failed to kick member');
      await ctx.reply(Errors.failedKick());
    }
  }
}
