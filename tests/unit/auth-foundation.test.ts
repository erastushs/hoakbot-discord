import { describe, expect, expectTypeOf, it } from 'vitest';

import { TOKENS } from '../../src/core/container/tokens.js';
import type {
  AuthContext,
  AuthResult,
  AuthenticatedUser,
  AuthorizationResult,
  GuildIdentity,
  IAuthProvider,
  IAuthorizationProvider,
  ISessionProvider,
  OAuthState,
  PermissionSource,
  SessionIdentity,
} from '../../src/core/index.js';

describe('authentication foundation contracts', () => {
  it('exports DI tokens without concrete implementations', () => {
    expect(typeof TOKENS.AuthProvider).toBe('symbol');
    expect(typeof TOKENS.SessionProvider).toBe('symbol');
    expect(typeof TOKENS.AuthorizationProvider).toBe('symbol');
  });

  it('defines auth provider contract responsibilities', () => {
    expectTypeOf<IAuthProvider>().toMatchTypeOf<{
      beginLogin: (request: { redirectPath?: string }) => Promise<{ authorizationUrl: string; state: OAuthState }>;
      handleCallback: (request: { code?: string; state?: string }) => Promise<AuthResult>;
      getCurrentUser: () => Promise<AuthenticatedUser | undefined>;
      logout: () => Promise<void>;
    }>();
  });

  it('defines session provider contract responsibilities', () => {
    expectTypeOf<ISessionProvider>().toMatchTypeOf<{
      createSession: (user: AuthenticatedUser) => Promise<SessionIdentity>;
      getSession: (sessionId: string) => Promise<SessionIdentity | undefined>;
      refreshSession: (sessionId: string) => Promise<SessionIdentity | undefined>;
      destroySession: (sessionId: string) => Promise<void>;
    }>();
  });

  it('defines authorization provider contract responsibilities', () => {
    expectTypeOf<IAuthorizationProvider>().toMatchTypeOf<{
      canAccessDashboard: (user: AuthenticatedUser) => Promise<AuthorizationResult>;
      canAccessGuild: (user: AuthenticatedUser, guildId: string) => Promise<AuthorizationResult>;
      canManageModule: (user: AuthenticatedUser, guildId: string, moduleId: string) => Promise<AuthorizationResult>;
      canModifyConfiguration: (
        user: AuthenticatedUser,
        request: { guildId: string; action: 'read' | 'write' },
      ) => Promise<AuthorizationResult>;
    }>();
  });

  it('models reusable auth context state', () => {
    expectTypeOf<AuthContext>().toMatchTypeOf<{
      authenticationState: 'anonymous' | 'authenticated' | 'expired' | 'invalid';
      authorizationState: 'unknown' | 'allowed' | 'denied';
      currentUser?: AuthenticatedUser;
      currentSession?: SessionIdentity;
      selectedGuild?: GuildIdentity;
      authorization?: AuthorizationResult;
    }>();
  });

  it('defines platform auth and authorization result types', () => {
    const source = 'discord:manage-guild' satisfies PermissionSource;
    const authResult = {
      ok: true,
      user: { id: '123', provider: 'discord', username: 'admin' },
    } satisfies AuthResult;
    const authorizationResult = {
      allowed: true,
      source,
    } satisfies AuthorizationResult;

    expect(authResult.ok).toBe(true);
    expect(authorizationResult.allowed).toBe(true);
  });
});
