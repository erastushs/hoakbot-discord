import { PermissionFlagsBits, SlashCommandBuilder, time } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import type { WarningService } from '../services/warning.service.js';
import { ModerationGuard } from '../services/moderation.guard.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { Errors } from '../../../shared/errors/errors.js';
import { BaseCommand } from '../../../shared/command/base-command.js';

export class WarningsCommand extends BaseCommand {
  readonly name = 'warnings';
  readonly description = "Lists a member's warning history";
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.ModerateMembers];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("Lists a member's warning history")
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to check').setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of warnings to show (max 25)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false),
    );
  readonly prefixAliases = ['ws'];

  private readonly guard = new ModerationGuard();

  constructor(private readonly warningService: WarningService) {
    super();
  }

  async execute(ctx: CommandContext): Promise<void> {
    const target = await this.guard.resolveTarget(ctx);
    if (!target) return;

    const limit = this.resolveLimit(ctx);

    const [warnings, totalCount] = await Promise.all([
      this.warningService.history(ctx.guild!.id, target.id, limit),
      this.warningService.count(ctx.guild!.id, target.id),
    ]);

    await this.custom(ctx, {
      color: COLORS.MODERATION.WARN,
      title: '\u{1F7E8} Warning History',
      fields: [
        { name: 'User', value: `${target.displayName} (\`${target.id}\`)`, inline: false },
        { name: 'Total Warnings', value: `${totalCount}`, inline: true },
      ],
      build: (embed) => {
        if (warnings.length === 0) {
          embed.setDescription(Errors.noWarnings());
        } else {
          const entries = warnings.map((w) => {
            const shortId = w.id.substring(0, 8);
            const modMention = `<@${w.moderator_id}>`;
            const ts = time(new Date(w.created_at), 'F');
            const rel = time(new Date(w.created_at), 'R');
            return `\`${shortId}\` — **Moderator:** ${modMention}\n**Reason:** ${w.reason}\n**When:** ${ts} (${rel})`;
          });

          embed.addFields({
            name: 'Warnings',
            value: entries.join('\n\n'),
          });
        }
        return embed;
      },
    });
  }

  private resolveLimit(ctx: CommandContext): number {
    const fromSlash = ctx.args.get('limit');
    if (typeof fromSlash === 'number') {
      return Math.max(1, Math.min(25, Math.round(fromSlash)));
    }

    const suffix = ctx.args.get('_suffix') as string | undefined;
    if (!suffix) return 10;

    const trimmed = suffix.trim();
    const mentionMatch = trimmed.match(/^<@!?(\d+)>/);
    const afterMention = mentionMatch ? trimmed.slice(mentionMatch[0].length).trim() : '';

    const token = afterMention.split(/\s+/)[0];
    if (!token) return 10;

    const parsed = parseInt(token, 10);
    if (isNaN(parsed) || parsed < 1) return 10;

    return Math.min(25, parsed);
  }
}
