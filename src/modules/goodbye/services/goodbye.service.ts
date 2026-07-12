import type { Client, TextChannel, GuildMember, PartialGuildMember } from 'discord.js';
import { Events } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { GoodbyeConfig } from '../../../core/config/types.js';
import type { ConfigurationService } from '../../../core/config/configuration.service.js';
import { MemberCardBuilder } from '../../../shared/builders/member-card.builder.js';
import type { TemplateService } from '../../../shared/template/template.service.js';
import type { TemplateContext } from '../../../shared/template/template.service.js';
import type { ImageService } from '../../../shared/image/image.service.js';
import { serializeError } from '../../../shared/utils/error.js';

const GOODBYE_SETTING_KEYS = [
  'goodbye.enabled',
  'goodbye.channelId',
  'goodbye.image.backgroundUrl',
  'goodbye.image.title',
  'goodbye.image.subtitle',
] as const;

export class GoodbyeService {
  private active = false;
  private readonly listener = (member: GuildMember | PartialGuildMember): void => {
    void this.handleMemberLeave(member);
  };

  constructor(
    private readonly client: Client,
    private readonly config: ConfigurationService,
    private readonly imageService: ImageService,
    private readonly templateService: TemplateService,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
  ) {}

  register(): void {
    if (this.active) return;
    this.active = true;
    this.client.on(Events.GuildMemberRemove, this.listener);
  }

  dispose(): void {
    if (!this.active) return;
    this.active = false;
    this.client.off(Events.GuildMemberRemove, this.listener);
  }

  async handleMemberLeave(member: GuildMember | PartialGuildMember): Promise<void> {
    if (!this.active) return;
    const guild = member.guild;
    const config = await this.loadConfig(guild.id);

    if (!this.active || !config.enabled) return;
    if (member.user.bot) return;

    const channelId = config.channelId;
    if (!channelId) {
      this.logger.warn('Goodbye channelId not configured');
      return;
    }

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

      const imageTitle = this.templateService.render(config.image.title, context);
      const imageSubtitle = this.templateService.render(config.image.subtitle, context);

      const imageBuffer = await builder.build({
        username: member.displayName,
        avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
        backgroundUrl: config.image.backgroundUrl,
        title: imageTitle,
        subtitle: imageSubtitle,
      });

      await channel.send({
        files: [{ attachment: imageBuffer, name: 'goodbye.png' }],
      });

      this.metrics.counter('goodbye_total').increment();
      this.logger.info({ userId: member.id, guildId: guild.id }, 'Goodbye message sent');
    } catch (err) {
      this.logger.error(
        { error: serializeError(err), userId: member.id, guildId: guild.id, channelId },
        'Failed to send goodbye message',
      );
      this.metrics.counter('goodbye_error_total').increment();
    }
  }

  private async loadConfig(guildId: string): Promise<GoodbyeConfig> {
    const values = await this.config.getMany<unknown>([...GOODBYE_SETTING_KEYS], guildId);

    return {
      enabled: values['goodbye.enabled'] as GoodbyeConfig['enabled'],
      channelId: values['goodbye.channelId'] as GoodbyeConfig['channelId'],
      image: {
        backgroundUrl: values['goodbye.image.backgroundUrl'] as GoodbyeConfig['image']['backgroundUrl'],
        title: values['goodbye.image.title'] as GoodbyeConfig['image']['title'],
        subtitle: values['goodbye.image.subtitle'] as GoodbyeConfig['image']['subtitle'],
      },
    };
  }
}
