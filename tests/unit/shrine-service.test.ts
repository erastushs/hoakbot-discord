import { describe, expect, it, vi } from 'vitest';

import { COLORS } from '../../src/shared/constants/colors.js';
import { ShrineCardRenderer } from '../../src/modules/shrine/canvas/ShrineCardRenderer.js';
import { ShrineService } from '../../src/modules/shrine/services/shrine.service.js';
import type { ShrineRotation } from '../../src/modules/shrine/types.js';

const shrineConfig = {
  enabled: true,
  guildId: 'guild-1',
  channelId: 'shrine-channel',
  nightLightBaseUrl: 'https://api.nightlight.gg/v1',
  imageCdnUrl: 'https://cdn.nightlight.gg/img/',
  portraitFolder: 'portraits',
  perkFolder: 'perks',
  iridescentShardIcon: 'iridescentshard.png',
  polling: {
    pollIntervalMs: 30000,
    preResetWindowMs: 120000,
    delayedUpdateWindowMs: 600000,
    fallbackRetryMs: 300000,
  },
  dev: {
    forceAnnouncementOnStartup: false,
  },
};

function makeRotation(week: number, end = new Date('2026-07-11T14:59:59Z')): ShrineRotation {
  return {
    week,
    start: new Date('2026-07-10T15:00:00Z'),
    end,
    perks: [
      {
        id: 1,
        name: 'Pain Resonance',
        character: 'The Artist',
        shards: 1500,
        bloodpoints: 100000,
        image: 'perks/pain-resonance.png',
        usageTier: 'veryhigh',
      },
      {
        id: 2,
        name: 'Reactive Healing',
        character: 'Ada Wong',
        shards: 1500,
        bloodpoints: 100000,
        image: 'perks/reactive-healing.png',
        usageTier: 'low',
      },
      {
        id: 3,
        name: 'Hex: Blood Favor',
        character: 'The Blight',
        shards: 1500,
        bloodpoints: 100000,
        image: 'perks/hex-blood-favor.png',
        usageTier: 'high',
      },
      {
        id: 4,
        name: 'Parental Guidance',
        character: 'Yoichi Asakawa',
        shards: 1500,
        bloodpoints: 100000,
        image: 'perks/parental-guidance.png',
        usageTier: 'low',
      },
    ],
  };
}

function makeMetrics() {
  const increments = new Map<string, ReturnType<typeof vi.fn>>();
  return {
    counter: vi.fn((name: string) => {
      const increment = increments.get(name) ?? vi.fn();
      increments.set(name, increment);
      return { increment, decrement: vi.fn(), value: vi.fn(() => 0) };
    }),
    gauge: vi.fn(),
    timer: vi.fn(),
    snapshot: vi.fn(),
    increments,
  };
}

function makeLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
}

function makeConfig(config = shrineConfig) {
  return {
    current: vi.fn(() => ({ guildId: 'guild-1', bot: { guildId: 'guild-1' } })),
    getMany: vi.fn(async () => ({
      'shrine.enabled': config.enabled,
      'shrine.guildId': config.guildId,
      'shrine.channelId': config.channelId,
      'shrine.nightLightBaseUrl': config.nightLightBaseUrl,
      'shrine.imageCdnUrl': config.imageCdnUrl,
      'shrine.portraitFolder': config.portraitFolder,
      'shrine.perkFolder': config.perkFolder,
      'shrine.iridescentShardIcon': config.iridescentShardIcon,
      'shrine.polling.pollIntervalMs': config.polling.pollIntervalMs,
      'shrine.polling.preResetWindowMs': config.polling.preResetWindowMs,
      'shrine.polling.delayedUpdateWindowMs': config.polling.delayedUpdateWindowMs,
      'shrine.polling.fallbackRetryMs': config.polling.fallbackRetryMs,
      'shrine.dev.forceAnnouncementOnStartup': config.dev.forceAnnouncementOnStartup,
    })),
  };
}

function createService(
  rotations: ShrineRotation[],
  send = vi.fn().mockResolvedValue(undefined),
  config = shrineConfig,
) {
  const client = {
    guilds: {
      cache: new Map([
        ['guild-1', { channels: { cache: new Map([['shrine-channel', { send }]]) } }],
      ]),
    },
  };
  const shrineClient = { fetchShrine: vi.fn(async () => rotations.shift() ?? makeRotation(999)) };
  const cardRenderer = { render: vi.fn(async () => Buffer.from('shrine-card')) };
  const logger = makeLogger();
  const metrics = makeMetrics();
  const eventBus = { emit: vi.fn(), subscribe: vi.fn(), once: vi.fn(), subscriberCount: vi.fn(), removeAllListeners: vi.fn() };

  const service = new ShrineService(
    client as never,
    makeConfig(config) as never,
    shrineClient as never,
    cardRenderer as never,
    logger,
    metrics as never,
    eventBus as never,
  );

  return { service, send, shrineClient, cardRenderer, logger, metrics, eventBus };
}

describe('ShrineService', () => {
  it('synchronizes the current and announced week on startup without announcing', async () => {
    const { service, send, logger } = createService([makeRotation(605)]);

    await service.pollAndAnnounce();

    expect(send).not.toHaveBeenCalled();
    expect(service.nextResetTime()?.toISOString()).toBe('2026-07-11T14:59:59.000Z');
    expect(logger.info).toHaveBeenCalledWith(
      { week: 605, resetAt: '2026-07-11T14:59:59.000Z' },
      '[Shrine] Startup synchronization completed. Current week: 605. Announcement skipped.',
    );
  });

  it('forces a startup announcement when development config is enabled', async () => {
    const config = {
      ...shrineConfig,
      dev: { forceAnnouncementOnStartup: true },
    };
    const { service, send, logger, metrics } = createService([makeRotation(605), makeRotation(605)], undefined, config);

    await service.pollAndAnnounce();
    await service.pollAndAnnounce();

    expect(send).toHaveBeenCalledTimes(1);
    expect(metrics.increments.get('shrine_announcement_sent_total')).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('[Shrine] Development mode enabled. Forcing Shrine announcement on startup.');
    expect(logger.info).toHaveBeenCalledWith({ week: 605 }, '[Shrine] Sending Shrine announcement...');
    expect(logger.info).toHaveBeenCalledWith({ week: 605 }, '[Shrine] Announcement delivered. Week 605 marked as announced.');
  });

  it('does not announce duplicate Shrine weeks', async () => {
    const { service, send } = createService([makeRotation(605), makeRotation(605)]);

    await service.pollAndAnnounce();
    await service.pollAndAnnounce();

    expect(send).not.toHaveBeenCalled();
  });

  it('announces a new Shrine week once', async () => {
    const { service, send, eventBus, metrics, logger, cardRenderer } = createService([makeRotation(605), makeRotation(606), makeRotation(606)]);

    await service.pollAndAnnounce();
    await service.pollAndAnnounce();
    await service.pollAndAnnounce();

    expect(send).toHaveBeenCalledTimes(1);
    expect(cardRenderer.render).toHaveBeenCalledWith(makeRotation(606), {
      imageCdnUrl: 'https://cdn.nightlight.gg/img/',
      portraitFolder: 'portraits',
      perkFolder: 'perks',
      iridescentShardIcon: 'iridescentshard.png',
    });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      embeds: expect.any(Array),
      files: [{ attachment: Buffer.from('shrine-card'), name: ShrineCardRenderer.fileName }],
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('shrine.updated', expect.objectContaining({ guildId: 'guild-1', channelId: 'shrine-channel' }));
    expect(metrics.increments.get('shrine_announcement_sent_total')).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith({ previousWeek: 605, week: 606 }, '[Shrine] Week changed: 605 → 606');
    expect(logger.info).toHaveBeenCalledWith({ week: 606 }, '[Shrine] Sending Shrine announcement...');
    expect(logger.info).toHaveBeenCalledWith({ week: 606 }, '[Shrine] Announcement delivered. Week 606 marked as announced.');
  });

  it('keeps failed announcements pending and retries the same week', async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new Error('discord failed'))
      .mockResolvedValueOnce(undefined);
    const { service, logger, metrics } = createService([makeRotation(605), makeRotation(606), makeRotation(606), makeRotation(606)], send);

    await service.pollAndAnnounce();
    await service.pollAndAnnounce();
    await service.pollAndAnnounce();
    await service.pollAndAnnounce();

    expect(send).toHaveBeenCalledTimes(2);
    expect(metrics.increments.get('shrine_announcement_error_total')).toHaveBeenCalledTimes(1);
    expect(metrics.increments.get('shrine_announcement_sent_total')).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      { week: 606, announcedWeek: 605 },
      '[Shrine] Announcement failed. Week 606 remains pending.',
    );
    expect(logger.info).toHaveBeenCalledWith({ week: 606 }, '[Shrine] Announcement delivered. Week 606 marked as announced.');
  });

  it('builds the minimal Shrine embed with attached canvas image', () => {
    const { service } = createService([]);

    const embed = service.buildEmbed(makeRotation(605, new Date(2026, 6, 11, 14, 59, 59))).toJSON();

    expect(embed.title).toBe('✨ Shrine of Secrets Updated');
    expect(embed.description).toContain('Week #605');
    expect(embed.description).toContain('🕒 Resets <t:1783781999:R>');
    expect(embed.color).toBe(COLORS.SHRINE.VERY_HIGH);
    expect(embed.thumbnail).toBeUndefined();
    expect(embed.image?.url).toBe(ShrineCardRenderer.attachmentUrl);
    expect(embed.fields).toBeUndefined();
    expect(embed.footer?.text).toBe('Dead by Daylight • Powered by NightLight');
    expect(embed.timestamp).toBeUndefined();
  });

  it('treats timezone-less NightLight end timestamps as UTC for Discord countdowns', () => {
    const { service, logger } = createService([]);
    const localParsedEnd = new Date(2026, 6, 11, 14, 59, 59);

    const embed = service.buildEmbed(makeRotation(605, localParsedEnd)).toJSON();

    expect(embed.description).toContain('🕒 Resets <t:1783781999:R>');
    expect(logger.debug).toHaveBeenCalledWith(
      {
        apiEnd: '2026-07-11T14:59:59',
        parsedDate: '2026-07-11T14:59:59.000Z',
        unixTimestamp: 1783781999,
        discordTimestamp: '<t:1783781999:R>',
      },
      'Shrine reset timestamp parsed',
    );
  });
});
