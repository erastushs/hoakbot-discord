import { describe, expect, it } from 'vitest';

import { PermissionRegistry } from '../../src/core/permissions/permission-registry.js';
import type { IPermissionAction } from '../../src/core/permissions/types.js';

function action(overrides: Partial<IPermissionAction> = {}): IPermissionAction {
  return {
    key: 'voice.configure',
    module: 'voice',
    name: 'Configure Voice',
    description: 'Configure voice automation.',
    ...overrides,
  };
}

describe('PermissionRegistry', () => {
  it('registers and looks up actions', () => {
    const registry = new PermissionRegistry();
    const permission = action();

    registry.register(permission);

    expect(registry.get('voice.configure')).toBe(permission);
    expect(registry.exists('voice.configure')).toBe(true);
    expect(registry.has('voice.configure')).toBe(true);
    expect(registry.getAll()).toEqual([permission]);
    expect(registry.getByModule('voice')).toEqual([permission]);
  });

  it('registers multiple actions', () => {
    const registry = new PermissionRegistry();

    registry.registerMany([
      action(),
      action({ key: 'voice.play', name: 'Play Voice Sound', description: 'Play a voice sound.' }),
    ]);

    expect(registry.getAll()).toHaveLength(2);
  });

  it('rejects duplicate actions', () => {
    const registry = new PermissionRegistry();
    registry.register(action());

    expect(() => registry.register(action())).toThrow('Duplicate permission action "voice.configure".');
  });

  it('requires module namespacing', () => {
    const registry = new PermissionRegistry();

    expect(() => registry.register(action({ key: 'logging.configure' }))).toThrow(
      'Permission action "logging.configure" must be namespaced with module "voice".',
    );
  });
});
