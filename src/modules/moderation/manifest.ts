import type { IModuleManifest } from '../manifest.types.js';

export const moderationManifest: IModuleManifest = {
  id: 'moderation',
  name: 'Moderation',
  description: 'Moderation commands, warnings, and role-based moderation access.',
  icon: 'ShieldCheck',
  color: '#ea580c',
  category: 'moderation',
  version: '1.0.0',
  author: 'Erastus HS',
  settings: [
    'moderation.roles.administrator',
    'moderation.roles.moderator',
    'moderation.roles.trusted',
  ],
  permissions: ['KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages'],
  commands: ['clean', 'kick', 'ban', 'timeout', 'warn', 'warnings', 'warn-remove', 'warn-clear'],
  events: ['moderation.action', 'moderation.warningIssued'],
  routes: ['/modules/moderation/settings', '/guilds/:guildId/settings'],
  dependencies: [],
  dashboard: {
    navigation: {
      sidebarPriority: 60,
      sidebarSection: 'Operations',
    },
    homePage: {
      featured: true,
      priority: 60,
    },
    settings: {
      groups: [{ key: 'roles', label: 'Roles', order: 10 }],
    },
  },
  tags: ['moderation', 'commands', 'warnings'],
  supportsHotReload: false,
};
