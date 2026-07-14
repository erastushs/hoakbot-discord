import { defineEvent } from '@hoakbot/plugin-contracts';
import { z } from 'zod';
import type { Subscription } from '../../core/event-bus/types.js';
import { builtInGrantName, type BuiltInCapabilityGrant, type PluginFactory } from '../../plugin-core/index.js';
import { ImageService } from '../../shared/image/image.service.js';
import type { IModule } from '../module.interface.js';
import { ShrineCardRenderer } from './canvas/ShrineCardRenderer.js';
import { shrineManifest } from './manifest.js';
import { ShrineClient } from './services/shrine.client.js';
import { ShrinePollingScheduler } from './services/shrine-polling.scheduler.js';
import { ShrineService } from './services/shrine.service.js';
import { createShrineSettings } from './settings.js';

export const shrinePluginParity = Object.freeze({
  id: shrineManifest.id,
  settings: Object.freeze([...(shrineManifest.settings ?? [])]),
  commands: Object.freeze([...(shrineManifest.commands ?? [])]),
  events: Object.freeze([...(shrineManifest.events ?? [])]),
  routes: Object.freeze([...(shrineManifest.routes ?? [])]),
  permissions: Object.freeze([...(shrineManifest.permissions ?? [])]),
  dashboard: shrineManifest.dashboard,
});

export const createShrinePlugin: PluginFactory = (context) => {
  const grant = context.grants?.[builtInGrantName] as BuiltInCapabilityGrant | undefined;
  if (!grant) throw new Error('Shrine plugin requires an explicit built-in capability grant.');
  let started = false;
  let generation = 0;
  let readySubscription: Subscription | undefined;
  let scheduler: ShrinePollingScheduler | undefined;
  const declarative = context.eventMode === 'declarative';
  const events = [defineEvent({ id: 'bot.ready', owner: shrineManifest.id, source: 'internal', payload: z.unknown(), handler: () => scheduler?.start() })];
  const module: IModule = Object.freeze({ name: 'shrine', version: '3.2.1', enabled: true, manifest: shrineManifest, register: () => undefined });
  return {
    id: shrineManifest.id,
    module,
    events,
    start: () => {
      if (started) return;
      const run = ++generation;
      const configuration = grant.configuration;
      const config = configuration.current();
      const logger = grant.logger;
      const eventBus = grant.events;
      if (grant.settings) grant.settings.register('shrine', createShrineSettings(config));
      const network = new ShrineClient({ baseUrl: config.bot.shrine.nightLightBaseUrl, retries: 2, retryDelayMs: 1000, timeoutMs: 10000 }, logger);
      const service = new ShrineService(grant.client, configuration, network, new ShrineCardRenderer(new ImageService(logger)), logger, grant.metrics, eventBus);
      scheduler = new ShrinePollingScheduler(service, logger, config.bot.shrine);
      if (!declarative) readySubscription = eventBus.subscribe('bot.ready', () => { if (run === generation) scheduler?.start(); });
      started = true;
      if (grant.client.isReady()) scheduler.start();
      grant.metrics.counter('plugin_migration_shrine_cutover').increment();
      logger.info({ enabled: config.bot.shrine.enabled }, 'Shrine plugin registered');
    },
    stop: () => {
      if (!started) return;
      started = false;
      generation++;
      readySubscription?.unsubscribe();
      readySubscription = undefined;
      scheduler?.stop();
      scheduler = undefined;
      if (grant.settings) grant.settings.unregister('shrine');
    },
  };
}
