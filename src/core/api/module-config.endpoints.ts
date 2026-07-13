import { z } from 'zod';

import { ConfigVersionConflictError, type IConfigProvider } from '../config/provider.types.js';
import type { GuildModuleStateRepository } from '../config/guild-module-state.repository.js';
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
import { getSettingsParamsSchema, patchModuleStateBodySchema, patchSettingsBodySchema } from './contract.schemas.js';
import type { APIEndpoint } from './types.js';
import { serializeDashboardModules } from './dashboard-metadata.serializer.js';
import type { DashboardStateEvents } from './dashboard-state.events.js';

const moduleParamsSchema = z.object({
  id: z.string().min(1),
});

export interface ModuleConfigEndpointDependencies {
  manifests: ManifestRegistry;
  settings: ISettingsRegistry;
  config: IConfigProvider;
  audit?: SecurityAuditService;
  dashboardProjections?: boolean;
  moduleStates?: GuildModuleStateRepository;
  stateEvents?: DashboardStateEvents;
  availableModuleIds?: () => ReadonlySet<string>;
}

export function createModuleConfigEndpoints({
  manifests,
  settings,
  config,
  audit,
  dashboardProjections = false,
  moduleStates,
  stateEvents,
  availableModuleIds,
}: ModuleConfigEndpointDependencies): APIEndpoint[] {
  const guildModules = async (guildId: string) => {
    const all = manifests.getAll();
    const states = dashboardProjections && moduleStates
      ? await moduleStates.getMany(guildId, all.map((manifest) => manifest.id))
      : new Map<string, boolean>();
    return serializeDashboardModules(all, states, availableModuleIds?.() ?? new Set(all.map((manifest) => manifest.id)));
  };

  const endpoints: APIEndpoint[] = [
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
      handler: async (request) => dashboardProjections && moduleStates
        ? ok<GetModulesResponse>({ modules: await guildModules(request.params?.guildId ?? ''), capabilities: { pluginDashboard: true, liveState: 'sse' } })
        : ok<GetModulesResponse>({ modules: manifests.getAll() }),
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
          version: await config.getVersion?.(guildId) ?? 0,
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
        const body = request.body as { settings: Record<string, unknown>; expectedVersion?: number };
        const entries = Object.entries(body.settings);

        for (const [key, value] of entries) {
          const validation = settings.validate(key, value);
          if (!validation.success) {
            return fail('VALIDATION_ERROR', validation.error ?? `Invalid value for "${key}".`, {
              key,
            });
          }
        }

        try {
          const result = await config.setMany(entries.map(([key, value]) => ({ key, value })), guildId, {
            expectedVersion: body.expectedVersion,
            changedBy: context.session?.userId,
            source: 'api',
          });
          for (const change of result?.changes ?? entries.map(([key, value]) => ({ key, oldValue: undefined, newValue: value }))) {
            audit?.recordConfigurationChange({
              guildId,
              module: change.key.split('.')[0] || 'unknown',
              key: change.key,
              oldValue: change.oldValue,
              newValue: change.newValue,
              userId: context.session?.userId,
              metadata: settings.get(change.key),
            }, request);
          }
          return ok<PatchSettingsResponse>({
            guildId,
            settings: entries.map(([key, value]) => ({ key, value })),
            version: result?.version ?? await config.getVersion?.(guildId) ?? 0,
          });
        } catch (error) {
          if (error instanceof ConfigVersionConflictError) {
            return fail('CONFLICT', 'Configuration changed concurrently. Refresh and retry.', {
              expectedVersion: error.expectedVersion,
              currentVersion: error.currentVersion,
              retryable: true,
            });
          }
          throw error;
        }
      },
    },
  ];

  if (dashboardProjections && moduleStates) {
    endpoints.push({
      module: 'platform', method: 'PATCH', path: '/guilds/:guildId/modules/:id', auth: 'guild_admin',
      params: getSettingsParamsSchema.extend({ id: z.string().min(1) }), body: patchModuleStateBodySchema,
      metadata: { operationId: 'patchGuildModuleState', tags: ['guilds', 'modules'] },
      handler: async (request, context) => {
        const guildId = request.params?.guildId ?? '';
        const moduleId = request.params?.id ?? '';
        const manifest = manifests.get(moduleId);
        if (!manifest) return fail('NOT_FOUND', `Module "${moduleId}" was not found.`);
        const body = request.body as { enabled: boolean; confirmDependents?: boolean };
        const modules = await guildModules(guildId);
        const current = new Map(modules.map((item) => [item.id, item.enabled]));
        const changed = new Map<string, boolean>([[moduleId, body.enabled]]);
        if (body.enabled) {
          const disabledDependencies = transitiveDependencies(moduleId, manifests).filter((id) => current.get(id) === false);
          if (disabledDependencies.length > 0) {
            return fail('CONFLICT', 'Required dependencies are disabled.', { dependencies: disabledDependencies });
          }
        } else {
          const dependentIds = new Set(transitiveDependents(moduleId, manifests));
          const dependents = modules.filter((item) => item.enabled && dependentIds.has(item.id)).map((item) => item.id);
          if (dependents.length > 0 && !body.confirmDependents) {
            return fail('CONFLICT', 'Enabled modules depend on this module.', { dependents, confirmationRequired: true });
          }
          for (const dependent of dependents) changed.set(dependent, false);
        }
        const persisted = await moduleStates.setMany(guildId, changed, current);
        if (!persisted) return fail('CONFLICT', 'Module state changed concurrently. Refresh and retry.', { retryable: true });
        audit?.recordModuleStateChange({
          guildId,
          moduleId,
          oldEnabled: current.get(moduleId) ?? true,
          newEnabled: body.enabled,
          affectedDependents: [...changed.keys()].filter((id) => id !== moduleId),
          userId: context.session?.userId,
        }, request);
        stateEvents?.publish({ guildId, moduleIds: [...changed.keys()] });
        const nextModules = await guildModules(guildId);
        return ok({ guildId, module: nextModules.find((item) => item.id === moduleId)! });
      },
    });
  }

  return endpoints;
}

function transitiveDependencies(moduleId: string, manifests: ManifestRegistry): string[] {
  const result = new Set<string>();
  const visit = (id: string) => {
    for (const dependency of manifests.get(id)?.dependencies ?? []) {
      if (!result.has(dependency)) {
        result.add(dependency);
        visit(dependency);
      }
    }
  };
  visit(moduleId);
  return [...result];
}

function transitiveDependents(moduleId: string, manifests: ManifestRegistry): string[] {
  const result = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const manifest of manifests.getAll()) {
      if (!result.has(manifest.id) && (manifest.dependencies ?? []).some((dependency) => dependency === moduleId || result.has(dependency))) {
        result.add(manifest.id);
        changed = true;
      }
    }
  }
  return [...result];
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
