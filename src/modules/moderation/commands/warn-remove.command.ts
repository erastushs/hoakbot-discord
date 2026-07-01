import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import type { WarningService } from '../services/warning.service.js';
import { Errors } from '../../../shared/errors/errors.js';
import { BaseCommand } from '../../../shared/command/base-command.js';

export class WarnRemoveCommand extends BaseCommand {
  readonly name = 'warn-remove';
  readonly description = 'Removes a warning by ID';
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.ModerateMembers];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('warn-remove')
    .setDescription('Removes a warning by ID')
    .addStringOption((option) =>
      option.setName('warning-id').setDescription('The warning ID to remove').setRequired(true),
    );
  readonly prefixAliases = ['wr'];

  constructor(private readonly warningService: WarningService) {
    super();
  }

  async execute(ctx: CommandContext): Promise<void> {
    const warningId = this.resolveId(ctx);
    if (!warningId) {
      await ctx.reply(Errors.warningIdRequired());
      return;
    }

    const deleted = await this.warningService.remove(warningId);

    if (!deleted) {
      await ctx.reply(Errors.warningNotFound());
      return;
    }

    ctx.eventBus.emit('moderation.action', {
      guildId: ctx.guild!.id,
      moderatorId: ctx.user.id,
      targetId: '',
      action: 'warn_remove',
      reason: warningId,
    });

    await ctx.reply(Errors.warningRemoved());
  }

  private resolveId(ctx: CommandContext): string | null {
    const fromSlash = ctx.args.get('warning-id');
    if (typeof fromSlash === 'string' && fromSlash.trim().length > 0) {
      return fromSlash.trim();
    }

    const suffix = ctx.args.get('_suffix') as string | undefined;
    if (!suffix) return null;

    const token = suffix.trim().split(/\s+/)[0];
    return token || null;
  }
}
