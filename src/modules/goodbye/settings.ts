import { z } from 'zod';

import type { AppConfig } from '../../core/config/types.js';
import type { ISettingMetadata } from '../../core/settings/types.js';

export function createGoodbyeSettings(config: Readonly<AppConfig>): ISettingMetadata[] {
  return [
    {
      key: 'goodbye.enabled',
      label: 'Goodbye Enabled',
      description: 'Enable or disable goodbye messages for departing members.',
      group: 'general',
      category: 'Goodbye',
      type: 'boolean',
      defaultValue: config.bot.goodbye.enabled,
      defaultSource: 'config',
      validation: z.boolean(),
      order: 10,
      restartRequired: true,
    },
    {
      key: 'goodbye.channelId',
      label: 'Goodbye Channel',
      description: 'Text channel where goodbye messages are sent.',
      group: 'general',
      category: 'Goodbye',
      type: 'channel',
      defaultValue: config.bot.goodbye.channelId,
      defaultSource: 'config',
      validation: z.string(),
      order: 20,
      restartRequired: true,
    },
    {
      key: 'goodbye.image.backgroundUrl',
      label: 'Background Image',
      description: 'Image URL used as the goodbye card background.',
      group: 'image',
      category: 'Goodbye',
      type: 'image',
      defaultValue: config.bot.goodbye.image.backgroundUrl,
      defaultSource: 'config',
      validation: z.string(),
      order: 10,
      restartRequired: true,
    },
    {
      key: 'goodbye.image.title',
      label: 'Image Title',
      description: 'Large title rendered on the goodbye card.',
      group: 'image',
      category: 'Goodbye',
      type: 'template',
      defaultValue: config.bot.goodbye.image.title,
      defaultSource: 'config',
      validation: z.string(),
      order: 20,
      restartRequired: true,
    },
    {
      key: 'goodbye.image.subtitle',
      label: 'Image Subtitle',
      description: 'Subtitle rendered on the goodbye card.',
      group: 'image',
      category: 'Goodbye',
      type: 'template',
      defaultValue: config.bot.goodbye.image.subtitle,
      defaultSource: 'config',
      validation: z.string(),
      order: 30,
      restartRequired: true,
    },
  ];
}
