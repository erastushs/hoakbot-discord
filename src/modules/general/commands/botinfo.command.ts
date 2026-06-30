import { EmbedBuilder, SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import type { ICommand, CommandContext } from '../../../shared/types/command.js';
import type { AppConfig } from '../../../core/config/types.js';

const pkg = { name: 'hoakbot', version: '1.0.0' };

export class BotInfoCommand implements ICommand {
  readonly name = 'botinfo';
  readonly description = "Displays information about the bot";
  readonly category = 'general';
  readonly slashOptions = new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription("Displays information about the bot");
  readonly prefixAliases = ['bi'];

  constructor(private readonly config: Readonly<AppConfig>) {}

  async execute(ctx: CommandContext): Promise<void> {
    const client = ctx.user.client;
    const botUser = client.user;
    if (!botUser) {
      await ctx.reply('Bot user not available.');
      return;
    }

    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeFormatted = this.formatUptime(uptimeSeconds);
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

    const guildCount = client.guilds.cache.size;
    const cachedUsers = client.users.cache.size;
    const wsPing = client.ws.ping;

    const configuredStandby = this.config.bot.voice.standbyChannelId;
    let voiceStatus = 'Not configured';
    if (configuredStandby) {
      const connection = getVoiceConnection(this.config.guildId);
      voiceStatus = connection ? 'Connected' : 'Disconnected';
    }

    const developer = this.config.ownerIds.length > 0
      ? `<@${this.config.ownerIds[0]}>`
      : 'Not set';

    const loadedModules = [
      this.config.featureFlags.modules.general ? 'general' : null,
      this.config.featureFlags.modules.voice ? 'voice' : null,
      this.config.featureFlags.modules.moderation ? 'moderation' : null,
      this.config.featureFlags.modules.metrics ? 'metrics' : null,
    ]
      .filter(Boolean)
      .join(', ') || 'None';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(botUser.username)
      .setThumbnail(botUser.displayAvatarURL())
      .addFields(
        {
          name: 'General',
          value: [
            `**Bot Name:** ${botUser.username}`,
            `**Bot ID:** \`${botUser.id}\``,
            `**Version:** ${pkg.version}`,
            `**Developer:** ${developer}`,
          ].join('\n'),
        },
        {
          name: 'Runtime',
          value: [
            `**Node.js:** ${process.version}`,
            `**discord.js:** ${djsVersion}`,
            `**Uptime:** ${uptimeFormatted}`,
            `**WebSocket Ping:** ${wsPing}ms`,
            `**Memory:** ${rssMb} MB`,
          ].join('\n'),
        },
        {
          name: 'Discord',
          value: [
            `**Guilds:** ${guildCount}`,
            `**Cached Users:** ${cachedUsers}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Voice',
          value: [
            `**Standby:** ${voiceStatus}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Modules',
          value: loadedModules,
        },
      )
      .setFooter({ text: `Requested by ${ctx.user.displayName}`, iconURL: ctx.user.displayAvatarURL() });

    await ctx.reply({ embeds: [embed] });
  }

  private formatUptime(totalSeconds: number): string {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
  }
}
