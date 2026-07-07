import { z } from 'zod';

import type { IConfigProvider } from '../config/provider.types.js';
import type { ISettingMetadata, ISettingsRegistry } from '../settings/types.js';
import type { ManifestRegistry } from '../../modules/manifest-registry.js';
import { ok, fail } from './responses.js';
import type { SecurityAuditService } from './security-audit.service.js';
import type {
  GetManifestsResponse,
  GetMetadataResponse,
  GetModulesResponse,
  GetSettingsResponse,
  PatchSettingsResponse,
  SettingMetadataContract,
  SettingValueContract,
} from './contracts.js';
import { getSettingsParamsSchema, patchSettingsBodySchema } from './contract.schemas.js';
import type { APIEndpoint } from './types.js';

const moduleParamsSchema = z.object({
  id: z.string().min(1),
});

export interface ModuleConfigEndpointDependencies {
  manifests: ManifestRegistry;
  settings: ISettingsRegistry;
  config: IConfigProvider;
  audit?: SecurityAuditService;
}

export function createModuleConfigEndpoints({
  manifests,
  settings,
  config,
  audit,
}: ModuleConfigEndpointDependencies): APIEndpoint[] {
  return [
    {
      module: 'platform',
      method: 'GET',
      path: '/modules',
      auth: 'public',
      metadata: { operationId: 'getModuleManifests', tags: ['modules'] },
      handler: async () => ok<GetManifestsResponse>({ manifests: manifests.getAll() }),
    },
    {
      module: 'platform',
      method: 'GET',
      path: '/modules/:id',
      auth: 'public',
      params: moduleParamsSchema,
      metadata: { operationId: 'getModuleManifest', tags: ['modules'] },
      handler: async (request) => {
        const manifest = manifests.get(request.params?.id ?? '');
        if (!manifest) {
          return fail('NOT_FOUND', `Module "${request.params?.id}" was not found.`);
        }

        return ok({ manifest });
      },
    },
    {
      module: 'platform',
      method: 'GET',
      path: '/modules/:id/settings',
      auth: 'public',
      params: moduleParamsSchema,
      metadata: { operationId: 'getModuleSettingsMetadata', tags: ['modules', 'settings'] },
      handler: async (request) => {
        const moduleId = request.params?.id ?? '';
        if (!manifests.get(moduleId)) {
          return fail('NOT_FOUND', `Module "${moduleId}" was not found.`);
        }

        return ok<GetMetadataResponse>({
          settings: settings.getByModule(moduleId).map(toMetadataContract),
        });
      },
    },
    {
      module: 'platform',
      method: 'GET',
      path: '/guilds/:guildId/modules',
      auth: 'guild_member',
      params: getSettingsParamsSchema,
      metadata: { operationId: 'getGuildModules', tags: ['guilds', 'modules'] },
      handler: async () => ok<GetModulesResponse>({ modules: manifests.getAll() }),
    },
    {
      module: 'platform',
      method: 'GET',
      path: '/guilds/:guildId/settings',
      auth: 'guild_member',
      params: getSettingsParamsSchema,
      metadata: { operationId: 'getGuildSettings', tags: ['guilds', 'settings'] },
      handler: async (request) => {
        const guildId = request.params?.guildId ?? '';
        const metadata = settings.getAll();
        const values = await config.getMany(metadata.map((setting) => setting.key), guildId);

        return ok<GetSettingsResponse>({
          guildId,
          settings: metadata.map((setting) => toSettingValue(setting, values[setting.key])),
        });
      },
    },
    {
      module: 'platform',
      method: 'PATCH',
      path: '/guilds/:guildId/settings',
      auth: 'guild_admin',
      params: getSettingsParamsSchema,
      body: patchSettingsBodySchema,
      metadata: { operationId: 'patchGuildSettings', tags: ['guilds', 'settings'] },
      handler: async (request, context) => {
        const guildId = request.params?.guildId ?? '';
        const body = request.body as { settings: Record<string, unknown> };
        const entries = Object.entries(body.settings);

        for (const [key, value] of entries) {
          const validation = settings.validate(key, value);
          if (!validation.success) {
            return fail('VALIDATION_ERROR', validation.error ?? `Invalid value for "${key}".`, {
              key,
            });
          }
        }

        const oldValues = await config.getMany(entries.map(([key]) => key), guildId);
        await config.setMany(entries.map(([key, value]) => ({ key, value })), guildId);

        for (const [key, value] of entries) {
          const metadata = settings.get(key);
          audit?.recordConfigurationChange({
            guildId,
            module: moduleIdFromSettingKey(key),
            key,
            oldValue: oldValues[key],
            newValue: value,
            userId: context.session?.userId,
            metadata,
          }, request);
        }

        return ok<PatchSettingsResponse>({
          guildId,
          settings: entries.map(([key, value]) => ({ key, value })),
        });
      },
    },
  ];
}

function moduleIdFromSettingKey(key: string): string {
  return key.split('.')[0] || 'unknown';
}

function toSettingValue(setting: ISettingMetadata, value: unknown): SettingValueContract {
  return {
    key: setting.key,
    value: value ?? setting.defaultValue,
  };
}

function toMetadataContract(setting: ISettingMetadata): SettingMetadataContract {
  const contract = { ...setting } as Omit<ISettingMetadata, 'validation'> & {
    validation?: ISettingMetadata['validation'];
  };
  delete contract.validation;

  return {
    ...contract,
    validationSchema: toValidationSchema(setting),
  };
}

function toValidationSchema(setting: ISettingMetadata): Record<string, unknown> | undefined {
  const schema: Record<string, unknown> = {};

  if (setting.type === 'number' || setting.type === 'duration') {
    schema.type = 'number';
    if (setting.min !== undefined) schema.minimum = setting.min;
    if (setting.max !== undefined) schema.maximum = setting.max;
  } else if (setting.type === 'boolean') {
    schema.type = 'boolean';
  } else {
    schema.type = 'string';
    if (setting.minLength !== undefined) schema.minLength = setting.minLength;
    if (setting.maxLength !== undefined) schema.maxLength = setting.maxLength;
    if (setting.pattern !== undefined) schema.pattern = setting.pattern;
    if (setting.options) schema.enum = setting.options.map((option) => option.value);
  }

  return Object.keys(schema).length === 0 ? undefined : schema;
}
