import type { DashboardUser, GuildSummary, ModuleManifest, SettingMetadata } from '../contracts.js';

export const mockUser: DashboardUser = {
  id: 'demo-user',
  username: 'Demo Admin',
};

export const mockGuilds: GuildSummary[] = [
  { id: 'guild-alpha', name: 'Alpha Guild' },
  { id: 'guild-beta', name: 'Beta Guild' },
];

export const mockManifests: ModuleManifest[] = [
  {
    id: 'module:automation',
    name: 'Automation',
    description: 'Automated workflows and scheduled actions.',
    icon: 'Workflow',
    color: '#2563eb',
    category: 'automation',
    version: '1.0.0',
    author: 'Hoak',
    dashboard: {
      navigation: { sidebarPriority: 20, sidebarSection: 'Operations' },
      homePage: { featured: true, priority: 10 },
      settings: { groups: [{ key: 'general', label: 'General' }] },
    },
    supportsHotReload: true,
  },
  {
    id: 'module:community',
    name: 'Community',
    description: 'Member experience and community utilities.',
    icon: 'Users',
    color: '#059669',
    category: 'engagement',
    version: '1.0.0',
    author: 'Hoak',
    dashboard: {
      navigation: { sidebarPriority: 10, sidebarSection: 'Community' },
      homePage: { featured: true, priority: 5 },
      settings: { groups: [{ key: 'general', label: 'General' }] },
    },
    supportsHotReload: false,
  },
];

export const mockSettings: SettingMetadata[] = [
  {
    key: 'demo.enabled',
    label: 'Enabled',
    description: 'Toggle a generic feature.',
    group: 'general',
    category: 'General',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'demo.message',
    label: 'Message',
    description: 'Text value used by a module.',
    group: 'general',
    category: 'General',
    type: 'text',
    defaultValue: '',
    placeholder: 'Type a message',
  },
];
