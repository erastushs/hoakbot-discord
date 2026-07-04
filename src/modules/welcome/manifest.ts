import type { IModuleManifest } from '../manifest.types.js';

export const welcomeManifest: IModuleManifest = {
  id: 'welcome',
  name: 'Welcome',
  description: 'Member welcome messages and generated welcome cards.',
  icon: 'UserPlus',
  color: '#059669',
  category: 'engagement',
  version: '1.0.0',
  author: 'Erastus HS',
  settings: [
    'welcome.enabled',
    'welcome.channelId',
    'welcome.backgroundUrl',
    'welcome.message.title',
    'welcome.message.body',
    'welcome.image.title',
    'welcome.image.subtitle',
  ],
  permissions: [],
  commands: [],
  events: ['guildMemberAdd'],
  routes: ['/modules/welcome/settings', '/guilds/:guildId/settings'],
  dependencies: [],
  dashboard: {
    navigation: {
      sidebarPriority: 40,
      sidebarSection: 'Community',
    },
    homePage: {
      featured: true,
      priority: 40,
    },
    settings: {
      groups: [
        { key: 'general', label: 'General', order: 10 },
        { key: 'message', label: 'Message', order: 20 },
        { key: 'image', label: 'Image', order: 30 },
      ],
    },
  },
  tags: ['welcome', 'members'],
  supportsHotReload: false,
};
