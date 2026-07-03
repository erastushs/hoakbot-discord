import { describe, it, expect, vi } from 'vitest';
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
        stroke: vi.fn(),
        shadowColor: '',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        strokeStyle: '',
        lineWidth: 1,
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

const defaultConfig = {
  enabled: true,
  channelId: 'welcome-channel',
  backgroundUrl: 'https://example.com/bg.png',
  message: { title: 'Welcome {server}!', body: ['Hello {mention}'] },
  image: { title: 'WELCOME', subtitle: 'TO {server}' },
} as const;

function createService(
  client: ReturnType<typeof makeClient>,
  config = defaultConfig,
  imageService = makeImageService(),
  templateService = makeTemplateService(),
  logger = makeLogger(),
  metrics = makeMetrics(),
) {
  const service = new WelcomeService(
    client as never,
    config,
    imageService as never,
    templateService as never,
    logger as never,
    metrics as never,
  );
  service.register();
  return { service, logger, metrics, templateService };
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
      expect(call.content).toBeDefined();
      expect(call.files).toBeDefined();
      expect((call.files as Array<Record<string, unknown>>)[0]?.name).toBe('welcome.png');
    });

    it('renders message title and body via TemplateService', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const templateService = makeTemplateService();

      createService(client, defaultConfig, makeImageService(), templateService);

      const member = makeGuildMember();
      member.guild.channels.cache.set('welcome-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberAdd', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(templateService.render).toHaveBeenCalledWith('Welcome {server}!', expect.any(Object));
      expect(templateService.renderLines).toHaveBeenCalledWith(['Hello {mention}'], expect.any(Object));
    });

    it('renders image title and subtitle via TemplateService', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);
      const templateService = makeTemplateService();

      createService(client, defaultConfig, makeImageService(), templateService);

      const member = makeGuildMember();
      member.guild.channels.cache.set('welcome-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberAdd', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(templateService.render).toHaveBeenCalledWith('WELCOME', expect.any(Object));
      expect(templateService.render).toHaveBeenCalledWith('TO {server}', expect.any(Object));
    });

    it('provides correct TemplateContext', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient(send);

      const contextSnapshots: Array<Record<string, unknown>> = [];
      const actualTemplateService = {
        render: vi.fn((t: string, ctx: Record<string, unknown>) => {
          contextSnapshots.push(ctx);
          return t;
        }),
        renderLines: vi.fn((lines: string[]) => lines),
        toOrdinal: vi.fn((n: number) => `${n}th`),
        toOrdinalId: vi.fn((n: number) => `ke-${n}`),
      };

      createService(client, defaultConfig, makeImageService(), actualTemplateService);

      const member = makeGuildMember();
      member.guild.channels.cache.set('welcome-channel', { send, isTextBased: () => true } as never);

      client.emit('guildMemberAdd', member);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      expect(contextSnapshots.length).toBeGreaterThan(0);
      const ctx = contextSnapshots[0]!;
      expect(ctx.user).toBe('<@user-1>');
      expect(ctx.mention).toBe('<@user-1>');
      expect(ctx.username).toBe('testuser');
      expect(ctx.display_name).toBe('TestUser');
      expect(ctx.server).toBe('Test Guild');
      expect(ctx.membercount).toBe(10);
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
        message: { title: '', body: [] },
        image: { title: '', subtitle: '' },
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

      const { logger } = createService(client, {
        enabled: true,
        channelId: '',
        backgroundUrl: '',
        message: { title: '', body: [] },
        image: { title: '', subtitle: '' },
      });

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
