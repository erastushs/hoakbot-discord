import { SlashCommandBuilder } from 'discord.js';
import type { User } from 'discord.js';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';

export class AvatarCommand implements ICommand {
  readonly name = 'avatar';
  readonly description = "Displays a user's avatar";
  readonly category = 'general';
  readonly slashOptions = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Displays a user's avatar")
    .addUserOption((option) =>
      option.setName('target').setDescription('The user whose avatar to display').setRequired(false),
    );
  readonly prefixAliases = ['av'];

  async execute(ctx: CommandContext): Promise<void> {
    let target: User | null = (ctx.args.get('target') as User | undefined) ?? null;

    if (!target) {
      const userId = ctx.args.get('target_user_id') as string | undefined;
      if (userId) {
        try {
          target = await ctx.user.client.users.fetch(userId);
        } catch {
          ctx.logger.warn({ userId, command: this.name }, 'Target user not found');
          await ctx.reply('User not found.');
          return;
        }
      }
    }

    if (!target) {
      target = ctx.user;
    }

    const avatarURL = target.displayAvatarURL({
      extension: 'png',
      size: 4096,
      forceStatic: false,
    });

    const isAnimated = target.avatar?.startsWith('a_') ?? false;

    const embed = EmbedFactory.info(ctx)
      .setTitle(`${target.displayName}'s Avatar`)
      .addFields(
        { name: 'Resolution', value: '4096x4096', inline: true },
        { name: 'Animated', value: isAnimated ? 'Yes' : 'No', inline: true },
        { name: 'Direct Link', value: `[Open original](${avatarURL})`, inline: true },
      )
      .setImage(avatarURL);

    await ctx.reply({ embeds: [embed] });
  }
}
