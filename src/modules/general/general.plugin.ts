import { Events, type Interaction, type Message } from 'discord.js';
import { defineEvent } from '@hoakbot/plugin-contracts';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommandRouter } from '../../adapters/command-router.js';
import { builtInGrantName, type BuiltInCapabilityGrant, type PluginFactory } from '../../plugin-core/index.js';
import type { IModule } from '../module.interface.js';
import { createGeneralCommandDescriptors } from '../../shared/command/builtin-commands.js';
import { CommandIndexer } from './help/command-indexer.js';
import { HelpInteractionHandler } from './help/help-interaction-handler.js';
import { HelpService } from './help/help-service.js';
import { generalManifest } from './manifest.js';
import { createGeneralSettings } from './settings.js';

const directory = dirname(fileURLToPath(import.meta.url));
const packageVersion = (JSON.parse(readFileSync(join(directory, '..', '..', '..', 'package.json'), 'utf-8')) as { version: string }).version;

export const generalPluginParity = Object.freeze({
  id: generalManifest.id,
  settings: Object.freeze([...(generalManifest.settings ?? [])]),
  commands: Object.freeze([...(generalManifest.commands ?? [])]),
  events: Object.freeze([...(generalManifest.events ?? [])]),
  routes: Object.freeze([...(generalManifest.routes ?? [])]),
  permissions: Object.freeze([...(generalManifest.permissions ?? [])]),
  dashboard: generalManifest.dashboard,
});

export const createGeneralPlugin: PluginFactory = (context) => {
  const grant = context.grants?.[builtInGrantName] as BuiltInCapabilityGrant | undefined;
  if (!grant) throw new Error('General plugin requires an explicit built-in capability grant.');
  let started = false;
  const registry = grant.commands;
  const settings = grant.settings;
  const config = grant.configuration.current();
  const logger = grant.logger;
  const eventBus = grant.events;
  const metrics = grant.metrics;
  const client = grant.client;
  const helpService = new HelpService(new CommandIndexer(registry, config.ownerIds), config.bot.prefix, packageVersion);
  const helpInteractionHandler = new HelpInteractionHandler(helpService);
  const commands = createGeneralCommandDescriptors({ config, helpService });
  const router = new CommandRouter(registry, config, logger, eventBus, metrics);
  const interactionHandler = (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) router.handleSlash(interaction).catch((error) => logger.error({ error }, 'Slash command handler failed'));
    else if (interaction.isAutocomplete()) router.handleAutocomplete(interaction).catch((error) => logger.error({ error }, 'Autocomplete handler failed'));
    else if ((interaction.isButton() || interaction.isStringSelectMenu()) && helpInteractionHandler.owns(interaction.customId)) helpInteractionHandler.handle(interaction).catch((error) => logger.error({ error }, 'Help interaction handler failed'));
  };
  const messageHandler = (message: Message) => {
    if (!message.author.bot) router.handlePrefix(message).catch((error) => logger.error({ error }, 'Prefix command handler failed'));
  };
  const declarative = context.eventMode === 'declarative';
  const events = [
    defineEvent({ id: 'discord.interaction_create', owner: generalManifest.id, source: 'discord', payload: { parse: (value) => value as Interaction }, handler: interactionHandler }),
    defineEvent({ id: 'discord.message_create', owner: generalManifest.id, source: 'discord', payload: { parse: (value) => value as Message }, handler: messageHandler }),
  ];
  const module: IModule = Object.freeze({ name: 'general', version: '1.0.0', enabled: true, manifest: generalManifest, register: () => undefined });
  return {
    id: generalManifest.id,
    module,
    events,
    start: () => {
      if (started) return;
      settings?.register('general', createGeneralSettings(config));
      registry.registerMany(commands);
      if (!declarative) {
        client.on(Events.InteractionCreate, interactionHandler);
        client.on(Events.MessageCreate, messageHandler);
      }
      started = true;
      metrics.counter('plugin_migration_general_cutover').increment();
    },
    stop: () => {
      if (!started) return;
      if (!declarative) {
        client.off(Events.InteractionCreate, interactionHandler);
        client.off(Events.MessageCreate, messageHandler);
      }
      for (const descriptor of commands) registry.unregister(descriptor.metadata.name);
      settings?.unregister('general');
      started = false;
    },
  };
}
