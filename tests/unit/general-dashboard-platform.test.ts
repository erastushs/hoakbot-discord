import { describe, expect, it } from 'vitest';

import { createGeneralSettings, generalManifest } from '../../src/modules/general/index.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import type { AppConfig } from '../../src/core/config/types.js';

function config(): Readonly<AppConfig> {
  return {
    bot: {
      prefix: 'hoak',
      guildId: 'guild-1',
      ownerIds: [],
      defaultLanguage: 'en',
      presence: { type: 'WATCHING', text: 'the Hoak Family' },
      cooldowns: { global: 1000, perUser: 3000 },
      voice: {
        standbyChannelId: '',
        joinDelayMs: 2000,
        cooldownMs: 5000,
        reconnectDelayMs: 3000,
        maxReconnectRetries: 5,
        defaultSound: 'hoak',
        volume: 1,
      },
      logging: {
        enabled: false,
        voice: { enabled: false, channelId: '' },
        member: { enabled: false, channelId: '', roles: true },
        message: { enabled: false, channelId: '', archiveAttachments: false, maxAttachmentSizeMb: 10 },
        moderation: { enabled: false, channelId: '' },
      },
      welcome: {
        enabled: false,
        channelId: '',
        backgroundUrl: '',
        message: { title: '', body: [] },
        image: { title: '', subtitle: '' },
      },
      goodbye: {
        enabled: false,
        channelId: '',
        image: { backgroundUrl: '', title: '', subtitle: '' },
      },
    },
    permissions: { roles: { administrator: [], moderator: [], trusted: [] } },
    featureFlags: { modules: { general: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

describe('General dashboard platform metadata', () => {
  it('registers a valid manifest and all configurable settings', () => {
    const manifests = new ManifestRegistry();
    const settings = new SettingsRegistry();

    manifests.register(generalManifest);
    settings.register(generalManifest.id, createGeneralSettings(config()));

    expect(manifests.get('general')).toBe(generalManifest);
    expect(settings.getByModule('general').map((setting) => setting.key)).toEqual(
      generalManifest.settings,
    );
  });

  it('uses registry validation for General settings', () => {
    const settings = new SettingsRegistry();
    settings.register(generalManifest.id, createGeneralSettings(config()));

    expect(settings.validate('general.prefix', 'hoak')).toEqual({ success: true });
    expect(settings.validate('general.prefix', '')).toMatchObject({ success: false });
    expect(settings.validate('general.presence.type', 'INVALID')).toMatchObject({ success: false });
  });
});
