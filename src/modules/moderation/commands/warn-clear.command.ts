import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import type { WarningService } from '../services/warning.service.js';
import { ModerationGuard } from '../services/moderation.guard.js';
import { Errors } from '../../../shared/errors/errors.js';
import { BaseCommand } from '../../../shared/command/base-command.js';

export class WarnClearCommand extends BaseCommand {
  readonly name = 'warn-clear';
  readonly description = 'Clears all warnings for a member';
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.ModerateMembers];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('warn-clear')
    .setDescription('Clears all warnings for a member')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to clear warnings for').setRequired(true),
    );
  readonly prefixAliases = ['wc'];

  private readonly guard = new ModerationGuard();

  constructor(private readonly warningService: WarningService) {
    super();
  }

  async execute(ctx: CommandContext): Promise<void> {
    const target = await this.guard.resolveTarget(ctx);
    if (!target) return;

    const deleted = await this.warningService.clear(ctx.guild!.id, target.id);

    if (deleted === 0) {
      await ctx.reply(Errors.noWarnings());
      return;
    }

    ctx.eventBus.emit('moderation.action', {
      guildId: ctx.guild!.id,
      moderatorId: ctx.user.id,
      targetId: target.id,
      action: 'warn_clear',
      reason: `${deleted} warnings cleared`,
    });

    await ctx.reply(Errors.warningsCleared(deleted, target.displayName));
  }
}
