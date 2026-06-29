import { SlashCommandBuilder } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';

export class PingCommand implements ICommand {
  readonly name = 'ping';
  readonly description = 'Replies with the bot latency';
  readonly category = 'general';
  readonly slashOptions = new SlashCommandBuilder().setName('ping').setDescription('Replies with the bot latency');
  readonly prefixAliases = ['p'];

  async execute(ctx: CommandContext): Promise<void> {
    const latency = Date.now() - ctx.createdAt.getTime();
    await ctx.reply(`Pong! \`${latency}ms\``);
  }
}
