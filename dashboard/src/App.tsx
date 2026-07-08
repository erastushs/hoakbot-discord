import { useCallback, useEffect, useMemo, useState } from 'react';

import { APIClient, DashboardAPIError } from './api/client.js';
import { AuthGuard } from './auth/AuthGuard.js';
import { AuthProvider, useAuth } from './auth/AuthContext.js';
import { Button, Card, Skeleton } from './components/index.js';
import { GuildProvider } from './guilds/GuildContext.js';
import { DashboardHome } from './home/DashboardHome.js';
import { DashboardLayout } from './layout/DashboardLayout.js';
import { ThemeProvider } from './layout/ThemeProvider.js';
import { ModulePage } from './modules/ModulePage.js';
import type { ModuleManifest, SettingMetadata } from './contracts.js';

interface DashboardState {
  status: 'loading' | 'ready' | 'error';
  manifests: ModuleManifest[];
  settings: SettingMetadata[];
  values: Record<string, unknown>;
  error?: string;
}

export function App() {
  const api = useMemo(() => new APIClient(), []);

  return (
    <ThemeProvider>
      <AuthProvider api={api}>
        <GuildProvider>
          <DashboardShell api={api} />
        </GuildProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function DashboardShell({ api }: { api: APIClient }) {
  const moduleId = getModuleIdFromPath(window.location.pathname);
  const auth = useAuth();
  const guild = auth.selectedGuild;
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

    if (auth.status !== 'authenticated') {
      return;
    }

    if (!guild) {
      const nextState: DashboardState = {
        status: 'error',
        manifests: [],
        settings: [],
        values: {},
        error: 'No authorized guilds are available for this Discord account.',
      };
      console.debug('[dashboard-app] loadDashboard:missingGuild', {
        failingStatement: 'auth.selectedGuild',
        thrownException: { name: 'MissingGuildError', message: 'Missing authenticated guild id' },
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
  }, [api, auth.status, guild, moduleId]);

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

  return (
    <AuthGuard>
      <DashboardLayout breadcrumb={breadcrumb} isLoading={state.status === 'loading'} manifests={state.manifests}>
        {state.status === 'loading' ? (
          <DashboardLoadingState moduleId={moduleId} />
        ) : state.status === 'error' ? (
          <DashboardStateMessage
            actionLabel="Retry"
            message={state.error ?? 'The dashboard could not load platform data.'}
            onAction={() => void loadDashboard()}
            title="Dashboard unavailable"
          />
        ) : manifest ? (
          <ModulePage manifest={manifest} onSave={saveSettings} settings={state.settings} values={state.values} />
        ) : (
          <DashboardHome manifests={state.manifests} />
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}

function DashboardLoadingState({ moduleId }: { moduleId?: string }) {
  if (moduleId) {
    return (
      <div aria-busy="true" aria-live="polite" className="grid gap-6 tablet:gap-8 wide:gap-10" role="status">
        <header className="mb-2 pb-2">
          <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
            <div className="grid min-w-0 gap-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </header>

        <section className="grid gap-4 rounded-2xl bg-dashboard-bg-section/54 p-4 shadow-elevation-1 backdrop-blur-xl tablet:p-5">
          <div className="grid gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="grid gap-4 tablet:grid-cols-2 wide:grid-cols-3 wide:gap-5">
            <Card className="grid gap-3 p-5"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-36" /></Card>
            <Card className="grid gap-3 p-5"><Skeleton className="h-3 w-28" /><Skeleton className="h-7 w-32" /></Card>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl bg-dashboard-bg-section/54 p-4 shadow-elevation-1 backdrop-blur-xl tablet:p-5">
          <Skeleton className="h-6 w-40" />
          <Card className="grid gap-4 p-5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </Card>
        </section>
        <span className="sr-only">Loading module dashboard content</span>
      </div>
    );
  }

  return (
      <div aria-busy="true" aria-live="polite" className="grid gap-6 tablet:gap-8 wide:gap-10" role="status">
      <header className="mb-2 pb-2">
        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
          <div className="grid min-w-0 gap-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </header>

      <section className="grid gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 tablet:grid-cols-2 wide:grid-cols-3 wide:gap-5">
          <Card className="grid gap-3 p-5">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-36" />
          </Card>
          <Card className="grid gap-3 p-5">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-32" />
          </Card>
          <Card className="grid gap-3 p-5">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-40" />
          </Card>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Card className="grid gap-5 p-5">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      </section>
      <span className="sr-only">Loading dashboard content</span>
    </div>
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
    <section className="rounded-2xl border border-dashboard-border-subtle bg-dashboard-bg-surface/82 p-6 shadow-elevation-1 backdrop-blur-xl">
      <h1 className="text-heading-m text-dashboard-text-primary">{title}</h1>
      <p className="mt-2 max-w-2xl text-small text-dashboard-text-secondary">{message}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
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
