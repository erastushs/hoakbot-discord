import type { Client, TextChannel, GuildMember } from 'discord.js';
import { Events } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { WelcomeConfig } from '../../../core/config/types.js';
import { WelcomeImageBuilder } from '../builders/welcome-image.builder.js';
import type { ImageService } from '../../../shared/image/image.service.js';

export class WelcomeService {
  constructor(
    private readonly client: Client,
    private readonly config: WelcomeConfig,
    private readonly imageService: ImageService,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
  ) {}

  register(): void {
    this.client.on(Events.GuildMemberAdd, (member: GuildMember) => {
      void this.handleMemberJoin(member);
    });
  }

  async handleMemberJoin(member: GuildMember): Promise<void> {
    if (!this.config.enabled) return;
    if (member.user.bot) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Welcome channelId not configured');
      return;
    }

    const guild = member.guild;
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Welcome channel not found');
      return;
    }

    const memberCount = guild.memberCount;

    try {
      const builder = new WelcomeImageBuilder(this.imageService);

      const imageBuffer = await builder.build({
        username: member.displayName,
        avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
        backgroundUrl: this.config.backgroundUrl,
        guildName: guild.name,
        memberCount,
        title: this.config.title,
        subtitle: this.config.subtitle,
      });

      await channel.send({
        content: `Welcome ${member}!`,
        files: [{ attachment: imageBuffer, name: 'welcome.png' }],
      });

      this.metrics.counter('welcome_total').increment();
      this.logger.info({ userId: member.id, guildId: guild.id }, 'Welcome message sent');
    } catch (err) {
      this.logger.error({ error: err, userId: member.id }, 'Failed to send welcome message');
      this.metrics.counter('welcome_error_total').increment();
    }
  }
}
