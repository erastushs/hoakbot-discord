import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WelcomeService } from '../../src/modules/welcome/services/welcome.service.js';

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
        drawImage: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        clip: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
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

function makeGuildMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    displayName: 'TestUser',
    toString: () => '<@user-1>',
    user: {
      id: 'user-1',
      bot: false,
      displayAvatarURL: vi.fn(() => 'https://example.com/avatar.png'),
    },
    guild: {
      id: 'guild-1',
      name: 'Test Guild',
      memberCount: 10,
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
  channels.set('welcome-channel', channel);

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

function createService(
  client: ReturnType<typeof makeClient>,
  config = { enabled: true, channelId: 'welcome-channel', backgroundUrl: 'https://example.com/bg.png', title: 'Welcome!', subtitle: 'Member #{count}' },
  imageService = makeImageService(),
  logger = makeLogger(),
  metrics = makeMetrics(),
) {
  const service = new WelcomeService(client as never, config, imageService as never, logger as never, metrics as never);
  service.register();
  return { service, logger, metrics };
}

describe('WelcomeService', () => {
  describe('member join', () => {
    it('sends welcome message when a non-bot user joins', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const member = makeGuildMember();
      member.guild.channels.cache.set('welcome-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberAdd', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(call.content).toBe('Welcome <@user-1>!');
      expect(call.files).toBeDefined();
      expect((call.files as Array<Record<string, unknown>>)[0]?.name).toBe('welcome.png');
    });
  });

  describe('bots ignored', () => {
    it('does not send welcome message for bots', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client);

      const member = makeGuildMember({ user: { id: 'bot-1', bot: true, displayAvatarURL: () => '' } });

      client.emit('guildMemberAdd', member);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('disabled welcome', () => {
    it('does not send message when welcome is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      createService(client, {
        enabled: false,
        channelId: 'welcome-channel',
        backgroundUrl: '',
        title: '',
        subtitle: '',
      });

      const member = makeGuildMember();

      client.emit('guildMemberAdd', member);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('missing channel config', () => {
    it('warns when channelId is empty', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { logger } = createService(
        client,
        { enabled: true, channelId: '', backgroundUrl: '', title: '', subtitle: '' },
      );

      const member = makeGuildMember();

      client.emit('guildMemberAdd', member);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Welcome channelId not configured');
    });
  });

  describe('metrics', () => {
    it('increments welcome_total counter', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const { metrics } = createService(client);

      const member = makeGuildMember();
      member.guild.channels.cache.set('welcome-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberAdd', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(metrics.counter).toHaveBeenCalledWith('welcome_total');
      expect(metrics.increment).toHaveBeenCalled();
    });
  });
});
