import type { Client, TextChannel } from 'discord.js';
import type { ShrineConfig } from '../../../core/config/types.js';
import type { ConfigurationService } from '../../../core/config/configuration.service.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { serializeError } from '../../../shared/utils/error.js';
import { ShrineCardRenderer } from '../canvas/ShrineCardRenderer.js';
import type { ShrineRotation, ShrineUsageTier } from '../types.js';
import type { ShrineClient } from './shrine.client.js';

const SHRINE_SETTING_KEYS = [
  'shrine.enabled',
  'shrine.guildId',
  'shrine.channelId',
  'shrine.nightLightBaseUrl',
  'shrine.imageCdnUrl',
  'shrine.portraitFolder',
  'shrine.perkFolder',
  'shrine.iridescentShardIcon',
  'shrine.polling.pollIntervalMs',
  'shrine.polling.preResetWindowMs',
  'shrine.polling.delayedUpdateWindowMs',
  'shrine.polling.fallbackRetryMs',
  'shrine.dev.forceAnnouncementOnStartup',
] as const;

const tierRank: Record<ShrineUsageTier, number> = {
  veryhigh: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

export class ShrineService {
  private currentRotation: ShrineRotation | null = null;
  private announcedWeek: number | null = null;

  constructor(
    private readonly client: Client,
    private readonly config: ConfigurationService,
    private readonly shrineClient: ShrineClient,
    private readonly cardRenderer: ShrineCardRenderer,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
    private readonly eventBus: IEventBus,
  ) {}

  nextResetTime(): Date | null {
    return this.currentRotation?.end ?? null;
  }

  async pollAndAnnounce(signal?: AbortSignal): Promise<ShrineRotation | null> {
    const shrineConfig = await this.loadConfig();
    const guildId = this.resolveGuildId(shrineConfig);

    if (!shrineConfig.enabled) {
      this.logger.debug('Shrine announcements disabled');
      return this.currentRotation;
    }

    this.metrics.counter('shrine_poll_total').increment();

    try {
      const latest = await this.shrineClient.fetchShrine(signal);
      if (signal?.aborted) return this.currentRotation;
      const previousRotation = this.currentRotation;

      if (!previousRotation) {
        this.currentRotation = latest;
        this.announcedWeek = latest.week;
        if (shrineConfig.dev.forceAnnouncementOnStartup) {
          this.logger.info('[Shrine] Development mode enabled. Forcing Shrine announcement on startup.');
          this.logger.info({ week: latest.week }, '[Shrine] Sending Shrine announcement...');
          const announced = await this.announce(guildId, shrineConfig, latest, signal);
          if (announced) {
            this.announcedWeek = latest.week;
            this.logger.info({ week: latest.week }, '[Shrine] Announcement delivered. Week ' + latest.week + ' marked as announced.');
          } else {
            this.logger.warn({ week: latest.week, announcedWeek: this.announcedWeek }, '[Shrine] Announcement failed. Week ' + latest.week + ' remains pending.');
          }
          return latest;
        }

        this.logger.info(
          { week: latest.week, resetAt: latest.end.toISOString() },
          '[Shrine] Startup synchronization completed. Current week: ' + latest.week + '. Announcement skipped.',
        );
        return latest;
      }

      if (latest.week === previousRotation.week && this.announcedWeek === latest.week) {
        this.logger.debug({ week: latest.week }, 'Shrine rotation unchanged');
        return latest;
      }

      if (latest.week === previousRotation.week) {
        this.currentRotation = latest;
        this.logger.info({ week: latest.week }, '[Shrine] Sending Shrine announcement...');
        const announced = await this.announce(guildId, shrineConfig, latest, signal);
        if (announced) {
          this.announcedWeek = latest.week;
          this.logger.info({ week: latest.week }, '[Shrine] Announcement delivered. Week ' + latest.week + ' marked as announced.');
        } else {
          this.logger.warn({ week: latest.week, announcedWeek: this.announcedWeek }, '[Shrine] Announcement failed. Week ' + latest.week + ' remains pending.');
        }

        return latest;
      }

      this.currentRotation = latest;
      this.logger.info({ previousWeek: previousRotation.week, week: latest.week }, '[Shrine] Week changed: ' + previousRotation.week + ' → ' + latest.week);
      this.metrics.counter('shrine_rotation_detected_total').increment();

      this.logger.info({ week: latest.week }, '[Shrine] Sending Shrine announcement...');
      const announced = await this.announce(guildId, shrineConfig, latest, signal);
      if (announced) {
        this.announcedWeek = latest.week;
        this.logger.info({ week: latest.week }, '[Shrine] Announcement delivered. Week ' + latest.week + ' marked as announced.');
      } else {
        this.logger.warn({ week: latest.week, announcedWeek: this.announcedWeek }, '[Shrine] Announcement failed. Week ' + latest.week + ' remains pending.');
      }

      return latest;
    } catch (error) {
      this.metrics.counter('shrine_poll_error_total').increment();
      this.logger.error({ error: serializeError(error), guildId }, 'Shrine polling failed');
      this.eventBus.emit('shrine.poll_failed', { guildId, error });
      throw error;
    }
  }

  async announce(guildId: string, config: ShrineConfig, rotation: ShrineRotation, signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted) return false;
    if (!config.channelId) {
      this.logger.warn({ guildId, week: rotation.week }, 'Shrine channelId not configured');
      return false;
    }

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      this.logger.warn({ guildId, week: rotation.week }, 'Guild not found for Shrine announcement');
      return false;
    }

    const channel = guild.channels.cache.get(config.channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ guildId, channelId: config.channelId, week: rotation.week }, 'Shrine announcement channel not found');
      return false;
    }

    try {
      let embed = this.buildEmbed(rotation);
      let files: Array<{ attachment: Buffer; name: string }> = [];
      try {
        const card = await this.cardRenderer.render(rotation, {
          imageCdnUrl: config.imageCdnUrl,
          portraitFolder: config.portraitFolder,
          perkFolder: config.perkFolder,
          iridescentShardIcon: config.iridescentShardIcon,
        });
        files = [{ attachment: card, name: ShrineCardRenderer.fileName }];
      } catch (error) {
        this.logger.warn(
          { error: serializeError(error), guildId, channelId: config.channelId, week: rotation.week },
          'Failed to render Shrine artwork, sending fallback announcement',
        );
        embed = this.buildEmbed(rotation, false);
      }
      if (signal?.aborted) return false;
      await channel.send({ embeds: [embed], files });
      if (signal?.aborted) return false;
      this.metrics.counter('shrine_announcement_sent_total').increment();
      this.logger.info({ guildId, channelId: config.channelId, week: rotation.week }, 'Shrine announcement sent');
      this.eventBus.emit('shrine.updated', { guildId, channelId: config.channelId, rotation });
      return true;
    } catch (error) {
      this.metrics.counter('shrine_announcement_error_total').increment();
      this.logger.error(
        { error: serializeError(error), guildId, channelId: config.channelId, week: rotation.week },
        'Failed to send Shrine announcement',
      );
      return false;
    }
  }

  buildEmbed(rotation: ShrineRotation, includeArtwork = true) {
    const highestUsagePerk = [...rotation.perks].sort((a, b) => tierRank[b.usageTier] - tierRank[a.usageTier])[0];
    const resetDate = this.parseApiEndAsUtc(rotation.end);
    const resetTimestamp = Math.floor(resetDate.getTime() / 1000);
    const discordTimestamp = `<t:${resetTimestamp}:R>`;
    this.logger.debug(
      {
        apiEnd: this.formatApiDate(rotation.end),
        parsedDate: resetDate.toISOString(),
        unixTimestamp: resetTimestamp,
        discordTimestamp,
      },
      'Shrine reset timestamp parsed',
    );

    return EmbedFactory.build({
      title: '✨ Shrine of Secrets Updated',
      description: `Week #${rotation.week}\n\n🕒 Resets ${discordTimestamp}`,
      color: this.colorForTier(highestUsagePerk?.usageTier ?? 'unknown'),
      image: includeArtwork ? ShrineCardRenderer.attachmentUrl : undefined,
      footer: 'Dead by Daylight • Powered by NightLight',
      timestamp: false,
    });
  }

  private parseApiEndAsUtc(end: Date): Date {
    return new Date(Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
      end.getHours(),
      end.getMinutes(),
      end.getSeconds(),
    ));
  }

  private formatApiDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    ].join('T');
  }

  private colorForTier(tier: ShrineUsageTier): number {
    if (tier === 'veryhigh') return COLORS.SHRINE.VERY_HIGH;
    if (tier === 'high') return COLORS.SHRINE.HIGH;
    if (tier === 'medium') return COLORS.SHRINE.MEDIUM;
    return COLORS.SHRINE.LOW;
  }

  private resolveGuildId(config: ShrineConfig): string {
    return config.guildId || this.config.current().guildId || this.config.current().bot.guildId;
  }

  private async loadConfig(): Promise<ShrineConfig> {
    const values = await this.config.getMany<unknown>([...SHRINE_SETTING_KEYS]);

    return {
      enabled: values['shrine.enabled'] as ShrineConfig['enabled'],
      guildId: values['shrine.guildId'] as ShrineConfig['guildId'],
      channelId: values['shrine.channelId'] as ShrineConfig['channelId'],
      nightLightBaseUrl: values['shrine.nightLightBaseUrl'] as ShrineConfig['nightLightBaseUrl'],
      imageCdnUrl: values['shrine.imageCdnUrl'] as ShrineConfig['imageCdnUrl'],
      portraitFolder: values['shrine.portraitFolder'] as ShrineConfig['portraitFolder'],
      perkFolder: values['shrine.perkFolder'] as ShrineConfig['perkFolder'],
      iridescentShardIcon: values['shrine.iridescentShardIcon'] as ShrineConfig['iridescentShardIcon'],
      polling: {
        pollIntervalMs: values['shrine.polling.pollIntervalMs'] as ShrineConfig['polling']['pollIntervalMs'],
        preResetWindowMs: values['shrine.polling.preResetWindowMs'] as ShrineConfig['polling']['preResetWindowMs'],
        delayedUpdateWindowMs: values['shrine.polling.delayedUpdateWindowMs'] as ShrineConfig['polling']['delayedUpdateWindowMs'],
        fallbackRetryMs: values['shrine.polling.fallbackRetryMs'] as ShrineConfig['polling']['fallbackRetryMs'],
      },
      dev: {
        forceAnnouncementOnStartup: values['shrine.dev.forceAnnouncementOnStartup'] as ShrineConfig['dev']['forceAnnouncementOnStartup'],
      },
    };
  }
}
