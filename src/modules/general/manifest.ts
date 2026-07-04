import type { IModuleManifest } from '../manifest.types.js';

export const generalManifest: IModuleManifest = {
  id: 'general',
  name: 'General',
  description: 'General command behavior and bot presentation settings.',
  icon: 'Bot',
  color: '#2563eb',
  category: 'utility',
  version: '1.0.0',
  author: 'Erastus HS',
  settings: [
    'general.prefix',
    'general.defaultLanguage',
    'general.presence.type',
    'general.presence.text',
    'general.cooldowns.global',
    'general.cooldowns.perUser',
  ],
  permissions: [],
  commands: ['ping', 'help', 'avatar', 'userinfo', 'serverinfo', 'botinfo'],
  events: ['interactionCreate', 'messageCreate'],
  routes: ['/modules/general/settings', '/guilds/:guildId/settings'],
  dependencies: [],
  dashboard: {
    navigation: {
      sidebarPriority: 10,
      sidebarSection: 'Utility',
    },
    homePage: {
      featured: true,
      priority: 10,
    },
    settings: {
      groups: [
        { key: 'commands', label: 'Commands', order: 10 },
        { key: 'presence', label: 'Presence', order: 20 },
        { key: 'cooldowns', label: 'Cooldowns', order: 30 },
      ],
    },
  },
  tags: ['utility', 'commands'],
  supportsHotReload: false,
};
