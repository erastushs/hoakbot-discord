import { describe, expect, it } from 'vitest';

import { PermissionServiceV3 } from '../../src/core/permissions/permission-service.js';

describe('PermissionServiceV3', () => {
  it('registers and looks up actions', () => {
    const service = new PermissionServiceV3();

    service.registerActions([
      {
        key: 'moderation.warn',
        module: 'moderation',
        name: 'Warn Member',
        description: 'Issue a member warning.',
      },
    ]);

    expect(service.getAction('moderation.warn')?.name).toBe('Warn Member');
    expect(service.getActions()).toHaveLength(1);
  });

  it('supports user overrides before role overrides', () => {
    const service = new PermissionServiceV3();
    service.registerActions([
      {
        key: 'voice.configure',
        module: 'voice',
        name: 'Configure Voice',
        description: 'Configure voice.',
      },
    ]);

    service.setRoleOverride({
      guildId: 'guild-1',
      roleId: 'role-1',
      action: 'voice.configure',
      effect: 'allow',
    });
    service.setUserOverride({
      guildId: 'guild-1',
      userId: 'user-1',
      action: 'voice.configure',
      effect: 'deny',
    });

    expect(
      service.check({
        guildId: 'guild-1',
        userId: 'user-1',
        roleIds: ['role-1'],
        action: 'voice.configure',
      }),
    ).toEqual({ allowed: false, reason: 'user_override' });
  });

  it('supports role overrides', () => {
    const service = new PermissionServiceV3();
    service.registerActions([
      {
        key: 'logging.configure',
        module: 'logging',
        name: 'Configure Logging',
        description: 'Configure logging.',
      },
    ]);

    service.setRoleOverride({
      guildId: 'guild-1',
      roleId: 'role-1',
      action: 'logging.configure',
      effect: 'allow',
    });

    expect(
      service.check({
        guildId: 'guild-1',
        userId: 'user-1',
        roleIds: ['role-1'],
        action: 'logging.configure',
      }),
    ).toEqual({ allowed: true, reason: 'role_override' });
  });

  it('denies unknown actions and defaults to deny without overrides', () => {
    const service = new PermissionServiceV3();
    service.registerActions([
      {
        key: 'general.serverinfo',
        module: 'general',
        name: 'Server Info',
        description: 'View server information.',
      },
    ]);

    expect(
      service.check({ guildId: 'guild-1', userId: 'user-1', roleIds: [], action: 'missing.action' }),
    ).toEqual({ allowed: false, reason: 'unknown_action' });
    expect(
      service.check({
        guildId: 'guild-1',
        userId: 'user-1',
        roleIds: [],
        action: 'general.serverinfo',
      }),
    ).toEqual({ allowed: false, reason: 'default_deny' });
  });

  it('rejects overrides for unknown actions', () => {
    const service = new PermissionServiceV3();

    expect(() =>
      service.setUserOverride({
        guildId: 'guild-1',
        userId: 'user-1',
        action: 'voice.configure',
        effect: 'allow',
      }),
    ).toThrow('Unknown permission action "voice.configure".');
  });
});
