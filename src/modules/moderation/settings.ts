import { z } from 'zod';

import type { AppConfig } from '../../core/config/types.js';
import type { ISettingMetadata } from '../../core/settings/types.js';

export function createModerationSettings(config: Readonly<AppConfig>): ISettingMetadata[] {
  return [
    {
      key: 'moderation.roles.administrator',
      label: 'Administrator Roles',
      description: 'Roles treated as bot administrators.',
      group: 'roles',
      category: 'Moderation',
      type: 'role',
      defaultValue: config.permissions.roles.administrator,
      defaultSource: 'config',
      validation: z.array(z.string()),
      order: 10,
      multiple: true,
      restartRequired: true,
    },
    {
      key: 'moderation.roles.moderator',
      label: 'Moderator Roles',
      description: 'Roles allowed to use moderation workflows.',
      group: 'roles',
      category: 'Moderation',
      type: 'role',
      defaultValue: config.permissions.roles.moderator,
      defaultSource: 'config',
      validation: z.array(z.string()),
      order: 20,
      multiple: true,
      restartRequired: true,
    },
    {
      key: 'moderation.roles.trusted',
      label: 'Trusted Roles',
      description: 'Roles trusted by moderation-related checks.',
      group: 'roles',
      category: 'Moderation',
      type: 'role',
      defaultValue: config.permissions.roles.trusted,
      defaultSource: 'config',
      validation: z.array(z.string()),
      order: 30,
      multiple: true,
      restartRequired: true,
    },
  ];
}
