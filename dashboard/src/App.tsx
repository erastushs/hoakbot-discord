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

    if (!guild) {
      console.debug('[dashboard-app] loadDashboard:throw', {
        error: 'Missing guild id',
        moduleId,
      });
      setState({
        status: 'error',
        manifests: [],
        settings: [],
        values: {},
        error: 'Set VITE_GUILD_ID or open the dashboard with ?guildId=<discord-guild-id>.',
      });
      return;
    }

    setState((current) => ({ ...current, status: 'loading', error: undefined }));

    try {
      console.debug('[dashboard-app] loadDashboard:requestModulesAndMetadata', {
        guildId: guild.id,
        moduleId,
      });
      const [{ modules }, { settings }] = await Promise.all([
        api.getGuildModules(guild.id),
        moduleId ? api.getModuleSettings(moduleId) : Promise.resolve({ settings: [] }),
      ]);
      console.debug('[dashboard-app] loadDashboard:modulesAndMetadataLoaded', {
        moduleCount: modules.length,
        settingCount: settings.length,
      });
      const manifest = moduleId ? modules.find((candidate) => candidate.id === moduleId) : undefined;

      if (moduleId && !manifest) {
        console.debug('[dashboard-app] loadDashboard:throw', {
          error: 'Module not found',
          moduleId,
          moduleCount: modules.length,
        });
        setState({
          status: 'error',
          manifests: modules,
          settings: [],
          values: {},
          error: `Module "${moduleId}" was not found by the backend.`,
        });
        return;
      }

      console.debug('[dashboard-app] loadDashboard:requestGuildSettings', {
        guildId: guild.id,
        moduleId,
      });
      const valuesResponse = moduleId ? await api.getGuildSettings(guild.id) : undefined;
      console.debug('[dashboard-app] loadDashboard:guildSettingsLoaded', {
        settingValueCount: valuesResponse?.settings.length ?? 0,
      });
      setState({
        status: 'ready',
        manifests: modules,
        settings,
        values: Object.fromEntries(valuesResponse?.settings.map((setting) => [setting.key, setting.value]) ?? []),
      });
      console.debug('[dashboard-app] loadDashboard:ready', {
        moduleCount: modules.length,
        settingCount: settings.length,
        settingValueCount: valuesResponse?.settings.length ?? 0,
      });
    } catch (error) {
      console.debug('[dashboard-app] loadDashboard:throw', { error });
      setState({
        status: 'error',
        manifests: [],
        settings: [],
        values: {},
        error: toErrorMessage(error),
      });
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

  if (!guildId) {
    return undefined;
  }

  return {
    id: guildId,
    name: params.get('guildName') ?? guildId,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof DashboardAPIError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Backend is offline or unreachable. Start the API backend and retry.';
    }

    return `${error.message} (${error.code})`;
  }

  return error instanceof Error ? error.message : 'The dashboard could not load platform data.';
}

function getModuleIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/modules\/(.+)$/);
  return match ? decodeURIComponent(match[1] ?? '') : undefined;
}
