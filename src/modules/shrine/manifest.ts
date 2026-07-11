import type { IModuleManifest } from '../manifest.types.js';

export const shrineManifest: IModuleManifest = {
  id: 'shrine',
  name: 'Shrine of Secrets',
  description: 'Automatic Dead by Daylight Shrine of Secrets announcements powered by NightLight.',
  icon: 'Sparkles',
  color: '#ef4444',
  category: 'engagement',
  version: '3.2.1',
  author: 'Erastus HS',
  settings: [
    'shrine.enabled',
    'shrine.guildId',
    'shrine.channelId',
    'shrine.nightLightBaseUrl',
    'shrine.imageCdnUrl',
    'shrine.polling.pollIntervalMs',
    'shrine.polling.preResetWindowMs',
    'shrine.polling.delayedUpdateWindowMs',
    'shrine.polling.fallbackRetryMs',
    'shrine.dev.forceAnnouncementOnStartup',
  ],
  permissions: [],
  commands: [],
  events: ['shrine.updated'],
  routes: ['/modules/shrine/settings', '/guilds/:guildId/settings'],
  dependencies: [],
  dashboard: {
    navigation: {
      sidebarPriority: 65,
      sidebarSection: 'Community',
    },
    homePage: {
      featured: false,
      priority: 65,
    },
    settings: {
      groups: [
        { key: 'general', label: 'General', order: 10 },
        { key: 'api', label: 'NightLight API', order: 20 },
        { key: 'polling', label: 'Polling', order: 30 },
        { key: 'dev', label: 'Development', order: 40 },
      ],
    },
  },
  tags: ['dead-by-daylight', 'shrine', 'nightlight'],
  supportsHotReload: false,
};
