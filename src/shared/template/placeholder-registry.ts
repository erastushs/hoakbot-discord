import type { PlaceholderInfo } from './types.js';

const ALL: PlaceholderInfo[] = [
  {
    key: 'user',
    description: 'User mention tag (e.g. <@123456>)',
    example: '<@320660662323904525>',
    category: 'User',
  },
  {
    key: 'mention',
    description: 'User mention (same as user)',
    example: '<@320660662323904525>',
    category: 'User',
  },
  {
    key: 'username',
    description: 'Discord username',
    example: 'Erastus',
    category: 'User',
  },
  {
    key: 'display_name',
    description: 'Server display name',
    example: 'Erastus | Hoak',
    category: 'User',
  },
  {
    key: 'server',
    description: 'Server name',
    example: 'Hoak Family',
    category: 'Guild',
  },
  {
    key: 'membercount',
    description: 'Current member count',
    example: '126',
    category: 'Guild',
  },
  {
    key: 'created',
    description: 'User account creation date',
    example: '2021-01-01',
    category: 'User',
  },
  {
    key: 'joined',
    description: 'User server join date',
    example: '2021-01-01',
    category: 'User',
  },
];

const INDEX = new Map<string, PlaceholderInfo>();
for (const entry of ALL) {
  INDEX.set(entry.key, entry);
}

export class PlaceholderRegistry {
  getAll(): PlaceholderInfo[] {
    return ALL;
  }

  get(key: string): PlaceholderInfo | undefined {
    return INDEX.get(key);
  }

  categories(): string[] {
    return [...new Set(ALL.map((p) => p.category))];
  }
}
