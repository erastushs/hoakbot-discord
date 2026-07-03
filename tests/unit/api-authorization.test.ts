import { describe, expect, it, vi } from 'vitest';

import { APIAuthorizationService } from '../../src/core/api/authorization.js';
import { ok } from '../../src/core/api/responses.js';
import type { UserContext } from '../../src/core/api/auth.types.js';
import type { IPermissionService } from '../../src/core/permissions/types.js';

function user(overrides: Partial<UserContext> = {}): UserContext {
  const session = {
    id: 'session-1',
    identity: { id: 'user-1', username: 'User' },
    expiresAt: Date.now() + 60_000,
    createdAt: Date.now(),
  };

  return {
    identity: session.identity,
    session,
    guilds: [{ guildId: 'guild-1', owner: false, permissions: [], roles: ['role-1'] }],
    ...overrides,
  };
}

describe('APIAuthorizationService', () => {
  it('allows public and authenticated requests at the right levels', () => {
    const service = new APIAuthorizationService();

    expect(() => service.authorize({ auth: 'public' })).not.toThrow();
    expect(() => service.authorize({ auth: 'authenticated', user: user() })).not.toThrow();
    expect(() => service.authorize({ auth: 'authenticated' })).toThrow('Authentication required');
  });

  it('checks guild membership and ownership/admin access', () => {
    const service = new APIAuthorizationService();

    expect(() => service.authorize({ auth: 'guild_member', user: user(), guildId: 'guild-1' })).not.toThrow();
    expect(() => service.authorize({ auth: 'guild_member', user: user(), guildId: 'guild-2' })).toThrow(
      'Guild membership required',
    );
    expect(() =>
      service.authorize({
        auth: 'guild_admin',
        user: user({ guilds: [{ guildId: 'guild-1', owner: true, permissions: [], roles: [] }] }),
        guildId: 'guild-1',
      }),
    ).not.toThrow();
  });

  it('uses permission lookup for guild admin authorization', () => {
    const permissionService = {
      check: vi.fn(() => ({ allowed: true, reason: 'role_override' })),
    } as unknown as IPermissionService;
    const service = new APIAuthorizationService(permissionService);

    service.authorize({
      auth: 'guild_admin',
      user: user(),
      guildId: 'guild-1',
      permission: 'voice.configure',
    });

    expect(permissionService.check).toHaveBeenCalledWith({
      guildId: 'guild-1',
      userId: 'user-1',
      roleIds: ['role-1'],
      action: 'voice.configure',
    });
  });

  it('provides middleware hooks', async () => {
    const service = new APIAuthorizationService();
    const middleware = service.middleware('guild_member', () => user());
    const next = vi.fn(async () => ok({ passed: true }));

    const response = await middleware(
      { method: 'GET', path: '/api/v1/guilds/guild-1/settings' },
      { requestId: 'api-1', startedAt: 1, version: 'v1', params: { guildId: 'guild-1' } },
      next,
    );

    expect(response.success).toBe(true);
    expect(next).toHaveBeenCalledOnce();
  });
});
