import { describe, expect, it, vi } from 'vitest';

import { createAuthEndpoints } from '../../src/core/api/auth.endpoints.js';
import { APIRouter } from '../../src/core/api/router.js';
import { DiscordOAuthProvider, OAuthStateService } from '../../src/core/auth/index.js';
import type { DiscordAPIClient, DiscordOAuthConfig } from '../../src/core/auth/index.js';

const config: DiscordOAuthConfig = {
  clientId: 'discord-client-id',
  clientSecret: 'discord-client-secret',
  redirectUri: 'https://dashboard.example.test/api/v1/auth/callback',
};

function createDiscordClient(): DiscordAPIClient {
  return {
    exchangeCode: vi.fn(async () => ({
      access_token: 'access-token',
      token_type: 'Bearer',
      scope: 'identify guilds',
    })),
    getCurrentUser: vi.fn(async () => ({
      id: 'user-1',
      username: 'hoak-admin',
      global_name: 'Hoak Admin',
      avatar: 'avatar-hash',
    })),
    getCurrentUserGuilds: vi.fn(async () => [
      {
        id: 'guild-1',
        name: 'Hoak Family',
        icon: 'guild-icon',
        owner: true,
        permissions: '0',
      },
    ]),
  };
}

function createProvider(discord = createDiscordClient(), now = new Date('2026-07-07T00:00:00.000Z')) {
  const stateService = new OAuthStateService({ now: () => now });
  return {
    discord,
    stateService,
    provider: new DiscordOAuthProvider(config, stateService, discord),
  };
}

describe('DiscordOAuthProvider', () => {
  it('generates Discord authorization URLs with identify and guilds scopes only', async () => {
    const { provider } = createProvider();

    const login = await provider.beginLogin({ redirectPath: '/guilds' });
    const url = new URL(login.authorizationUrl);

    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe(config.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('identify guilds');
    expect(url.searchParams.get('state')).toBe(login.state.value);
    expect(login.state.redirectPath).toBe('/guilds');
    expect(login.state.value).toHaveLength(43);
  });

  it('validates state, exchanges code, retrieves user, and maps guilds', async () => {
    const { discord, provider } = createProvider();
    const login = await provider.beginLogin({});

    const result = await provider.handleCallback({ code: 'auth-code', state: login.state.value });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({
        id: 'user-1',
        provider: 'discord',
        username: 'hoak-admin',
        displayName: 'Hoak Admin',
        avatarUrl: 'https://cdn.discordapp.com/avatars/user-1/avatar-hash.png',
      });
      expect(result.guilds).toEqual([
        {
          id: 'guild-1',
          name: 'Hoak Family',
          iconUrl: 'https://cdn.discordapp.com/icons/guild-1/guild-icon.png',
          owner: true,
        },
      ]);
    }
    expect(discord.exchangeCode).toHaveBeenCalledWith('auth-code');
    expect(discord.getCurrentUser).toHaveBeenCalledWith('access-token');
    expect(discord.getCurrentUserGuilds).toHaveBeenCalledWith('access-token');
  });

  it('rejects reused state before token exchange', async () => {
    const { discord, provider } = createProvider();
    const login = await provider.beginLogin({});

    await provider.handleCallback({ code: 'auth-code', state: login.state.value });
    const replay = await provider.handleCallback({ code: 'auth-code', state: login.state.value });

    expect(replay).toEqual({
      ok: false,
      code: 'auth.invalid_state',
      message: 'Discord OAuth state is missing, expired, or already used.',
    });
    expect(discord.exchangeCode).toHaveBeenCalledTimes(1);
  });

  it('rejects expired state before token exchange', async () => {
    let now = new Date('2026-07-07T00:00:00.000Z');
    const discord = createDiscordClient();
    const stateService = new OAuthStateService({ ttlMs: 1000, now: () => now });
    const provider = new DiscordOAuthProvider(config, stateService, discord);
    const login = await provider.beginLogin({});

    now = new Date('2026-07-07T00:00:02.000Z');
    const result = await provider.handleCallback({ code: 'auth-code', state: login.state.value });

    expect(result).toEqual({
      ok: false,
      code: 'auth.invalid_state',
      message: 'Discord OAuth state is missing, expired, or already used.',
    });
    expect(discord.exchangeCode).not.toHaveBeenCalled();
  });

  it('maps callback and Discord API failures to auth failures', async () => {
    const discord = createDiscordClient();
    vi.mocked(discord.exchangeCode).mockRejectedValueOnce(new Error('Discord token exchange failed.'));
    const { provider } = createProvider(discord);
    const login = await provider.beginLogin({});

    await expect(provider.handleCallback({ state: login.state.value })).resolves.toEqual({
      ok: false,
      code: 'auth.invalid_callback',
      message: 'Discord OAuth callback did not include an authorization code.',
    });

    const secondLogin = await provider.beginLogin({});
    await expect(provider.handleCallback({ code: 'auth-code', state: secondLogin.state.value })).resolves.toEqual({
      ok: false,
      code: 'auth.provider_error',
      message: 'Discord token exchange failed.',
    });
  });
});

describe('auth endpoints', () => {
  it('registers public login and callback endpoints', async () => {
    const { provider } = createProvider();
    const router = new APIRouter();
    for (const endpoint of createAuthEndpoints({ authProvider: provider })) {
      router.register(endpoint);
    }

    const login = await router.handle({ method: 'GET', path: '/api/v1/auth/login', query: { redirectPath: '/guilds' } });

    expect(login.success).toBe(true);
    if (!login.success) {
      throw new Error('Expected login endpoint to succeed.');
    }

    expect(login.data).toMatchObject({ authorizationUrl: expect.stringContaining('https://discord.com/oauth2/authorize') });
    const data = login.data as { state: { value: string } };

    const callback = await router.handle({
      method: 'GET',
      path: '/api/v1/auth/callback',
      query: { code: 'auth-code', state: data.state.value },
    });

    expect(callback.success).toBe(true);
    if (callback.success) {
      expect(callback.data).toMatchObject({ ok: true, user: { id: 'user-1', provider: 'discord' } });
    }
  });
});
