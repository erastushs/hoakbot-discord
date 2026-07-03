import { z } from 'zod';

export const moduleCategorySchema = z.enum([
  'core',
  'moderation',
  'utility',
  'engagement',
  'voice',
  'logging',
  'fun',
  'economy',
  'automation',
  'integration',
]);

export const manifestSchema = z.object({
  id: z.string().min(1, 'Manifest id is required.'),
  name: z.string().min(1, 'Manifest name is required.'),
  description: z.string().min(1, 'Manifest description is required.'),
  icon: z.string().min(1, 'Manifest icon is required.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Manifest color must be a hex color.'),
  category: moduleCategorySchema,
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Manifest version must be SemVer-like.'),
  author: z.string().min(1, 'Manifest author is required.'),
  license: z.string().optional(),
  settings: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  events: z.array(z.string()).optional(),
  routes: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional(),
  migrations: z.array(z.string()).optional(),
  featureFlags: z.array(z.string()).optional(),
  healthChecks: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  dashboard: z
    .object({
      navigation: z.object({
        sidebarPriority: z.number().int(),
        sidebarSection: z.string().min(1),
        hidden: z.boolean().optional(),
      }),
      homePage: z.object({
        featured: z.boolean(),
        priority: z.number().int(),
        bannerUrl: z.string().optional(),
      }),
      settings: z.object({
        groups: z.array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            order: z.number().int().optional(),
            description: z.string().optional(),
          }),
        ),
      }),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  supportsHotReload: z.boolean(),
  requiredDiscordPermissions: z.string().optional(),
  documentation: z.string().optional(),
});
