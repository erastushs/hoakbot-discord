import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../src/core/config/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createModerationSettings, moderationManifest } from '../../src/modules/moderation/index.js';
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
    permissions: {
      roles: {
        administrator: ['Admin'],
        moderator: ['Moderator', 'Admin'],
        trusted: ['Trusted Member'],
      },
    },
    featureFlags: { modules: { moderation: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

describe('Moderation dashboard platform metadata', () => {
  it('registers a valid manifest and every configurable Moderation setting', () => {
    const manifests = new ManifestRegistry();
    const settings = new SettingsRegistry();

    manifests.register(moderationManifest);
    settings.register(moderationManifest.id, createModerationSettings(config()));

    expect(manifests.get('moderation')).toBe(moderationManifest);
    expect(settings.getByModule('moderation').map((setting) => setting.key)).toEqual(
      moderationManifest.settings,
    );
  });

  it('uses registry validation for Moderation settings', () => {
    const settings = new SettingsRegistry();
    settings.register(moderationManifest.id, createModerationSettings(config()));

    expect(settings.validate('moderation.roles.moderator', ['Moderator'])).toEqual({ success: true });
    expect(settings.validate('moderation.roles.moderator', 'Moderator')).toMatchObject({ success: false });
  });
});
