import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../src/core/config/types.js';
import { SettingsRegistry } from '../../src/core/settings/settings-registry.js';
import { ManifestRegistry } from '../../src/modules/manifest-registry.js';
import { createVoiceSettings, voiceManifest } from '../../src/modules/voice/index.js';

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
        standbyChannelId: 'voice-1',
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
    featureFlags: { modules: { voice: true } },
    discord: { token: 'token', clientId: 'client' },
    databaseUrl: 'postgres://localhost/db',
    env: { nodeEnv: 'development', logLevel: 'info' },
    guildId: 'guild-1',
    ownerIds: [],
  };
}

describe('Voice dashboard platform metadata', () => {
  it('registers a valid manifest and every configurable Voice setting', () => {
    const manifests = new ManifestRegistry();
    const settings = new SettingsRegistry();

    manifests.register(voiceManifest);
    settings.register(voiceManifest.id, createVoiceSettings(config()));

    expect(manifests.get('voice')).toBe(voiceManifest);
    expect(settings.getByModule('voice').map((setting) => setting.key)).toEqual(
      voiceManifest.settings,
    );
  });

  it('uses registry validation for Voice settings', () => {
    const settings = new SettingsRegistry();
    settings.register(voiceManifest.id, createVoiceSettings(config()));

    expect(settings.validate('voice.volume', 1.5)).toEqual({ success: true });
    expect(settings.validate('voice.volume', 3)).toMatchObject({ success: false });
    expect(settings.validate('voice.joinDelayMs', -1)).toMatchObject({ success: false });
    expect(settings.validate('voice.defaultSound', '')).toMatchObject({ success: false });
  });
});
