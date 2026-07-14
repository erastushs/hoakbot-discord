import { Events, type Client, type VoiceState as DiscordVoiceState } from 'discord.js';
import { defineEvent } from '@hoakbot/plugin-contracts';
import { z } from 'zod';
import type { ConfigurationChangedEvent } from '../../core/event-bus/configuration.events.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import type { Subscription } from '../../core/event-bus/types.js';
import type { VoiceMemberJoinedEvent } from '../../core/event-bus/events.js';
import { builtInGrantName, type BuiltInCapabilityGrant, type PluginFactory } from '../../plugin-core/index.js';
import type { IModule } from '../module.interface.js';
import { voiceManifest } from './manifest.js';
import { createVoiceSettings } from './settings.js';
import { ConnectionManager } from './services/ConnectionManager.js';
import { AudioManager } from './services/AudioManager.js';
import { resolveVoiceSound } from './services/voice-sound.js';

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
  const grant = context.grants?.[builtInGrantName] as BuiltInCapabilityGrant | undefined;
  if (!grant) throw new Error('Voice plugin requires an explicit built-in capability grant.');
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
  const declarative = context.eventMode === 'declarative';
  let readyHandler: (() => void) | undefined;
  let configHandler: ((event: ConfigurationChangedEvent) => void) | undefined;
  let joinedHandler: ((event: VoiceMemberJoinedEvent) => Promise<void>) | undefined;
  let stateHandler: ((states: [DiscordVoiceState, DiscordVoiceState]) => void) | undefined;
  const events = [
    defineEvent({ id: 'bot.ready', owner: voiceManifest.id, source: 'internal', payload: z.unknown(), handler: () => readyHandler?.() }),
    defineEvent({ id: 'configuration.changed', owner: voiceManifest.id, source: 'configuration', payload: { parse: (value) => value as ConfigurationChangedEvent }, handler: (event) => configHandler?.(event) }),
    defineEvent({ id: 'voice.memberJoined', owner: voiceManifest.id, source: 'internal', payload: { parse: (value) => value as VoiceMemberJoinedEvent }, handler: async (event) => joinedHandler?.(event) }),
    defineEvent({ id: 'discord.voice_state_update', owner: voiceManifest.id, source: 'discord', payload: { parse: (value) => value as [DiscordVoiceState, DiscordVoiceState] }, handler: (states) => stateHandler?.(states) }),
  ];
  const module: IModule = Object.freeze({ name: 'voice', version: '1.0.0', enabled: true, manifest: voiceManifest, register: () => undefined });

  const transition = (next: VoiceState, logger: ILogger) => { const previous = state; state = next; logger.info({ from: previous, to: next }, `Voice state: ${previous} → ${next}`); };
  const wait = (ms: number) => new Promise<void>((done) => { cancelWait = done; joinTimer = setTimeout(() => { joinTimer = undefined; cancelWait = undefined; done(); }, ms); });

  return {
    id: voiceManifest.id,
    module,
    events,
    start: async () => {
      if (started) return;
      const run = ++generation;
      const configuration = grant.configuration;
      const config = configuration.current();
      const logger = grant.logger;
      const metrics = grant.metrics;
      const client = grant.client;
      const eventBus = grant.events;
      const settings = grant.settings;
      const voice = config.bot.voice;
      defaultSound = voice.defaultSound; volume = voice.volume; cooldownMs = voice.cooldownMs; joinDelayMs = voice.joinDelayMs;
      connection = new ConnectionManager(client, logger, voice.maxReconnectRetries, voice.reconnectDelayMs);
      audio = new AudioManager(logger);
      settings?.register('voice', createVoiceSettings(config));
      readyHandler = () => { if (run !== generation || !voice.standbyChannelId || !config.guildId) return; void connection?.joinStandby(voice.standbyChannelId, config.guildId); };
      configHandler = (event) => { if (event.module !== 'voice' || run !== generation) return; if (event.key === 'voice.defaultSound') defaultSound = String(event.newValue); else if (event.key === 'voice.volume' && typeof event.newValue === 'number') volume = event.newValue; else if (event.key === 'voice.cooldownMs' && typeof event.newValue === 'number') cooldownMs = event.newValue; else if (event.key === 'voice.joinDelayMs' && typeof event.newValue === 'number') joinDelayMs = event.newValue; };
      joinedHandler = async (event: VoiceMemberJoinedEvent) => {
          if (run !== generation || state !== VoiceState.IDLE || !connection || !audio) return;
          transition(VoiceState.MOVING, logger); metrics.counter('voice_join_total').increment();
          await connection.moveTo(event.channelId, event.guildId);
          if (run !== generation || (state as VoiceState) !== VoiceState.MOVING) return;
          transition(VoiceState.WAITING, logger); await wait(joinDelayMs);
          if (run !== generation || (state as VoiceState) !== VoiceState.WAITING) return;
          transition(VoiceState.PLAYING, logger);
          try { const sound = await resolveVoiceSound(defaultSound); try { await audio.play(connection.getConnection(), sound.path, volume); } finally { sound.release(); } if (run !== generation) return; metrics.counter('voice_playback_total').increment(); }
          catch (error) { if (run !== generation) return; metrics.counter('voice_error_total').increment(); logger.error({ error }, 'Playback error'); }
          if (run !== generation) return;
          transition(VoiceState.RETURNING, logger); connection.returnToStandby(); transition(VoiceState.COOLDOWN, logger);
          cooldownTimer = setTimeout(() => { cooldownTimer = undefined; if (run === generation) transition(VoiceState.IDLE, logger); }, cooldownMs);
         };
       stateHandler = ([oldState, newState]) => {
        if (run !== generation) return;
        const member = newState.member; const userId = member?.id; const channelId = newState.channelId;
        if (!member || !userId || member.user.bot || userId === client.user?.id || oldState.channelId || !channelId) return;
        eventBus.emit('voice.memberJoined', { guildId: newState.guild.id, userId, username: member.user.username, channelId, channelName: newState.channel?.name ?? 'Unknown', joinedAt: Date.now() });
      };
      voiceListener = (oldState, newState) => stateHandler?.([oldState, newState]);
      if (!declarative) {
        subscriptions = [eventBus.subscribe('bot.ready', () => readyHandler?.()), eventBus.subscribe('configuration.changed', (event) => configHandler?.(event)), eventBus.subscribe('voice.memberJoined', (event) => joinedHandler?.(event))];
        client.on(Events.VoiceStateUpdate, voiceListener);
      }
      started = true;
      metrics.counter('plugin_migration_voice_cutover').increment();
    },
    stop: async () => {
      if (stopping) return stopping;
      if (!started) return;
      started = false; generation++; state = VoiceState.IDLE;
      stopping = (async () => {
        subscriptions.splice(0).forEach((subscription) => subscription.unsubscribe());
        const client = grant.client as Client;
        if (!declarative && voiceListener) client.off(Events.VoiceStateUpdate, voiceListener);
        voiceListener = undefined; readyHandler = undefined; configHandler = undefined; joinedHandler = undefined; stateHandler = undefined;
        if (joinTimer) clearTimeout(joinTimer); joinTimer = undefined; cancelWait?.(); cancelWait = undefined;
        if (cooldownTimer) clearTimeout(cooldownTimer); cooldownTimer = undefined;
        audio?.stop();
        await connection?.disconnect();
        audio = undefined; connection = undefined;
        if (grant.settings) grant.settings.unregister('voice');
      })().finally(() => { stopping = undefined; });
      return stopping;
    },
  };
}
