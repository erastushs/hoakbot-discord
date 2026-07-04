import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../src/core/config/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createLoggingSettings, loggingManifest } from '../../src/modules/logging/index.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';

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
        enabled: true,
        voice: { enabled: true, channelId: 'voice-log' },
        member: { enabled: true, channelId: 'member-log', roles: true },
        message: {
          enabled: true,
          channelId: 'message-log',
          archiveAttachments: true,
          maxAttachmentSizeMb: 10,
        },
        moderation: { enabled: true, channelId: 'moderation-log' },
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
    featureFlags: { modules: { logging: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

describe('Logging dashboard platform metadata', () => {
  it('registers a valid manifest and every configurable Logging setting', () => {
    const manifests = new ManifestRegistry();
    const settings = new SettingsRegistry();

    manifests.register(loggingManifest);
    settings.register(loggingManifest.id, createLoggingSettings(config()));

    expect(manifests.get('logging')).toBe(loggingManifest);
    expect(settings.getByModule('logging').map((setting) => setting.key)).toEqual(
      loggingManifest.settings,
    );
  });

  it('uses registry validation for Logging settings', () => {
    const settings = new SettingsRegistry();
    settings.register(loggingManifest.id, createLoggingSettings(config()));

    expect(settings.validate('logging.enabled', false)).toEqual({ success: true });
    expect(settings.validate('logging.message.maxAttachmentSizeMb', 25)).toEqual({ success: true });
    expect(settings.validate('logging.message.maxAttachmentSizeMb', 0)).toMatchObject({ success: false });
    expect(settings.validate('logging.member.roles', 'yes')).toMatchObject({ success: false });
  });
});
