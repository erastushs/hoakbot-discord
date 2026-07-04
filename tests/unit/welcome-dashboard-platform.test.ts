import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../src/core/config/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { createWelcomeSettings, welcomeManifest } from '../../src/modules/welcome/index.js';
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
        enabled: true,
        channelId: 'welcome-channel',
        backgroundUrl: 'https://example.com/welcome.png',
        message: { title: 'Welcome to {server}', body: ['Hello {mention}'] },
        image: { title: 'WELCOME', subtitle: 'TO {server}' },
      },
      goodbye: {
        enabled: false,
        channelId: '',
        image: { backgroundUrl: '', title: '', subtitle: '' },
      },
    },
    permissions: { roles: { administrator: [], moderator: [], trusted: [] } },
    featureFlags: { modules: { welcome: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

describe('Welcome dashboard platform metadata', () => {
  it('registers a valid manifest and every configurable Welcome setting', () => {
    const manifests = new ManifestRegistry();
    const settings = new SettingsRegistry();

    manifests.register(welcomeManifest);
    settings.register(welcomeManifest.id, createWelcomeSettings(config()));

    expect(manifests.get('welcome')).toBe(welcomeManifest);
    expect(settings.getByModule('welcome').map((setting) => setting.key)).toEqual(
      welcomeManifest.settings,
    );
  });

  it('uses registry validation for Welcome settings', () => {
    const settings = new SettingsRegistry();
    settings.register(welcomeManifest.id, createWelcomeSettings(config()));

    expect(settings.validate('welcome.enabled', false)).toEqual({ success: true });
    expect(settings.validate('welcome.message.body', ['Hello'])).toEqual({ success: true });
    expect(settings.validate('welcome.message.body', 'Hello')).toMatchObject({ success: false });
  });
});
