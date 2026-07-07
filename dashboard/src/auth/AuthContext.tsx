import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { APIClient, DashboardAPIError } from '../api/client.js';
import type { DashboardUser, GuildSummary } from '../contracts.js';

export interface AuthState {
  user?: DashboardUser;
  guilds: GuildSummary[];
  selectedGuild?: GuildSummary;
  authenticated: boolean;
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  error?: string;
}

export interface AuthContextValue extends AuthState {
  loginUrl: string;
  setSelectedGuild(guildId: string): void;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  api = new APIClient(),
  initialState,
}: {
  children: ReactNode;
  api?: APIClient;
  initialState?: Partial<AuthState>;
}) {
  const [user, setUser] = useState<DashboardUser | undefined>(initialState?.user);
  const [guilds, setGuilds] = useState<GuildSummary[]>(initialState?.guilds ?? []);
  const [selectedGuildId, setSelectedGuildId] = useState<string | undefined>(initialState?.selectedGuild?.id);
  const [status, setStatus] = useState<AuthState['status']>(initialState?.status ?? 'loading');
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async (): Promise<void> => {
    setStatus('loading');
    setError(undefined);

    try {
      const response = await api.getMe();
      if (response.authenticationState !== 'authenticated' || !response.user) {
        setUser(undefined);
        setGuilds([]);
        setSelectedGuildId(undefined);
        setStatus('unauthenticated');
        return;
      }

      setUser(response.user);
      setGuilds(response.guilds);
      setSelectedGuildId((current) => current ?? response.selectedGuild?.id ?? response.guilds[0]?.id);
      setStatus('authenticated');
    } catch (caught) {
      if (caught instanceof DashboardAPIError && (caught.status === 401 || caught.code === 'AUTH_REQUIRED')) {
        setUser(undefined);
        setGuilds([]);
        setSelectedGuildId(undefined);
        setStatus('unauthenticated');
        return;
      }

      setUser(undefined);
      setGuilds([]);
      setSelectedGuildId(undefined);
      setError(caught instanceof Error ? caught.message : 'Unable to load authentication state.');
      setStatus('error');
    }
  }, [api]);

  useEffect(() => {
    if (initialState) {
      return;
    }

    void refresh();
  }, [initialState, refresh]);

  const signOut = useCallback(async (): Promise<void> => {
    await api.logout().catch(() => undefined);
    setUser(undefined);
    setGuilds([]);
    setSelectedGuildId(undefined);
    setStatus('unauthenticated');
  }, [api]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      guilds,
      selectedGuild: guilds.find((guild) => guild.id === selectedGuildId),
      authenticated: Boolean(user),
      status,
      error,
      loginUrl: '/api/v1/auth/login',
      setSelectedGuild: setSelectedGuildId,
      refresh,
      signOut,
    }),
    [error, guilds, refresh, selectedGuildId, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}

export function useOptionalAuth(): AuthContextValue | undefined {
  return useContext(AuthContext);
}
