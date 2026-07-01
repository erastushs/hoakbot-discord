import { PermissionFlagsBits, SlashCommandBuilder, type Message, type GuildTextBasedChannel } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import { Errors } from '../../../shared/errors/errors.js';

export class CleanCommand implements ICommand {
  readonly name = 'clean';
  readonly description = 'Deletes messages from the current channel (1-100)';
  readonly category = 'moderation';
  readonly guildOnly = true;
  readonly requiredPermissions = [PermissionFlagsBits.ManageMessages];
  readonly slashOptions = new SlashCommandBuilder()
    .setName('clean')
    .setDescription('Deletes messages from the current channel (1-100)')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    );
  readonly prefixAliases = ['cls'];

  async execute(ctx: CommandContext): Promise<void> {
    const amount = this.parseAmount(ctx);
    if (amount === null || amount < 1 || amount > 100) {
      await ctx.reply(Errors.invalidAmount());
      return;
    }

    const channel = ctx.channel;
    if (!channel) {
      await ctx.reply(Errors.channelNotAvailable());
      return;
    }

    try {
      const deletedMessages = await (channel as GuildTextBasedChannel).bulkDelete(amount, true);

      const msg = await ctx.reply({ content: Errors.cleanedMessages(deletedMessages.size) }) as Message;

      ctx.eventBus.emit('moderation.action', {
        guildId: ctx.guild!.id,
        moderatorId: ctx.user.id,
        targetId: '',
        action: 'clean',
        reason: `${amount} messages requested, ${deletedMessages.size} deleted`,
      });

      ctx.logger.info(
        {
          command: this.name,
          channelId: ctx.channel.id,
          requested: amount,
          deleted: deletedMessages.size,
          user: ctx.user.id,
        },
        'Clean command executed',
      );

      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 5000);
    } catch (err) {
      ctx.logger.error({ error: err, channelId: ctx.channel.id }, 'Failed to clean messages');
      await ctx.reply(Errors.failedClean());
    }
  }

  private parseAmount(ctx: CommandContext): number | null {
    const fromSlash = ctx.args.get('amount');
    if (typeof fromSlash === 'number') {
      return Math.round(fromSlash);
    }

    const suffix = ctx.args.get('_suffix') as string | undefined;
    if (!suffix) return null;

    const token = suffix.trim().split(/\s+/)[0];
    if (!token) return null;

    const parsed = parseInt(token, 10);
    if (isNaN(parsed)) return null;

    return parsed;
  }
}
