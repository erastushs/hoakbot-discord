import { TOKENS } from '../../core/container/tokens.js';
import { defineEvent } from '@hoakbot/plugin-contracts';
import { z } from 'zod';
import type { GuildMember, PartialGuildMember, Message, PartialMessage, VoiceState } from 'discord.js';
import type { ModerationActionEvent, WarningIssuedEvent } from '../moderation/moderation.events.js';
import { pluginInternalCapabilities, type PluginFactory } from '../../plugin-core/index.js';
import type { IModule } from '../module.interface.js';
import { loggingManifest } from './manifest.js';
import { createLoggingSettings } from './settings.js';
import { MemberLogService } from './services/member-log.service.js';
import { MessageLogService } from './services/message-log.service.js';
import { ModerationLogService } from './services/moderation-log.service.js';
import { VoiceLogService } from './services/voice-log.service.js';

export const loggingPluginParity = Object.freeze({
  id: loggingManifest.id,
  settings: Object.freeze([...(loggingManifest.settings ?? [])]),
  commands: Object.freeze([...(loggingManifest.commands ?? [])]),
  events: Object.freeze([...(loggingManifest.events ?? [])]),
  routes: Object.freeze([...(loggingManifest.routes ?? [])]),
  dashboard: loggingManifest.dashboard,
});

export const createLoggingPlugin: PluginFactory = (context) => {
  const container = context[pluginInternalCapabilities]?.container;
  if (!container) throw new Error('Logging plugin requires the built-in capability bridge.');
  let started = false;
  let services: Array<{ register(): void; activate(): void; dispose(): void }> = [];
  let voiceService: VoiceLogService | undefined;
  let memberService: MemberLogService | undefined;
  let messageService: MessageLogService | undefined;
  let moderationService: ModerationLogService | undefined;
  const declarative = context[pluginInternalCapabilities]?.eventMode === 'declarative';
  const tuple = <T>(value: unknown): T => value as T;
  const events = [
    defineEvent({ id: 'discord.voice_state_update', owner: loggingManifest.id, source: 'discord', payload: { parse: (value) => tuple<[VoiceState, VoiceState]>(value) }, handler: ([oldState, newState]) => voiceService?.handleDiscordVoiceState(oldState, newState) }),
    defineEvent({ id: 'discord.guild_member_update', owner: loggingManifest.id, source: 'discord', payload: { parse: (value) => tuple<[GuildMember | PartialGuildMember, GuildMember]>(value) }, handler: ([oldMember, newMember]) => memberService?.handleDiscordMemberUpdate(oldMember, newMember) }),
    defineEvent({ id: 'discord.message_delete', owner: loggingManifest.id, source: 'discord', payload: { parse: (value) => value as Message | PartialMessage }, handler: (message) => messageService?.handleDiscordDelete(message) }),
    defineEvent({ id: 'discord.message_update', owner: loggingManifest.id, source: 'discord', payload: { parse: (value) => tuple<[Message | PartialMessage, Message | PartialMessage]>(value) }, handler: ([oldMessage, newMessage]) => messageService?.handleDiscordUpdate(oldMessage, newMessage) }),
    defineEvent({ id: 'discord.message_bulk_delete', owner: loggingManifest.id, source: 'discord', payload: z.unknown(), handler: (messages) => messageService?.handleDiscordBulkDelete(messages) }),
    defineEvent({ id: 'moderation.action', owner: loggingManifest.id, source: 'internal', dependencies: ['moderation'], payload: { parse: (value) => value as ModerationActionEvent }, handler: (event) => moderationService?.handleModerationAction(event) }),
    defineEvent({ id: 'moderation.warningIssued', owner: loggingManifest.id, source: 'internal', dependencies: ['moderation'], payload: { parse: (value) => value as WarningIssuedEvent }, handler: (event) => moderationService?.handleWarningIssued(event) }),
  ];
  const module: IModule = Object.freeze({ name: 'logging', version: '1.0.0', enabled: true, manifest: loggingManifest, register: () => undefined });
  return {
    id: loggingManifest.id,
    module,
    events,
    start: () => {
      if (started) return;
      const config = container.resolve(TOKENS.ConfigurationService).current();
      const settings = container.has(TOKENS.SettingsRegistry) ? container.resolve(TOKENS.SettingsRegistry) : undefined;
      settings?.register('logging', createLoggingSettings(config));
      started = true;
      const logger = container.resolve(TOKENS.Logger);
      const metrics = container.resolve(TOKENS.MetricsService);
      metrics.counter('plugin_migration_logging_cutover').increment();
      if (!config.bot.logging.enabled) {
        logger.info('Logging module disabled via config');
        return;
      }
      const client = container.resolve(TOKENS.DiscordClient);
      const eventBus = container.resolve(TOKENS.EventBus);
      voiceService = new VoiceLogService(client, config.bot.logging.voice, logger, metrics);
      memberService = new MemberLogService(client, config.bot.logging.member, logger, metrics, eventBus);
      messageService = new MessageLogService(client, config.bot.logging.message, logger, metrics, eventBus);
      moderationService = new ModerationLogService(client, config.bot.logging.moderation, logger, metrics, eventBus);
      services = [voiceService, memberService, messageService, moderationService];
      for (const service of services) {
        if (declarative) service.activate();
        else service.register();
      }
      logger.info('Logging plugin registered');
    },
    stop: () => {
      if (!started) return;
      for (const service of [...services].reverse()) service.dispose();
      services = [];
      voiceService = undefined; memberService = undefined; messageService = undefined; moderationService = undefined;
      if (container.has(TOKENS.SettingsRegistry)) container.resolve(TOKENS.SettingsRegistry).unregister('logging');
      started = false;
    },
  };
}
