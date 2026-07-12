import { z } from 'zod';

const identifier = z.string().min(1).regex(/^[a-z0-9][a-z0-9:._/-]*$/);
const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
const dependency = z.object({ id: identifier, range: z.string().min(1) }).strict();
const capabilityName = z.string().min(1);
const capabilities = z
  .object({
    settings: z.array(capabilityName).default([]),
    commands: z.array(capabilityName).default([]),
    events: z.array(capabilityName).default([]),
    routes: z.array(capabilityName).default([]),
    permissions: z.array(capabilityName).default([]),
  })
  .strict()
  .default({});

export const pluginManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifier,
    name: z.string().min(1),
    description: z.string().min(1),
    version: semver,
    dependencies: z.array(dependency).default([]),
    capabilities,
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();
