import type { PluginCatalogEntry, PluginInstance, PluginManifest } from '../plugin-core/index.js';
import type { IModuleManifest } from './manifest.types.js';
import type { IModule } from './module.interface.js';

const SHARED_SETTINGS_ROUTE = '/guilds/:guildId/settings';

const eventPublishersByPlugin: Readonly<Record<string, readonly string[]>> = Object.freeze({
  moderation: Object.freeze(['moderation.action', 'moderation.warningIssued']),
  voice: Object.freeze(['voiceStateUpdate', 'voice.memberJoined']),
});

const eventSubscribersByPlugin: Readonly<Record<string, readonly string[]>> = Object.freeze({
  general: Object.freeze(['interactionCreate', 'messageCreate']),
  logging: Object.freeze(['voiceStateUpdate', 'guildMemberUpdate', 'messageDelete', 'messageUpdate', 'messageBulkDelete', 'moderation.action', 'moderation.warningIssued']),
  voice: Object.freeze(['bot.ready']),
  welcome: Object.freeze(['discord.guild_member_add']),
  goodbye: Object.freeze(['discord.guild_member_remove']),
  shrine: Object.freeze(['bot.ready']),
});

export interface LegacyModulePluginInstance extends PluginInstance {
  readonly module: IModule;
}

export interface BuiltInPluginCatalogEntry extends PluginCatalogEntry {
  readonly legacyManifest: IModuleManifest;
}

export function projectLegacyManifest(manifest: IModuleManifest): PluginManifest {
  return {
    schemaVersion: 1,
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    dependencies: (manifest.dependencies ?? []).map((id) => ({ id, range: '*' })),
    capabilities: {
      settings: [...(manifest.settings ?? [])],
      commands: [...(manifest.commands ?? [])],
      events: [...(manifest.events ?? [])],
      routes: [...(manifest.routes ?? [])],
      permissions: [...(manifest.permissions ?? [])],
      ownership: {
        routes: {
          owners: (manifest.routes ?? []).filter((route) => route !== SHARED_SETTINGS_ROUTE),
          contributors: (manifest.routes ?? []).filter((route) => route === SHARED_SETTINGS_ROUTE),
        },
        events: {
          publishers: [...(eventPublishersByPlugin[manifest.id] ?? [])],
          subscribers: [...(eventSubscribersByPlugin[manifest.id] ?? [])],
        },
        commands: [...(manifest.commands ?? [])],
        schedulers: manifest.id === 'shrine' ? ['shrine.polling'] : [],
        assets: ['welcome', 'voice', 'shrine'].includes(manifest.id) ? [`${manifest.id}:assets`] : [],
      },
    },
    metadata: { legacyManifest: manifest },
  };
}

export function createLegacyModulePluginEntry(
  manifest: IModuleManifest,
  factory: () => Promise<IModule>,
): BuiltInPluginCatalogEntry {
  return Object.freeze({
    manifest: projectLegacyManifest(manifest),
    legacyManifest: manifest,
    factory: async (): Promise<LegacyModulePluginInstance> => {
      const module = await factory();
      if (module.name !== manifest.id || module.manifest?.id !== manifest.id) {
        throw new Error(`Built-in plugin "${manifest.id}" factory returned incompatible module "${module.name}".`);
      }
      return Object.freeze({ id: manifest.id, module });
    },
  });
}

export function projectPluginModules(snapshot: ReadonlyMap<string, { instance: PluginInstance }>): IModule[] {
  return [...snapshot.values()].map(({ instance }) => {
    if (!('module' in instance)) throw new Error(`Plugin "${instance.id}" has no legacy module projection.`);
    return (instance as LegacyModulePluginInstance).module;
  });
}
