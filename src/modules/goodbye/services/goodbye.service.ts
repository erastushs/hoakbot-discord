import type { Client, TextChannel, GuildMember, PartialGuildMember } from 'discord.js';
import { Events } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { GoodbyeConfig } from '../../../core/config/types.js';
import { MemberCardBuilder } from '../../../shared/builders/member-card.builder.js';
import type { TemplateService } from '../../../shared/template/template.service.js';
import type { TemplateContext } from '../../../shared/template/template.service.js';
import type { ImageService } from '../../../shared/image/image.service.js';

export class GoodbyeService {
  constructor(
    private readonly client: Client,
    private readonly config: GoodbyeConfig,
    private readonly imageService: ImageService,
    private readonly templateService: TemplateService,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
  ) {}

  register(): void {
    this.client.on(Events.GuildMemberRemove, (member: GuildMember | PartialGuildMember) => {
      void this.handleMemberLeave(member as GuildMember);
    });
  }

  async handleMemberLeave(member: GuildMember): Promise<void> {
    if (!this.config.enabled) return;
    if (member.user.bot) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Goodbye channelId not configured');
      return;
    }

    const guild = member.guild;
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Goodbye channel not found');
      return;
    }

    const context: TemplateContext = {
      user: `<@${member.id}>`,
      mention: `<@${member.id}>`,
      username: member.user.username,
      display_name: member.displayName,
      server: guild.name,
      membercount: guild.memberCount,
    };

    try {
      const builder = new MemberCardBuilder(this.imageService);

      const imageTitle = this.templateService.render(this.config.image.title, context);
      const imageSubtitle = this.templateService.render(this.config.image.subtitle, context);

      const imageBuffer = await builder.build({
        username: member.displayName,
        avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
        backgroundUrl: this.config.image.backgroundUrl,
        title: imageTitle,
        subtitle: imageSubtitle,
      });

      await channel.send({
        files: [{ attachment: imageBuffer, name: 'goodbye.png' }],
      });

      this.metrics.counter('goodbye_total').increment();
      this.logger.info({ userId: member.id, guildId: guild.id }, 'Goodbye message sent');
    } catch (err) {
      this.logger.error({ error: err, userId: member.id }, 'Failed to send goodbye message');
      this.metrics.counter('goodbye_error_total').increment();
    }
  }
}
