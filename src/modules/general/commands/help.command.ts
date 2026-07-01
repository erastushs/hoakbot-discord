import { SlashCommandBuilder } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import type { CommandRegistry } from '../../../shared/command-registry.js';
import type { AppConfig } from '../../../core/config/types.js';
import { Response } from '../../../shared/responses/response.factory.js';

export class HelpCommand implements ICommand {
  readonly name = 'help';
  readonly description = 'Lists all available commands';
  readonly category = 'General';
  readonly slashOptions = new SlashCommandBuilder().setName('help').setDescription('Lists all available commands');

  constructor(
    private readonly registry: CommandRegistry,
    private readonly config: Readonly<AppConfig>,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const all = this.registry.all().filter((cmd) => !cmd.hidden);

    const grouped = new Map<string, ICommand[]>();
    for (const cmd of all) {
      const cat = this.capitalize(cmd.category);
      const list = grouped.get(cat) ?? [];
      list.push(cmd);
      grouped.set(cat, list);
    }

    const sortedCategories = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

    let totalCommands = 0;

    const fields: { name: string; value: string }[] = [];

    for (const cat of sortedCategories) {
      const cmds = grouped.get(cat)!;
      cmds.sort((a, b) => a.name.localeCompare(b.name));

      const lines = cmds.map((cmd) => {
        const permLabel = cmd.requiredPermissions && cmd.requiredPermissions.length > 0 ? ' (Moderator)' : '';
        return [
          `**\`/${cmd.name}\`**`,
          `**\`${this.config.bot.prefix}${cmd.name}\`**`,
          `${cmd.description}${permLabel}`,
        ].join('\n');
      });

      fields.push({ name: cat, value: lines.join('\n\n') });
      totalCommands += cmds.length;
    }

    await Response.custom(ctx, {
      title: '\u{1F4DA} Hoak Bot Help',
      description: `**Total Commands:** ${totalCommands}\n**Categories:** ${sortedCategories.length}`,
      fields,
      thumbnail: ctx.user.client.user?.displayAvatarURL(),
    });
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
