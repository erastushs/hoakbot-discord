import type { GuildSummary, ModuleManifest, SettingMetadata } from '../src/contracts.js';

export const manifests: ModuleManifest[] = [
  {
    id: 'module:alpha',
    name: 'Alpha',
    description: 'First generic module.',
    icon: 'Box',
    color: '#2563eb',
    category: 'utility',
    version: '1.0.0',
    author: 'Test',
    supportsHotReload: true,
    dashboard: {
      navigation: { sidebarPriority: 2, sidebarSection: 'General' },
      homePage: { featured: true, priority: 2 },
      settings: { groups: [] },
    },
  },
  {
    id: 'module:beta',
    name: 'Beta',
    description: 'Second generic module.',
    icon: 'Box',
    color: '#059669',
    category: 'automation',
    version: '1.0.0',
    author: 'Test',
    supportsHotReload: false,
    dashboard: {
      navigation: { sidebarPriority: 1, sidebarSection: 'General' },
      homePage: { featured: true, priority: 1 },
      settings: { groups: [] },
    },
  },
];

export const guilds: GuildSummary[] = [
  { id: 'guild-1', name: 'Guild One' },
  { id: 'guild-2', name: 'Guild Two' },
];

export const settings: SettingMetadata[] = [
  {
    key: 'generic.enabled',
    label: 'Enabled',
    description: 'Generic switch.',
    group: 'general',
    category: 'General',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'generic.title',
    label: 'Title',
    description: 'Generic text.',
    group: 'general',
    category: 'General',
    type: 'string',
    defaultValue: 'Hello',
  },
  {
    key: 'generic.count',
    label: 'Count',
    description: 'Generic number.',
    group: 'general',
    category: 'General',
    type: 'number',
    defaultValue: 3,
  },
  {
    key: 'generic.mode',
    label: 'Mode',
    description: 'Generic select.',
    group: 'general',
    category: 'General',
    type: 'select',
    defaultValue: 'a',
    options: [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ],
  },
  {
    key: 'generic.body',
    label: 'Body',
    description: 'Generic textarea.',
    group: 'general',
    category: 'General',
    type: 'text',
    defaultValue: 'Body',
  },
  {
    key: 'generic.channel',
    label: 'Channel',
    description: 'Generic channel placeholder.',
    group: 'general',
    category: 'General',
    type: 'channel',
    defaultValue: '',
  },
  {
    key: 'generic.role',
    label: 'Role',
    description: 'Generic role placeholder.',
    group: 'general',
    category: 'General',
    type: 'role',
    defaultValue: '',
  },
];
