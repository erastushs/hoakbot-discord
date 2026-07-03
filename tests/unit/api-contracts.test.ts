import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  getModuleParamsSchema,
  getSettingsParamsSchema,
  paginationQuerySchema,
  patchSettingsBodySchema,
} from '../../src/core/api/contract.schemas.js';
import type {
  GetManifestsResponse,
  GetMetadataResponse,
  GetModulesResponse,
  GetSettingsResponse,
  PatchSettingsRequest,
  PatchSettingsResponse,
} from '../../src/core/api/contracts.js';

describe('configuration API contracts', () => {
  it('defines settings request and response contracts', () => {
    const patch = {
      guildId: 'guild-1',
      settings: { 'voice.volume': 50 },
      expectedVersion: 2,
    } satisfies PatchSettingsRequest;
    const response = {
      guildId: 'guild-1',
      settings: [{ key: 'voice.volume', value: 50, version: 3 }],
      version: 3,
    } satisfies PatchSettingsResponse;

    expect(patch.settings['voice.volume']).toBe(50);
    expect(response.version).toBe(3);
    expectTypeOf<GetSettingsResponse>().toMatchTypeOf<{ guildId: string; settings: unknown[] }>();
  });

  it('defines manifest, module, and metadata response contracts', () => {
    expectTypeOf<GetManifestsResponse>().toMatchTypeOf<GetModulesResponse>();
    expectTypeOf<GetMetadataResponse>().toMatchTypeOf<{ settings: unknown[] }>();
  });

  it('provides schemas for future endpoint validation', () => {
    expect(getSettingsParamsSchema.parse({ guildId: 'guild-1' })).toEqual({ guildId: 'guild-1' });
    expect(getModuleParamsSchema.parse({ moduleId: 'hoak:voice' })).toEqual({ moduleId: 'hoak:voice' });
    expect(patchSettingsBodySchema.parse({ settings: { 'voice.volume': 1 } })).toEqual({
      settings: { 'voice.volume': 1 },
    });
    expect(paginationQuerySchema.parse({ page: '2', pageSize: '25' })).toEqual({ page: 2, pageSize: 25 });
  });
});
