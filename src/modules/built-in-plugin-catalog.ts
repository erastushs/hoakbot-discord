import { goodbyeManifest } from './goodbye/manifest.js';
import { generalManifest } from './general/manifest.js';
import { loggingManifest } from './logging/manifest.js';
import { moderationManifest } from './moderation/manifest.js';
import { shrineManifest } from './shrine/manifest.js';
import { voiceManifest } from './voice/manifest.js';
import { welcomeManifest } from './welcome/manifest.js';
import { createLegacyModulePluginEntry, type BuiltInPluginCatalogEntry } from './plugin-compatibility.js';

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
