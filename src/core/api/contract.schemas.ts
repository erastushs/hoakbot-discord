import { z } from 'zod';

export const getSettingsParamsSchema = z.object({
  guildId: z.string().min(1),
});

export const patchSettingsParamsSchema = getSettingsParamsSchema;

export const patchSettingsBodySchema = z.object({
  settings: z.record(z.string(), z.unknown()),
  expectedVersion: z.number().int().positive().optional(),
});

export const patchModuleStateBodySchema = z.object({
  enabled: z.boolean(),
  confirmDependents: z.boolean().optional(),
});

export const getModuleParamsSchema = z.object({
  moduleId: z.string().min(1),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
