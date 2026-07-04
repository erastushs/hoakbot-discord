import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../src/core/config/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createGoodbyeSettings, goodbyeManifest } from '../../src/modules/goodbye/index.js';
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
        enabled: true,
        channelId: 'goodbye-channel',
        image: {
          backgroundUrl: 'https://example.com/goodbye.png',
          title: 'GOODBYE',
          subtitle: 'HOPE YOU ENJOYED YOUR STAY',
        },
      },
    },
    permissions: { roles: { administrator: [], moderator: [], trusted: [] } },
    featureFlags: { modules: { goodbye: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

describe('Goodbye dashboard platform metadata', () => {
  it('registers a valid manifest and every configurable Goodbye setting', () => {
    const manifests = new ManifestRegistry();
    const settings = new SettingsRegistry();

    manifests.register(goodbyeManifest);
    settings.register(goodbyeManifest.id, createGoodbyeSettings(config()));

    expect(manifests.get('goodbye')).toBe(goodbyeManifest);
    expect(settings.getByModule('goodbye').map((setting) => setting.key)).toEqual(
      goodbyeManifest.settings,
    );
  });

  it('uses registry validation for Goodbye settings', () => {
    const settings = new SettingsRegistry();
    settings.register(goodbyeManifest.id, createGoodbyeSettings(config()));

    expect(settings.validate('goodbye.enabled', false)).toEqual({ success: true });
    expect(settings.validate('goodbye.image.title', 'SEE YOU')).toEqual({ success: true });
    expect(settings.validate('goodbye.enabled', 'no')).toMatchObject({ success: false });
  });
});
