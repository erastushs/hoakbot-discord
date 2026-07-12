import { goodbyeManifest } from './goodbye/manifest.js';
import { generalManifest } from './general/manifest.js';
import { loggingManifest } from './logging/manifest.js';
import { moderationManifest } from './moderation/manifest.js';
import { shrineManifest } from './shrine/manifest.js';
import { voiceManifest } from './voice/manifest.js';
import { welcomeManifest } from './welcome/manifest.js';
import type { FeatureFlagsConfig } from '../core/config/types.js';
import type { PluginCatalogEntry } from '../plugin-core/index.js';
import { createGoodbyePlugin } from './goodbye/goodbye.plugin.js';
import { createGeneralPlugin } from './general/general.plugin.js';
import { createLoggingPlugin } from './logging/logging.plugin.js';
import { createModerationPlugin } from './moderation/moderation.plugin.js';
import { createShrinePlugin } from './shrine/shrine.plugin.js';
import { createVoicePlugin } from './voice/voice.plugin.js';
import { createWelcomePlugin } from './welcome/welcome.plugin.js';
import { createLegacyModulePluginEntry, projectLegacyManifest, type BuiltInPluginCatalogEntry } from './plugin-compatibility.js';

export const generatedBuiltInPluginCatalog: readonly BuiltInPluginCatalogEntry[] = Object.freeze([
  createLegacyModulePluginEntry(generalManifest, async () => new (await import('./general/general.module.js')).GeneralModule()),
  createLegacyModulePluginEntry(voiceManifest, async () => new (await import('./voice/voice.module.js')).VoiceModule()),
  createLegacyModulePluginEntry(moderationManifest, async () => new (await import('./moderation/moderation.module.js')).ModerationModule()),
  createLegacyModulePluginEntry(loggingManifest, async () => new (await import('./logging/logging.module.js')).LoggingModule()),
  createLegacyModulePluginEntry(welcomeManifest, async () => new (await import('./welcome/welcome.module.js')).WelcomeModule()),
  createLegacyModulePluginEntry(goodbyeManifest, async () => new (await import('./goodbye/goodbye.module.js')).GoodbyeModule()),
  createLegacyModulePluginEntry(shrineManifest, async () => new (await import('./shrine/shrine.module.js')).ShrineModule()),
]);

export function getGeneratedBuiltInPluginCatalog(): readonly BuiltInPluginCatalogEntry[] {
  return generatedBuiltInPluginCatalog;
}

const migratedPlugins = [
  { manifest: generalManifest, flag: 'generalPlugin', factory: createGeneralPlugin },
  { manifest: loggingManifest, flag: 'loggingPlugin', factory: createLoggingPlugin },
  { manifest: welcomeManifest, flag: 'welcomePlugin', factory: createWelcomePlugin },
  { manifest: goodbyeManifest, flag: 'goodbyePlugin', factory: createGoodbyePlugin },
  { manifest: voiceManifest, flag: 'voicePlugin', factory: createVoicePlugin },
  { manifest: moderationManifest, flag: 'moderationPlugin', factory: createModerationPlugin },
  { manifest: shrineManifest, flag: 'shrinePlugin', factory: createShrinePlugin },
] as const;

export function createBuiltInRuntimeCatalog(flags: FeatureFlagsConfig): readonly PluginCatalogEntry[] {
  return Object.freeze(migratedPlugins
    .filter(({ manifest }) => flags.modules[manifest.id] !== false)
    .map(({ manifest, flag, factory }) => flags[flag]
      ? Object.freeze({ manifest: projectLegacyManifest(manifest), factory })
      : generatedBuiltInPluginCatalog.find((entry) => entry.legacyManifest.id === manifest.id)!));
}
