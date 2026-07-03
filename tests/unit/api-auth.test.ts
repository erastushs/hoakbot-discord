import { describe, expect, it } from 'vitest';

import { MemoryAuthProvider } from '../../src/core/api/memory-auth.provider.js';
import type { AuthProvider, Identity, UserContext } from '../../src/core/api/auth.types.js';

describe('API authentication interfaces', () => {
  it('supports in-memory sessions and user context lookup', async () => {
    const identity: Identity = { id: 'user-1', username: 'Erastus' };
    const provider: AuthProvider = new MemoryAuthProvider({
      botOwnerIds: ['user-1'],
      guildsByUserId: {
        'user-1': [{ guildId: 'guild-1', owner: true, permissions: [], roles: ['role-1'] }],
      },
    });

    const session = await provider.createSession(identity, Date.now() + 60_000);
    const loaded = await provider.getSession(session.id);
    const context = await provider.getUserContext(session);

    expect(loaded).toEqual(session);
    expect(context).toMatchObject<UserContext>({
      identity,
      session,
      guilds: [{ guildId: 'guild-1', owner: true, permissions: [], roles: ['role-1'] }],
      isBotOwner: true,
    });
  });

  it('does not return expired or destroyed sessions', async () => {
    const provider = new MemoryAuthProvider();
    const expired = await provider.createSession({ id: 'user-1', username: 'User' }, Date.now() - 1);
    const active = await provider.createSession({ id: 'user-2', username: 'User 2' }, Date.now() + 60_000);

    await provider.destroySession(active.id);

    expect(await provider.getSession(expired.id)).toBeUndefined();
    expect(await provider.getSession(active.id)).toBeUndefined();
  });
});
