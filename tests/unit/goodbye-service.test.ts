import { describe, it, expect, vi } from 'vitest';
import { GoodbyeService } from '../../src/modules/goodbye/services/goodbye.service.js';

function makeMetrics() {
  const increment = vi.fn();
  const counter = vi.fn(() => ({ increment }));
  return { counter, increment };
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

function makeImageService() {
  return {
    loadAsset: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
    createCanvas: vi.fn(() => ({
      width: 800,
      height: 450,
      getContext: vi.fn(() => ({
        save: vi.fn(),
        restore: vi.fn(),
        fillStyle: '',
        fillRect: vi.fn(),
        font: '',
        textAlign: 'left',
        fillText: vi.fn(),
        strokeText: vi.fn(),
        lineJoin: 'miter',
        drawImage: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        clip: vi.fn(),
        stroke: vi.fn(),
        shadowColor: '',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        strokeStyle: '',
        lineWidth: 1,
        measureText: vi.fn(() => ({ width: 100 })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      })),
      encodeSync: vi.fn(() => Buffer.from('fake-png')),
      encode: vi.fn(),
      toBuffer: vi.fn(),
      data: vi.fn(),
      toDataURL: vi.fn(),
      toDataURLAsync: vi.fn(),
      toBlob: vi.fn(),
      encodeStream: vi.fn(),
      convertToBlob: vi.fn(),
    })),
    drawRoundedImage: vi.fn(),
    drawText: vi.fn(),
    clearCache: vi.fn(),
    getCacheSize: vi.fn(() => 0),
  };
}

function makeConfigurationService(config: typeof defaultConfig) {
  return {
    getMany: vi.fn(async (keys: string[]) => {
      const values: Record<string, unknown> = {};
      for (const key of keys) {
        values[key] = readConfigPath(config, key.replace(/^goodbye\./, ''));
      }
      return values;
    }),
  };
}

function readConfigPath(config: typeof defaultConfig, key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, config);
}

function makeTemplateService() {
  return {
    render: vi.fn((t: string) => t),
    renderLines: vi.fn((lines: string[]) => lines),
    toOrdinal: vi.fn((n: number) => `${n}th`),
    toOrdinalId: vi.fn((n: number) => `ke-${n}`),
  };
}

function makeGuildMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    displayName: 'TestUser',
    toString: () => '<@user-1>',
    user: {
      id: 'user-1',
      username: 'testuser',
      bot: false,
      displayAvatarURL: vi.fn(() => 'https://example.com/avatar.png'),
    },
    guild: {
      id: 'guild-1',
      name: 'Test Guild',
      memberCount: 9,
      channels: {
        cache: new Map<string, { send: ReturnType<typeof vi.fn> }>(),
      },
    },
    ...overrides,
  };
}

function makeClient(send: ReturnType<typeof vi.fn>) {
  const channel = { send, isTextBased: () => true };
  const channels = new Map<string, typeof channel>();
  channels.set('goodbye-channel', channel);

  const handlers = new Map<string, (...args: unknown[]) => void>();

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emit: (event: string, ...args: unknown[]) => {
      const handler = handlers.get(event);
      if (handler) handler(...args);
    },
    guilds: { cache: new Map() },
  };
}

const defaultConfig = {
  enabled: true,
  channelId: 'goodbye-channel',
  image: { backgroundUrl: 'https://example.com/bg.png', title: 'GOODBYE', subtitle: 'HOPE YOU ENJOY YOUR STAY' },
} as const;

function createService(
  client: ReturnType<typeof makeClient>,
  config = defaultConfig,
  imageService = makeImageService(),
  templateService = makeTemplateService(),
  logger = makeLogger(),
  metrics = makeMetrics(),
) {
  const service = new GoodbyeService(
    client as never,
    makeConfigurationService(config) as never,
    imageService as never,
    templateService as never,
    logger as never,
    metrics as never,
  );
  service.register();
  return { service, logger, metrics, templateService };
}

describe('GoodbyeService', () => {
  describe('member leave', () => {
    it('sends goodbye image when a non-bot user leaves', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const member = makeGuildMember();
      member.guild.channels.cache.set('goodbye-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberRemove', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(call.content).toBeUndefined();
      expect(call.files).toBeDefined();
      expect((call.files as Array<Record<string, unknown>>)[0]?.name).toBe('goodbye.png');
    });

    it('renders image title and subtitle via TemplateService', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const templateService = makeTemplateService();

      createService(client, defaultConfig, makeImageService(), templateService);

      const member = makeGuildMember();
      member.guild.channels.cache.set('goodbye-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberRemove', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(templateService.render).toHaveBeenCalledWith('GOODBYE', expect.any(Object));
      expect(templateService.render).toHaveBeenCalledWith('HOPE YOU ENJOY YOUR STAY', expect.any(Object));
    });
  });

  describe('bots ignored', () => {
    it('does not send goodbye message for bots', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const member = makeGuildMember({ user: { id: 'bot-1', bot: true, displayAvatarURL: () => '' } });

      client.emit('guildMemberRemove', member);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('disabled goodbye', () => {
    it('does not send message when goodbye is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client, {
        enabled: false,
        channelId: 'goodbye-channel',
        image: { backgroundUrl: '', title: '', subtitle: '' },
      });

      const member = makeGuildMember();

      client.emit('guildMemberRemove', member);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('missing channel config', () => {
    it('warns when channelId is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger } = createService(client, {
        enabled: true,
        channelId: '',
        image: { backgroundUrl: '', title: '', subtitle: '' },
      });

      const member = makeGuildMember();

      client.emit('guildMemberRemove', member);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Goodbye channelId not configured');
    });
  });

  describe('metrics', () => {
    it('increments goodbye_total counter', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const member = makeGuildMember();
      member.guild.channels.cache.set('goodbye-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberRemove', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(metrics.counter).toHaveBeenCalledWith('goodbye_total');
      expect(metrics.increment).toHaveBeenCalled();
    });

    it('logs structured errors with stack traces when sending fails', async () => {
      const sendError = new Error('Discord send failed');
      const send = vi.fn().mockRejectedValue(sendError);
      const client = makeClient(send);

      const { logger, metrics } = createService(client);

      const member = makeGuildMember();
      member.guild.channels.cache.set('goodbye-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberRemove', member);

      await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'goodbye-channel',
          guildId: 'guild-1',
          userId: 'user-1',
          error: expect.objectContaining({
            message: 'Discord send failed',
            name: 'Error',
            stack: expect.stringContaining('Discord send failed'),
          }),
        }),
        'Failed to send goodbye message',
      );
      expect(metrics.counter).toHaveBeenCalledWith('goodbye_error_total');
    });

    it('uses latest guild backgroundUrl after registration', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const imageService = makeImageService();
      const config = {
        enabled: true,
        channelId: 'goodbye-channel',
        image: { backgroundUrl: 'https://example.com/startup-bg.png', title: 'GOODBYE', subtitle: 'RUNTIME' },
      };

      createService(client, config, imageService);
      config.image.backgroundUrl = 'https://example.com/dashboard-bg.png';

      const member = makeGuildMember();
      member.guild.channels.cache.set('goodbye-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberRemove', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      expect(imageService.loadAsset).toHaveBeenCalledWith('https://example.com/dashboard-bg.png');
      expect(imageService.loadAsset).not.toHaveBeenCalledWith('https://example.com/startup-bg.png');
    });
  });
});
