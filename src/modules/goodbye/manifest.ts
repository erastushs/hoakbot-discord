import type { IModuleManifest } from '../manifest.types.js';

export const goodbyeManifest: IModuleManifest = {
  id: 'goodbye',
  name: 'Goodbye',
  description: 'Member goodbye messages and generated goodbye cards.',
  icon: 'UserMinus',
  color: '#dc2626',
  category: 'engagement',
  version: '1.0.0',
  author: 'Erastus HS',
  settings: [
    'goodbye.enabled',
    'goodbye.channelId',
    'goodbye.image.backgroundUrl',
    'goodbye.image.title',
    'goodbye.image.subtitle',
  ],
  permissions: [],
  commands: [],
  events: ['guildMemberRemove'],
  routes: ['/modules/goodbye/settings', '/guilds/:guildId/settings'],
  dependencies: [],
  dashboard: {
    navigation: {
      sidebarPriority: 50,
      sidebarSection: 'Community',
    },
    homePage: {
      featured: true,
      priority: 50,
    },
    settings: {
      groups: [
        { key: 'general', label: 'General', order: 10 },
        { key: 'image', label: 'Image', order: 20 },
      ],
    },
  },
  tags: ['goodbye', 'members'],
  supportsHotReload: false,
};
