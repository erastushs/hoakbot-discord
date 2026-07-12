import { SlashCommandBuilder } from 'discord.js';
import type { CommandContext } from '../../../shared/types/command.js';
import { BaseCommand } from '../../../shared/command/base-command.js';
import type { HelpService } from '../help/help-service.js';

export class HelpCommand extends BaseCommand {
  readonly name = 'help';
  readonly description = 'Lists all available commands';
  readonly category = 'General';
  readonly slashOptions = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all available commands')
    .addStringOption((option) =>
      option.setName('command').setDescription('Show help for a specific command').setRequired(false),
    );

  constructor(private readonly service: HelpService) {
    super();
  }

  async execute(ctx: CommandContext): Promise<void> {
    const query = ctx.source === 'slash' ? ctx.args.get('command') : ctx.args.get('_suffix');
    await this.service.show(ctx, typeof query === 'string' ? query.trim() || undefined : undefined);
  }
}
