import { describe, it, expect, vi } from 'vitest';
import { ModerationGuard } from '../../src/modules/moderation/services/moderation.guard.js';
import { Errors } from '../../src/shared/errors/errors.js';

function makeMap(entries: Record<string, unknown>): Map<string, unknown> {
  return new Map(Object.entries(entries));
}

function fakeUser(id: string, clientUser?: { id: string }): Record<string, unknown> {
  return {
    id,
    displayName: `User-${id}`,
    username: `user-${id}`,
    client: { user: clientUser ?? { id: 'bot-1' }, users: { fetch: vi.fn() } },
  };
}

function fakeMember(
  id: string,
  rolePosition = 0,
): Record<string, unknown> {
  return {
    id,
    roles: { highest: { position: rolePosition } },
  };
}

function makeCtx(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user: fakeUser('user-1'),
    member: fakeMember('user-1', 10),
    guild: {
      id: 'guild-1',
      ownerId: 'owner-1',
      members: {
        me: fakeMember('bot-1', 50),
        fetch: vi.fn(),
      },
    },
    reply: vi.fn(),
    args: makeMap({}),
    ...overrides,
  };
}

describe('ModerationGuard', () => {
  const guard = new ModerationGuard();

  describe('resolveTarget', () => {
    it('returns User from "user" arg directly', async () => {
      const target = fakeUser('target-1');
      const ctx = makeCtx({ args: makeMap({ user: target }) });

      const result = await guard.resolveTarget(ctx as never);

      expect(result).toBe(target);
    });

    it('returns User from "target" arg directly', async () => {
      const target = fakeUser('target-2');
      const ctx = makeCtx({ args: makeMap({ target }) });

      const result = await guard.resolveTarget(ctx as never);

      expect(result).toBe(target);
    });

    it('fetches user by "target_user_id"', async () => {
      const target = fakeUser('target-3');
      const fetch = vi.fn().mockResolvedValue(target);
      const ctx = makeCtx({
        args: makeMap({ target_user_id: 'target-3' }),
        user: fakeUser('user-1', undefined),
      });
      (ctx.user as Record<string, unknown>).client = { users: { fetch }, user: { id: 'bot-1' } };

      const result = await guard.resolveTarget(ctx as never);

      expect(result).toBe(target);
      expect(fetch).toHaveBeenCalledWith('target-3');
    });

    it('replies with memberNotFound when fetch fails', async () => {
      const fetch = vi.fn().mockRejectedValue(new Error('not found'));
      const reply = vi.fn();
      const ctx = makeCtx({
        args: makeMap({ target_user_id: 'unknown' }),
        user: fakeUser('user-1', undefined),
        reply,
      });
      (ctx.user as Record<string, unknown>).client = { users: { fetch }, user: { id: 'bot-1' } };

      const result = await guard.resolveTarget(ctx as never);

      expect(result).toBeNull();
      expect(reply).toHaveBeenCalledWith(Errors.memberNotFound());
    });

    it('replies with userRequired when no args provided', async () => {
      const reply = vi.fn();
      const ctx = makeCtx({ args: makeMap({}), reply });

      const result = await guard.resolveTarget(ctx as never);

      expect(result).toBeNull();
      expect(reply).toHaveBeenCalledWith(Errors.userRequired());
    });

    it('replies with userRequired when target args are undefined', async () => {
      const reply = vi.fn();
      const ctx = makeCtx({
        args: makeMap({ user: undefined, target: undefined, target_user_id: undefined }),
        reply,
      });

      const result = await guard.resolveTarget(ctx as never);

      expect(result).toBeNull();
      expect(reply).toHaveBeenCalledWith(Errors.userRequired());
    });
  });

  describe('resolveMember', () => {
    it('resolves existing member', async () => {
      const target = fakeUser('target-4');
      const member = fakeMember('target-4', 5);
      const fetch = vi.fn().mockResolvedValue(member);
      const ctx = makeCtx({
        guild: { id: 'guild-1', members: { fetch } },
      });

      const result = await guard.resolveMember(target as never, ctx as never);

      expect(result).toBe(member);
      expect(fetch).toHaveBeenCalledWith('target-4');
    });

    it('replies with memberNotInGuild when fetch fails', async () => {
      const target = fakeUser('target-5');
      const fetch = vi.fn().mockRejectedValue(new Error('not in guild'));
      const reply = vi.fn();
      const ctx = makeCtx({
        guild: { id: 'guild-1', members: { fetch } },
        reply,
      });

      const result = await guard.resolveMember(target as never, ctx as never);

      expect(result).toBeNull();
      expect(reply).toHaveBeenCalledWith(Errors.memberNotInGuild());
    });
  });

  describe('resolveReason', () => {
    it('returns trimmed slash reason', () => {
      const ctx = makeCtx({ args: makeMap({ reason: '  spamming  ' }) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe('spamming');
    });

    it('extracts reason from prefix suffix after mention', () => {
      const ctx = makeCtx({ args: makeMap({ _suffix: '<@123> spamming channels' }) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe('spamming channels');
    });

    it('handles suffix with !mention', () => {
      const ctx = makeCtx({ args: makeMap({ _suffix: '<@!123> advertising' }) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe('advertising');
    });

    it('returns noReasonProvided when suffix is only a mention', () => {
      const ctx = makeCtx({ args: makeMap({ _suffix: '<@123>' }) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe(Errors.noReasonProvided());
    });

    it('returns noReasonProvided when suffix has no mention', () => {
      const ctx = makeCtx({ args: makeMap({ _suffix: 'justtext' }) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe(Errors.noReasonProvided());
    });

    it('returns noReasonProvided when no reason or suffix', () => {
      const ctx = makeCtx({ args: makeMap({}) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe(Errors.noReasonProvided());
    });

    it('returns noReasonProvided when reason is empty string', () => {
      const ctx = makeCtx({ args: makeMap({ reason: '' }) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe(Errors.noReasonProvided());
    });

    it('returns noReasonProvided when reason is whitespace only', () => {
      const ctx = makeCtx({ args: makeMap({ reason: '   ' }) });

      const result = guard.resolveReason(ctx as never);

      expect(result).toBe(Errors.noReasonProvided());
    });
  });

  describe('validateCommon', () => {
    it('rejects self-action', () => {
      const member = fakeMember('user-1', 50);
      const ctx = makeCtx();

      const result = guard.validateCommon(member as never, ctx as never, 'ban');

      expect(result).toBe(Errors.selfAction('ban'));
    });

    it('rejects bot self-target', () => {
      const member = fakeMember('bot-1', 50);
      const ctx = makeCtx();

      const result = guard.validateCommon(member as never, ctx as never, 'kick');

      expect(result).toBe(Errors.botSelf('kick'));
    });

    it('rejects server owner target', () => {
      const member = fakeMember('owner-1', 100);
      const ctx = makeCtx();

      const result = guard.validateCommon(member as never, ctx as never, 'ban');

      expect(result).toBe(Errors.serverOwner('ban'));
    });

    it('rejects when executor role is lower than target', () => {
      const member = fakeMember('target-1', 50);
      const ctx = makeCtx({
        member: fakeMember('user-1', 10),
      });

      const result = guard.validateCommon(member as never, ctx as never, 'timeout');

      expect(result).toBe(Errors.roleHierarchy('timeout'));
    });

    it('rejects when executor role is equal to target', () => {
      const member = fakeMember('target-1', 30);
      const ctx = makeCtx({
        member: fakeMember('user-1', 30),
      });

      const result = guard.validateCommon(member as never, ctx as never, 'warn');

      expect(result).toBe(Errors.roleHierarchy('warn'));
    });

    it('rejects when bot role is lower than target', () => {
      const member = fakeMember('target-1', 80);
      const ctx = makeCtx({
        member: fakeMember('user-1', 100),
        guild: {
          id: 'guild-1',
          ownerId: 'owner-1',
          members: {
            me: fakeMember('bot-1', 50),
          },
        },
      });

      const result = guard.validateCommon(member as never, ctx as never, 'ban');

      expect(result).toBe(Errors.botHierarchy('ban'));
    });

    it('rejects when bot role is equal to target', () => {
      const member = fakeMember('target-1', 50);
      const ctx = makeCtx({
        member: fakeMember('user-1', 100),
        guild: {
          id: 'guild-1',
          ownerId: 'owner-1',
          members: {
            me: fakeMember('bot-1', 50),
          },
        },
      });

      const result = guard.validateCommon(member as never, ctx as never, 'kick');

      expect(result).toBe(Errors.botHierarchy('kick'));
    });

    it('passes validation when all checks pass', () => {
      const member = fakeMember('target-7', 10);
      const ctx = makeCtx({
        member: fakeMember('user-1', 50),
        guild: {
          id: 'guild-1',
          ownerId: 'owner-1',
          members: {
            me: fakeMember('bot-1', 100),
          },
        },
      });

      const result = guard.validateCommon(member as never, ctx as never, 'ban');

      expect(result).toBeNull();
    });

    it('parameterizes action name in error messages', () => {
      const member = fakeMember('user-1', 50);
      const ctx = makeCtx();

      expect(guard.validateCommon(member as never, ctx as never, 'ban')).toBe(
        Errors.selfAction('ban'),
      );
      expect(guard.validateCommon(member as never, ctx as never, 'kick')).toBe(
        Errors.selfAction('kick'),
      );
      expect(guard.validateCommon(member as never, ctx as never, 'timeout')).toBe(
        Errors.selfAction('timeout'),
      );
      expect(guard.validateCommon(member as never, ctx as never, 'warn')).toBe(
        Errors.selfAction('warn'),
      );
    });

    it('skips role hierarchy check when executor has no member', () => {
      const member = fakeMember('target-8', 10);
      const ctx = makeCtx({
        member: null,
        guild: {
          id: 'guild-1',
          ownerId: 'owner-1',
          members: {
            me: fakeMember('bot-1', 100),
          },
        },
      });

      const result = guard.validateCommon(member as never, ctx as never, 'ban');

      expect(result).toBeNull();
    });

    it('skips bot hierarchy check when bot member is absent', () => {
      const member = fakeMember('target-9', 10);
      const ctx = makeCtx({
        member: fakeMember('user-1', 50),
        guild: {
          id: 'guild-1',
          ownerId: 'owner-1',
          members: {
            me: null,
          },
        },
      });

      const result = guard.validateCommon(member as never, ctx as never, 'ban');

      expect(result).toBeNull();
    });
  });
});
