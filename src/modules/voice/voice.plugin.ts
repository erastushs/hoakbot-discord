import { resolve } from 'node:path';
import { Events, type Client, type VoiceState as DiscordVoiceState } from 'discord.js';
import { TOKENS } from '../../core/container/tokens.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import type { Subscription } from '../../core/event-bus/types.js';
import type { VoiceMemberJoinedEvent } from '../../core/event-bus/events.js';
import { pluginInternalCapabilities, type PluginFactory } from '../../plugin-core/index.js';
import type { IModule } from '../module.interface.js';
import { voiceManifest } from './manifest.js';
import { createVoiceSettings } from './settings.js';
import { ConnectionManager } from './services/ConnectionManager.js';
import { AudioManager } from './services/AudioManager.js';

enum VoiceState { IDLE = 'IDLE', MOVING = 'MOVING', WAITING = 'WAITING', PLAYING = 'PLAYING', RETURNING = 'RETURNING', COOLDOWN = 'COOLDOWN' }

export const voicePluginParity = Object.freeze({
  id: voiceManifest.id,
  settings: Object.freeze([...(voiceManifest.settings ?? [])]),
  commands: Object.freeze([...(voiceManifest.commands ?? [])]),
  events: Object.freeze([...(voiceManifest.events ?? [])]),
  routes: Object.freeze([...(voiceManifest.routes ?? [])]),
  permissions: Object.freeze([...(voiceManifest.permissions ?? [])]),
  dashboard: voiceManifest.dashboard,
});

export const createVoicePlugin: PluginFactory = (context) => {
  const container = context[pluginInternalCapabilities]?.container;
  if (!container) throw new Error('Voice plugin requires the built-in capability bridge.');
  let started = false;
  let stopping: Promise<void> | undefined;
  let generation = 0;
  let state = VoiceState.IDLE;
  let connection: ConnectionManager | undefined;
  let audio: AudioManager | undefined;
  let subscriptions: Subscription[] = [];
  let joinTimer: ReturnType<typeof setTimeout> | undefined;
  let cooldownTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelWait: (() => void) | undefined;
  let voiceListener: ((oldState: DiscordVoiceState, newState: DiscordVoiceState) => void) | undefined;
  let defaultSound = '';
  let volume = 1;
  let cooldownMs = 5000;
  let joinDelayMs = 2000;
  const module: IModule = Object.freeze({ name: 'voice', version: '1.0.0', enabled: true, manifest: voiceManifest, register: () => undefined });

  const transition = (next: VoiceState, logger: ILogger) => { const previous = state; state = next; logger.info({ from: previous, to: next }, `Voice state: ${previous} → ${next}`); };
  const wait = (ms: number) => new Promise<void>((done) => { cancelWait = done; joinTimer = setTimeout(() => { joinTimer = undefined; cancelWait = undefined; done(); }, ms); });

  return {
    id: voiceManifest.id,
    module,
    start: async () => {
      if (started) return;
      const run = ++generation;
      const configuration = container.resolve(TOKENS.ConfigurationService);
      const config = configuration.current();
      const logger = container.resolve(TOKENS.Logger);
      const metrics = container.resolve(TOKENS.MetricsService);
      const client = container.resolve(TOKENS.DiscordClient);
      const eventBus = container.resolve(TOKENS.EventBus);
      const settings = container.has(TOKENS.SettingsRegistry) ? container.resolve(TOKENS.SettingsRegistry) : undefined;
      const voice = config.bot.voice;
      defaultSound = voice.defaultSound; volume = voice.volume; cooldownMs = voice.cooldownMs; joinDelayMs = voice.joinDelayMs;
      connection = new ConnectionManager(client, logger, voice.maxReconnectRetries, voice.reconnectDelayMs);
      audio = new AudioManager(logger);
      settings?.register('voice', createVoiceSettings(config));
      subscriptions = [
        eventBus.subscribe('bot.ready', () => { if (run !== generation || !voice.standbyChannelId || !config.guildId) return; void connection?.joinStandby(voice.standbyChannelId, config.guildId); }),
        eventBus.subscribe('configuration.changed', (event) => { if (event.module !== 'voice' || run !== generation) return; if (event.key === 'voice.defaultSound') defaultSound = String(event.newValue); else if (event.key === 'voice.volume' && typeof event.newValue === 'number') volume = event.newValue; else if (event.key === 'voice.cooldownMs' && typeof event.newValue === 'number') cooldownMs = event.newValue; else if (event.key === 'voice.joinDelayMs' && typeof event.newValue === 'number') joinDelayMs = event.newValue; }),
        eventBus.subscribe('voice.memberJoined', async (event: VoiceMemberJoinedEvent) => {
          if (run !== generation || state !== VoiceState.IDLE || !connection || !audio) return;
          transition(VoiceState.MOVING, logger); metrics.counter('voice_join_total').increment();
          await connection.moveTo(event.channelId, event.guildId);
          if (run !== generation || (state as VoiceState) !== VoiceState.MOVING) return;
          transition(VoiceState.WAITING, logger); await wait(joinDelayMs);
          if (run !== generation || (state as VoiceState) !== VoiceState.WAITING) return;
          transition(VoiceState.PLAYING, logger);
          try { await audio.play(connection.getConnection(), resolve('assets', 'sounds', `${defaultSound}.mp3`), volume); if (run !== generation) return; metrics.counter('voice_playback_total').increment(); }
          catch (error) { if (run !== generation) return; metrics.counter('voice_error_total').increment(); logger.error({ error }, 'Playback error'); }
          if (run !== generation) return;
          transition(VoiceState.RETURNING, logger); connection.returnToStandby(); transition(VoiceState.COOLDOWN, logger);
          cooldownTimer = setTimeout(() => { cooldownTimer = undefined; if (run === generation) transition(VoiceState.IDLE, logger); }, cooldownMs);
        }),
      ];
      voiceListener = (oldState, newState) => {
        if (run !== generation) return;
        const member = newState.member; const userId = member?.id; const channelId = newState.channelId;
        if (!member || !userId || member.user.bot || userId === client.user?.id || oldState.channelId || !channelId) return;
        eventBus.emit('voice.memberJoined', { guildId: newState.guild.id, userId, username: member.user.username, channelId, channelName: newState.channel?.name ?? 'Unknown', joinedAt: Date.now() });
      };
      client.on(Events.VoiceStateUpdate, voiceListener);
      started = true;
      metrics.counter('plugin_migration_voice_cutover').increment();
    },
    stop: async () => {
      if (stopping) return stopping;
      if (!started) return;
      started = false; generation++; state = VoiceState.IDLE;
      stopping = (async () => {
        subscriptions.splice(0).forEach((subscription) => subscription.unsubscribe());
        const client = container.resolve(TOKENS.DiscordClient) as Client;
        if (voiceListener) client.off(Events.VoiceStateUpdate, voiceListener);
        voiceListener = undefined;
        if (joinTimer) clearTimeout(joinTimer); joinTimer = undefined; cancelWait?.(); cancelWait = undefined;
        if (cooldownTimer) clearTimeout(cooldownTimer); cooldownTimer = undefined;
        audio?.stop();
        await connection?.disconnect();
        audio = undefined; connection = undefined;
        if (container.has(TOKENS.SettingsRegistry)) container.resolve(TOKENS.SettingsRegistry).unregister('voice');
      })().finally(() => { stopping = undefined; });
      return stopping;
    },
  };
}
