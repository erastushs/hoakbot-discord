import { SlashCommandBuilder } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import type { CommandRegistry } from '../../../shared/command-registry.js';

export class HelpCommand implements ICommand {
  readonly name = 'help';
  readonly description = 'Lists all available commands';
  readonly category = 'general';
  readonly slashOptions = new SlashCommandBuilder().setName('help').setDescription('Lists all available commands');

  constructor(private readonly registry: CommandRegistry) {}

  async execute(ctx: CommandContext): Promise<void> {
    const commands = this.registry.all();
    const lines = commands.map((cmd) => `**/${cmd.name}** — ${cmd.description}`);
    const message = `**Hoak Bot Commands**\n${lines.join('\n') || 'No commands registered'}`;
    await ctx.reply(message);
  }
}
