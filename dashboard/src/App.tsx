import { useCallback, useEffect, useMemo, useState } from 'react';

import { APIClient, DashboardAPIError } from './api/client.js';
import { AuthGuard } from './auth/AuthGuard.js';
import { AuthProvider } from './auth/AuthContext.js';
import { GuildProvider } from './guilds/GuildContext.js';
import { DashboardHome } from './home/DashboardHome.js';
import { DashboardLayout } from './layout/DashboardLayout.js';
import { ThemeProvider } from './layout/ThemeProvider.js';
import { ModulePage } from './modules/ModulePage.js';
import type { GuildSummary, ModuleManifest, SettingMetadata } from './contracts.js';

interface DashboardState {
  status: 'loading' | 'ready' | 'error';
  manifests: ModuleManifest[];
  settings: SettingMetadata[];
  values: Record<string, unknown>;
  error?: string;
}

export function App() {
  const moduleId = getModuleIdFromPath(window.location.pathname);
  const api = useMemo(() => new APIClient(), []);
  const guild = useMemo(() => resolveGuild(), []);
  const [state, setState] = useState<DashboardState>({
    status: 'loading',
    manifests: [],
    settings: [],
    values: {},
  });

  const loadDashboard = useCallback(async () => {
    console.debug('[dashboard-app] loadDashboard:start', { guild, moduleId });
    let failingStatement = 'loadDashboard:start';
    let actualResponseObject: unknown;
    let expectedResponseObject: unknown;

    if (!guild) {
      const nextState: DashboardState = {
        status: 'error',
        manifests: [],
        settings: [],
        values: {},
        error: 'Set VITE_GUILD_ID or open the dashboard with ?guildId=<discord-guild-id>.',
      };
      console.debug('[dashboard-app] loadDashboard:missingGuild', {
        failingStatement: 'resolveGuild()',
        thrownException: { name: 'MissingGuildError', message: 'Missing guild id' },
        actualResponseObject: guild,
        expectedResponseObject: { id: 'discord-guild-id', name: 'display name' },
        moduleId,
      });
      logStateUpdate('missing guild', nextState, moduleId);
      setState(nextState);
      return;
    }

    setState((current) => {
      const nextState: DashboardState = { ...current, status: 'loading', error: undefined };
      logStateUpdate('loading', nextState, moduleId);
      return nextState;
    });

    try {
      failingStatement = 'await api.getGuildModules(guild.id)';
      expectedResponseObject = { modules: 'ModuleManifest[]' };
      console.debug('[dashboard-app] loadDashboard:await:start', {
        statement: failingStatement,
        guildId: guild.id,
        expectedResponseObject,
      });
      const modulesResponse = await api.getGuildModules(guild.id);
      actualResponseObject = modulesResponse;
      console.debug('[dashboard-app] loadDashboard:await:return', {
        statement: failingStatement,
        returnedValue: modulesResponse,
        parsedJson: modulesResponse,
        objectShape: describeShape(modulesResponse),
        expectedResponseObject,
      });
      assertResponseShape(
        'api.getGuildModules(guild.id)',
        modulesResponse,
        expectedResponseObject,
        (value): value is { modules: ModuleManifest[] } =>
          isRecord(value) && Array.isArray(value['modules']),
      );
      const { modules } = modulesResponse;

      failingStatement = moduleId
        ? 'await api.getModuleSettings(moduleId)'
        : 'await Promise.resolve({ settings: [] })';
      expectedResponseObject = { settings: 'SettingMetadata[]' };
      console.debug('[dashboard-app] loadDashboard:await:start', {
        statement: failingStatement,
        moduleId,
        expectedResponseObject,
      });
      const metadataResponse = moduleId ? await api.getModuleSettings(moduleId) : await Promise.resolve({ settings: [] });
      actualResponseObject = metadataResponse;
      console.debug('[dashboard-app] loadDashboard:await:return', {
        statement: failingStatement,
        returnedValue: metadataResponse,
        parsedJson: metadataResponse,
        objectShape: describeShape(metadataResponse),
        expectedResponseObject,
      });
      assertResponseShape(
        'api.getModuleSettings(moduleId)',
        metadataResponse,
        expectedResponseObject,
        (value): value is { settings: SettingMetadata[] } =>
          isRecord(value) && Array.isArray(value['settings']),
      );
      const { settings } = metadataResponse;

      const manifest = moduleId ? modules.find((candidate) => candidate.id === moduleId) : undefined;

      if (moduleId && !manifest) {
        const nextState: DashboardState = {
          status: 'error',
          manifests: modules,
          settings: [],
          values: {},
          error: `Module "${moduleId}" was not found by the backend.`,
        };
        console.debug('[dashboard-app] loadDashboard:moduleNotFound', {
          failingStatement: 'modules.find((candidate) => candidate.id === moduleId)',
          thrownException: {
            name: 'ModuleNotFoundError',
            message: `Module "${moduleId}" was not found by the backend.`,
          },
          actualResponseObject: modulesResponse,
          expectedResponseObject: {
            modules: `ModuleManifest[] containing id "${moduleId}"`,
          },
          moduleId,
          objectShape: describeShape(modulesResponse),
        });
        logStateUpdate('module not found', nextState, moduleId);
        setState(nextState);
        return;
      }

      failingStatement = moduleId
        ? 'await api.getGuildSettings(guild.id)'
        : 'await Promise.resolve(undefined)';
      expectedResponseObject = moduleId
        ? { guildId: 'string', settings: 'SettingValue[]' }
        : undefined;
      console.debug('[dashboard-app] loadDashboard:await:start', {
        statement: failingStatement,
        guildId: guild.id,
        moduleId,
        expectedResponseObject,
      });
      const valuesResponse = moduleId ? await api.getGuildSettings(guild.id) : await Promise.resolve(undefined);
      actualResponseObject = valuesResponse;
      console.debug('[dashboard-app] loadDashboard:await:return', {
        statement: failingStatement,
        returnedValue: valuesResponse,
        parsedJson: valuesResponse,
        objectShape: describeShape(valuesResponse),
        expectedResponseObject,
      });
      if (moduleId) {
        assertResponseShape(
          'api.getGuildSettings(guild.id)',
          valuesResponse,
          expectedResponseObject,
          (value): value is { guildId: string; settings: { key: string; value: unknown }[] } =>
            isRecord(value) && typeof value['guildId'] === 'string' && Array.isArray(value['settings']),
        );
      }

      const nextState: DashboardState = {
        status: 'ready',
        manifests: modules,
        settings,
        values: Object.fromEntries(valuesResponse?.settings.map((setting) => [setting.key, setting.value]) ?? []),
      };
      logStateUpdate('ready', nextState, moduleId);
      setState(nextState);
      console.debug('[dashboard-app] loadDashboard:ready', {
        moduleCount: modules.length,
        settingCount: settings.length,
        settingValueCount: valuesResponse?.settings.length ?? 0,
      });
    } catch (error) {
      const nextState: DashboardState = {
        status: 'error',
        manifests: [],
        settings: [],
        values: {},
        error: toErrorMessage(error),
      };
      console.error('[dashboard-app] loadDashboard:failed', {
        failingStatement,
        thrownException: serializeError(error),
        actualResponseObject,
        actualObjectShape: describeShape(actualResponseObject),
        expectedResponseObject,
      });
      logStateUpdate('error', nextState, moduleId);
      setState(nextState);
    }
  }, [api, guild, moduleId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const saveSettings = useCallback(
    async (settings: Record<string, unknown>) => {
      if (!guild) {
        throw new Error('A guild id is required before settings can be saved.');
      }

      const response = await api.patchGuildSettings(guild.id, settings);
      setState((current) => ({
        ...current,
        values: {
          ...current.values,
          ...Object.fromEntries(response.settings.map((setting) => [setting.key, setting.value])),
        },
      }));
    },
    [api, guild],
  );

  const manifest = moduleId
    ? state.manifests.find((candidate) => candidate.id === moduleId)
    : undefined;
  const breadcrumb = manifest ? [{ label: 'Home' }, { label: manifest.name }] : [{ label: 'Home' }];
  const guilds = guild ? [guild] : [];

  return (
    <ThemeProvider>
      <AuthProvider>
        <GuildProvider guilds={guilds}>
          <AuthGuard>
            <DashboardLayout breadcrumb={breadcrumb} manifests={state.manifests}>
              {state.status === 'loading' ? (
                <DashboardStateMessage title="Loading dashboard" message="Loading platform data from the backend." />
              ) : state.status === 'error' ? (
                <DashboardStateMessage
                  actionLabel="Retry"
                  message={state.error ?? 'The dashboard could not load platform data.'}
                  onAction={() => void loadDashboard()}
                  title="Dashboard unavailable"
                />
              ) : manifest ? (
                <ModulePage
                  manifest={manifest}
                  onSave={saveSettings}
                  settings={state.settings}
                  values={state.values}
                />
              ) : (
                <DashboardHome manifests={state.manifests} />
              )}
            </DashboardLayout>
          </AuthGuard>
        </GuildProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function DashboardStateMessage({
  actionLabel,
  message,
  onAction,
  title,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {actionLabel && onAction ? (
        <button
          className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function resolveGuild(): GuildSummary | undefined {
  const params = new URLSearchParams(window.location.search);
  const guildId = params.get('guildId') ?? import.meta.env.VITE_GUILD_ID;
  const guildName = params.get('guildName') ?? import.meta.env.VITE_GUILD_NAME;
  const iconUrl = params.get('guildIconUrl') ?? import.meta.env.VITE_GUILD_ICON_URL;

  if (!guildId) {
    return undefined;
  }

  return {
    id: guildId,
    name: guildName?.trim() || 'Current guild',
    iconUrl: iconUrl?.trim() || undefined,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof DashboardAPIError) {
    return `${error.message} (${error.code})`;
  }

  return error instanceof Error ? error.message : 'The dashboard could not load platform data.';
}

function getModuleIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/modules\/(.+)$/);
  return match ? decodeURIComponent(match[1] ?? '') : undefined;
}

function logStateUpdate(reason: string, nextState: DashboardState, selectedModuleId: string | undefined): void {
  const selectedModule = selectedModuleId
    ? nextState.manifests.find((candidate) => candidate.id === selectedModuleId)
    : undefined;

  console.debug('[dashboard-app] loadDashboard:setState', {
    reason,
    status: nextState.status,
    modules: nextState.manifests,
    settings: nextState.settings,
    selectedModule: selectedModule
      ? {
          id: selectedModule.id,
          name: selectedModule.name,
        }
      : selectedModuleId,
  });
}

function assertResponseShape<T>(
  statement: string,
  actual: unknown,
  expected: unknown,
  predicate: (value: unknown) => value is T,
): asserts actual is T {
  if (predicate(actual)) {
    return;
  }

  throw new DashboardShapeError(statement, actual, expected);
}

class DashboardShapeError extends Error {
  constructor(
    readonly statement: string,
    readonly actualResponseObject: unknown,
    readonly expectedResponseObject: unknown,
  ) {
    super(`Unexpected response shape from ${statement}.`);
    this.name = 'DashboardShapeError';
  }
}

function describeShape(value: unknown): unknown {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
      itemShape: value.length > 0 ? describeShape(value[0]) : 'empty',
    };
  }

  if (!isRecord(value)) {
    return {
      type: value === null ? 'null' : typeof value,
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      Array.isArray(nestedValue)
        ? {
            type: 'array',
            length: nestedValue.length,
            itemShape: nestedValue.length > 0 ? describeShape(nestedValue[0]) : 'empty',
          }
        : isRecord(nestedValue)
          ? describeShape(nestedValue)
          : typeof nestedValue,
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeError(error: unknown): unknown {
  if (error instanceof DashboardShapeError) {
    return {
      name: error.name,
      message: error.message,
      statement: error.statement,
      actualResponseObject: error.actualResponseObject,
      expectedResponseObject: error.expectedResponseObject,
      stack: error.stack,
    };
  }

  if (error instanceof DashboardAPIError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}
