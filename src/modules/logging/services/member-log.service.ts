import type { Client, GuildMember, PartialGuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { Events } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { MemberLogConfig } from '../../../core/config/types.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';

export class MemberLogService {
  constructor(
    private readonly client: Client,
    private readonly config: MemberLogConfig,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
    private readonly eventBus: IEventBus,
  ) {}

  register(): void {
    this.client.on(Events.GuildMemberUpdate, (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
      void this.handleMemberUpdate(oldMember as GuildMember, newMember);
    });
  }

  async handleMemberUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    if (!this.config.enabled) return;
    if (newMember.user.bot) return;

    const oldNick = oldMember.nickname ?? null;
    const newNick = newMember.nickname ?? null;

    if (oldNick === newNick) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Member log channelId not configured');
      return;
    }

    const guild = newMember.guild;
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Member log channel not found');
      return;
    }

    const embed = this.buildEmbed(newMember, oldNick, newNick);

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('member_log_total').increment();
      this.logger.info(
        { userId: newMember.id, guildId: guild.id, before: oldNick, after: newNick },
        'Nickname change log sent',
      );
      this.eventBus.emit('logging.member.nickname_updated', {
        guildId: guild.id,
        userId: newMember.id,
        before: oldNick,
        after: newNick,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send member log');
    }
  }

  private buildEmbed(member: GuildMember, oldNick: string | null, newNick: string | null): EmbedBuilder {
    return EmbedFactory.build({
      title: '\uD83C\uDFF7 Nickname Updated',
      color: COLORS.PRIMARY,
      fields: [
        {
          name: 'Member',
          value: `<@${member.id}>`,
          inline: true,
        },
        {
          name: 'User ID',
          value: `\`${member.id}\``,
          inline: true,
        },
        {
          name: 'Before',
          value: oldNick ?? '*None*',
          inline: true,
        },
        {
          name: 'After',
          value: newNick ?? '*None*',
          inline: true,
        },
        {
          name: 'Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: false,
        },
      ],
    });
  }
}
