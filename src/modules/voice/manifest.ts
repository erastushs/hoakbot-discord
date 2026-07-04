import type { IModuleManifest } from '../manifest.types.js';

export const voiceManifest: IModuleManifest = {
  id: 'voice',
  name: 'Voice',
  description: 'Voice channel automation and join sound playback settings.',
  icon: 'Headphones',
  color: '#7c3aed',
  category: 'voice',
  version: '1.0.0',
  author: 'Erastus HS',
  settings: [
    'voice.standbyChannelId',
    'voice.maxReconnectRetries',
    'voice.defaultSound',
    'voice.volume',
    'voice.joinDelayMs',
    'voice.cooldownMs',
    'voice.reconnectDelayMs',
  ],
  permissions: [],
  commands: [],
  events: ['bot.ready', 'voice.memberJoined', 'voiceStateUpdate'],
  routes: ['/modules/voice/settings', '/guilds/:guildId/settings'],
  dependencies: [],
  dashboard: {
    navigation: {
      sidebarPriority: 20,
      sidebarSection: 'Voice',
    },
    homePage: {
      featured: true,
      priority: 20,
    },
    settings: {
      groups: [
        { key: 'connection', label: 'Connection', order: 10 },
        { key: 'playback', label: 'Playback', order: 20 },
        { key: 'timing', label: 'Timing', order: 30 },
      ],
    },
  },
  tags: ['voice', 'audio'],
  supportsHotReload: false,
};
