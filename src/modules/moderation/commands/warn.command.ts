import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import type { WarningService } from '../services/warning.service.js';
import { ModerationGuard } from '../services/moderation.guard.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { Errors } from '../../../shared/errors/errors.js';
import { BaseCommand } from '../../../shared/command/base-command.js';

export class WarnCommand extends BaseCommand {
  readonly name = 'warn';
  readonly description = 'Warns a member in the server';
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.ModerateMembers];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warns a member in the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to warn').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the warning').setRequired(true),
    );
  readonly prefixAliases = ['w'];

  private readonly guard = new ModerationGuard();

  constructor(private readonly warningService: WarningService) {
    super();
  }

  async execute(ctx: CommandContext): Promise<void> {
    const target = await this.guard.resolveTarget(ctx);
    if (!target) return;

    const member = await this.guard.resolveMember(target, ctx);
    if (!member) return;

    const error = this.guard.validateCommon(member, ctx, 'warn');
    if (error) {
      await ctx.reply(error);
      return;
    }

    const reason = this.guard.resolveReason(ctx);
    if (reason === Errors.noReasonProvided()) {
      await ctx.reply(Errors.reasonRequired());
      return;
    }

    try {
      await this.warningService.warn({
        guildId: ctx.guild!.id,
        userId: target.id,
        moderatorId: ctx.user.id,
        reason,
      });

      const totalWarnings = await this.warningService.count(ctx.guild!.id, target.id);

      await this.custom(ctx, {
        color: COLORS.MODERATION.WARN,
        title: '\u{1F7E8} Member Warned',
        fields: [
          { name: 'User', value: `${target.displayName} (\`${target.id}\`)`, inline: false },
          { name: 'Moderator', value: ctx.user.displayName, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Total Warnings', value: `${totalWarnings}`, inline: true },
        ],
      });
    } catch (err) {
      ctx.logger.error({ error: err, targetId: target.id }, 'Failed to warn member');
      await ctx.reply(Errors.failedWarn());
    }
  }
}
