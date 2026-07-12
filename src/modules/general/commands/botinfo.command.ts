import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CommandContext } from '../../../shared/types/command.js';
import type { AppConfig } from '../../../core/config/types.js';
import { Errors } from '../../../shared/errors/errors.js';
import { BaseCommand } from '../../../shared/command/base-command.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', '..', '..', '..', 'package.json');
const pkgContent = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name: string; version: string };
const pkg = { name: pkgContent.name, version: pkgContent.version };

export class BotInfoCommand extends BaseCommand {
  readonly name = 'botinfo';
  readonly description = "Displays information about the bot";
  readonly category = 'general';
  readonly slashOptions = new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription("Displays information about the bot");
  readonly prefixAliases = ['bi'];

  constructor(private readonly config: Readonly<AppConfig>) {
    super();
  }

  async execute(ctx: CommandContext): Promise<void> {
    const client = ctx.user.client;
    const botUser = client.user;
    if (!botUser) {
      await ctx.reply(Errors.botNotAvailable());
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

    const moduleStatus = [
      ['General', this.config.featureFlags.modules.general],
      ['Voice', this.config.featureFlags.modules.voice],
      ['Moderation', this.config.featureFlags.modules.moderation],
      ['Metrics', this.config.featureFlags.modules.metrics],
    ]
      .map(([name, enabled]) => `${enabled ? '✅' : '❌'} ${name}`)
      .join('\n');

    await this.custom(ctx, {
      title: `🤖 ${botUser.username}`,
      description: `\`${botUser.id}\` • v${pkg.version}`,
      thumbnail: botUser.displayAvatarURL(),
      fields: [
        {
          name: '⚡ System',
          value: [`**Uptime**  ${uptimeFormatted}`, `**Memory**  ${rssMb} MB`, `**Ping**  ${wsPing} ms`].join('\n'),
          inline: true,
        },
        {
          name: '📦 Runtime',
          value: [`**Node.js**  ${process.version}`, `**discord.js**  v${djsVersion}`].join('\n'),
          inline: true,
        },
        {
          name: '🌐 Discord',
          value: [`**Servers**  ${guildCount}`, `**Users**  ${cachedUsers}`, `**Voice**  ${voiceStatus}`].join('\n'),
          inline: true,
        },
        {
          name: '🧩 Modules',
          value: moduleStatus,
          inline: true,
        },
        {
          name: '👨 Developer',
          value: developer,
          inline: true,
        },
      ],
    });
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
