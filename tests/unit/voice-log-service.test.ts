import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceLogService } from '../../src/modules/logging/services/voice-log.service.js';
import type { VoiceLogAction } from '../../src/modules/logging/services/voice-log.service.js';

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

function makeVoiceMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    displayName: 'TestUser',
    user: {
      id: 'user-1',
      username: 'testuser',
      bot: false,
      displayAvatarURL: () => 'https://example.com/avatar.png',
    },
    ...overrides,
  };
}

function makeVoiceState(overrides: Record<string, unknown> = {}) {
  return {
    channelId: null as string | null,
    channel: null as { name: string } | null,
    member: makeVoiceMember(),
    guild: { id: 'guild-1' },
    ...overrides,
  };
}

function makeTextChannel(sendOverride?: ReturnType<typeof vi.fn>) {
  return {
    send: sendOverride ?? vi.fn().mockResolvedValue(undefined),
    isTextBased: () => true,
  };
}

function makeGuild(channelId: string, sendOverride?: ReturnType<typeof vi.fn>) {
  const channels = new Map<string, ReturnType<typeof makeTextChannel>>();
  channels.set(channelId, makeTextChannel(sendOverride));
  return {
    id: 'guild-1',
    channels: {
      cache: channels,
    },
    guilds: undefined,
  };
}

function makeClient(channelId = 'log-channel-1') {
  const guild = makeGuild(channelId);
  const guilds = new Map<string, ReturnType<typeof makeGuild>>();
  guilds.set('guild-1', guild);

  const handlers = new Map<string, (...args: unknown[]) => void>();

  return {
    guilds: { cache: guilds },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emit: (event: string, ...args: unknown[]) => {
      const handler = handlers.get(event);
      if (handler) handler(...args);
    },
    getHandler: (event: string) => handlers.get(event),
  };
}

function createService(
  client: ReturnType<typeof makeClient>,
  config = { enabled: true, channelId: 'log-channel-1' },
  logger = makeLogger(),
  metrics = makeMetrics(),
) {
  const service = new VoiceLogService(client as never, config, logger as never, metrics as never);
  service.register();
  return { service, logger, metrics, client };
}

describe('VoiceLogService', () => {
  describe('join', () => {
    it('sends a join embed when user joins a voice channel', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient();
      // re-create guild with our mock send
      const guild = makeGuild('log-channel-1', send);
      const guilds = new Map<string, ReturnType<typeof makeGuild>>();
      guilds.set('guild-1', guild);
      client.guilds.cache = guilds;

      const { logger, metrics } = createService(client);

      const oldState = makeVoiceState({ channelId: null, channel: null, member: null });
      const newState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member: makeVoiceMember(),
      });

      client.emit('voiceStateUpdate', oldState, newState);

      // Wait for async handler
      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\u27A1\uFE0F Voice Channel Join');
      expect(embed?.color).toBe(0x5865f2);
      expect(embed?.fields).toHaveLength(2);
      expect(embed?.fields?.[0]).toEqual({ name: 'User', value: '<@user-1> (testuser)', inline: true });
      expect(embed?.fields?.[1]).toEqual({ name: 'Channel', value: 'General', inline: true });
      expect(metrics.counter).toHaveBeenCalledWith('voice_log_total');
      expect(metrics.increment).toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    it('sends a leave embed when user leaves a voice channel', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient();
      const guild = makeGuild('log-channel-1', send);
      const guilds = new Map<string, ReturnType<typeof makeGuild>>();
      guilds.set('guild-1', guild);
      client.guilds.cache = guilds;

      const { metrics } = createService(client);

      const oldState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member: makeVoiceMember(),
      });
      const newState = makeVoiceState({
        channelId: null,
        channel: null,
        member: makeVoiceMember(),
      });

      client.emit('voiceStateUpdate', oldState, newState);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\u{1F519} Voice Channel Leave');
      expect(embed?.color).toBe(0xe74c3c);
      expect(embed?.fields?.[0]).toEqual({ name: 'User', value: '<@user-1> (testuser)', inline: true });
      expect(embed?.fields?.[1]).toEqual({ name: 'Channel', value: 'General', inline: true });
      expect(metrics.counter).toHaveBeenCalledWith('voice_log_total');
    });
  });

  describe('move', () => {
    it('sends a move embed when user moves between voice channels', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient();
      const guild = makeGuild('log-channel-1', send);
      const guilds = new Map<string, ReturnType<typeof makeGuild>>();
      guilds.set('guild-1', guild);
      client.guilds.cache = guilds;

      const { metrics } = createService(client);

      const oldState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member: makeVoiceMember(),
      });
      const newState = makeVoiceState({
        channelId: 'voice-2',
        channel: { name: 'Lounge' },
        member: makeVoiceMember(),
      });

      client.emit('voiceStateUpdate', oldState, newState);

      await vi.waitFor(() => expect(send).toHaveBeenCalled());

      const call = send.mock.calls[0]?.[0] as { embeds: Array<{ data: Record<string, unknown> }> };
      const embed = call.embeds[0]?.data;

      expect(embed?.title).toBe('\uD83D\uDD04 Voice Channel Move');
      expect(embed?.color).toBe(0xfacc15);
      expect(embed?.fields?.[0]).toEqual({ name: 'User', value: '<@user-1> (testuser)', inline: true });
      expect(embed?.fields?.[1]).toEqual({ name: 'From', value: 'General', inline: true });
      expect(embed?.fields?.[2]).toEqual({ name: 'To', value: 'Lounge', inline: true });
      expect(metrics.counter).toHaveBeenCalledWith('voice_log_total');
    });
  });

  describe('bot ignored', () => {
    it('does not send embed for bot users', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient();
      const guild = makeGuild('log-channel-1', send);
      const guilds = new Map<string, ReturnType<typeof makeGuild>>();
      guilds.set('guild-1', guild);
      client.guilds.cache = guilds;

      const { metrics } = createService(client);

      const botMember = makeVoiceMember({
        user: {
          id: 'bot-1',
          username: 'botuser',
          bot: true,
          displayAvatarURL: () => '',
        },
      });

      const oldState = makeVoiceState({ channelId: null, channel: null, member: null });
      const newState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member: botMember,
      });

      client.emit('voiceStateUpdate', oldState, newState);

      // Give time for any potential async handler
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('voice_log_total');
    });
  });

  describe('no channel change ignored', () => {
    it('does not send embed when channelId does not change', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient();
      const guild = makeGuild('log-channel-1', send);
      const guilds = new Map<string, ReturnType<typeof makeGuild>>();
      guilds.set('guild-1', guild);
      client.guilds.cache = guilds;

      const { metrics } = createService(client);

      const member = makeVoiceMember();
      const oldState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member,
      });
      const newState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member,
      });

      client.emit('voiceStateUpdate', oldState, newState);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
      expect(metrics.counter).not.toHaveBeenCalledWith('voice_log_total');
    });
  });

  describe('disabled logging', () => {
    it('does not send embed when voice logging is disabled', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient();
      const guild = makeGuild('log-channel-1', send);
      const guilds = new Map<string, ReturnType<typeof makeGuild>>();
      guilds.set('guild-1', guild);
      client.guilds.cache = guilds;

      const { logger } = createService(client, { enabled: false, channelId: 'log-channel-1' });

      const oldState = makeVoiceState({ channelId: null, channel: null, member: null });
      const newState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member: makeVoiceMember(),
      });

      client.emit('voiceStateUpdate', oldState, newState);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('missing member', () => {
    it('does not send embed when both old and new states lack a member', async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const client = makeClient();
      const guild = makeGuild('log-channel-1', send);
      const guilds = new Map<string, ReturnType<typeof makeGuild>>();
      guilds.set('guild-1', guild);
      client.guilds.cache = guilds;

      createService(client);

      const oldState = makeVoiceState({ channelId: null, channel: null, member: null });
      const newState = makeVoiceState({ channelId: 'voice-1', channel: { name: 'General' }, member: null });

      client.emit('voiceStateUpdate', oldState, newState);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('missing channel config', () => {
    it('warns when channelId is empty', async () => {
      const client = makeClient();
      const { logger } = createService(client, { enabled: true, channelId: '' });

      const oldState = makeVoiceState({ channelId: null, channel: null, member: null });
      const newState = makeVoiceState({
        channelId: 'voice-1',
        channel: { name: 'General' },
        member: makeVoiceMember(),
      });

      client.emit('voiceStateUpdate', oldState, newState);

      await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(logger.warn).toHaveBeenCalledWith('Voice logging channelId not configured');
    });
  });
});
