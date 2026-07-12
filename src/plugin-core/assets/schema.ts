import { z } from 'zod';

const ownershipSchema = z.object({
  copyright: z.string().min(1),
  license: z.string().min(1),
  attribution: z.string().min(1),
});

const baseSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9./-]*$/),
  owner: z.string().regex(/^[a-z][a-z0-9-]*$/),
  source: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mime: z.string().min(1),
  bytes: z.number().int().positive(),
  consumer: z.array(z.string().min(1)).min(1),
  ownership: ownershipSchema,
});

const imageSchema = baseSchema.extend({
  type: z.literal('texture'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  maxBytes: z.number().int().positive(),
  maxWidth: z.number().int().positive(),
  maxHeight: z.number().int().positive(),
});

const soundSchema = baseSchema.extend({
  type: z.literal('sound'),
  durationMs: z.number().int().positive(),
  maxDurationMs: z.number().int().positive(),
  maxBytes: z.number().int().positive(),
});

const fontSchema = baseSchema.extend({
  type: z.literal('font'),
  family: z.string().min(1),
  style: z.enum(['normal', 'italic', 'oblique']),
  weight: z.number().int().min(1).max(1000),
  maxBytes: z.number().int().positive(),
});

export const assetDescriptorSchema = z.discriminatedUnion('type', [imageSchema, soundSchema, fontSchema]);
export const assetManifestSchema = z.array(assetDescriptorSchema).superRefine((assets, context) => {
  const ids = new Set<string>();
  for (const asset of assets) {
    if (!asset.id.startsWith(`${asset.owner}:`)) context.addIssue({ code: 'custom', message: `Asset ${asset.id} is outside owner namespace` });
    if (ids.has(asset.id)) context.addIssue({ code: 'custom', message: `Duplicate asset ID: ${asset.id}` });
    ids.add(asset.id);
  }
});

export type AssetDescriptor = z.infer<typeof assetDescriptorSchema>;
export type AssetManifest = readonly AssetDescriptor[];
