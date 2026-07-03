import { describe, expect, it } from 'vitest';

import { ModuleRegistry } from '../../src/modules/module-registry.js';
import { ModuleState } from '../../src/modules/module.interface.js';
import type { IModule, IModuleContext } from '../../src/modules/module.interface.js';
import type { IModuleManifest } from '../../src/modules/manifest.types.js';

function manifest(overrides: Partial<IModuleManifest> = {}): IModuleManifest {
  return {
    id: 'hoak:voice',
    name: 'Voice',
    description: 'Voice automation.',
    icon: 'headphones',
    color: '#5865F2',
    category: 'voice',
    version: '1.0.0',
    author: 'Erastus HS',
    supportsHotReload: false,
    dependencies: [],
    ...overrides,
  };
}

function module(overrides: Partial<IModule> = {}): IModule {
  return {
    manifest: manifest(),
    name: 'voice',
    version: '1.0.0',
    enabled: true,
    register: () => undefined,
    onPreRegister: async (_ctx: IModuleContext) => undefined,
    onRegister: async (_ctx: IModuleContext) => undefined,
    onPostRegister: async (_ctx: IModuleContext) => undefined,
    onPreStart: async (_ctx: IModuleContext) => undefined,
    onStart: async (_ctx?: IModuleContext) => undefined,
    onPostStart: async (_ctx: IModuleContext) => undefined,
    onPreStop: async (_ctx: IModuleContext) => undefined,
    onStop: async (_ctx: IModuleContext) => undefined,
    onPostStop: async (_ctx: IModuleContext) => undefined,
    ...overrides,
  };
}

describe('ModuleRegistry', () => {
  it('registers and looks up modules by manifest id', () => {
    const registry = new ModuleRegistry();
    const voice = module();

    registry.register(voice);

    expect(registry.get('hoak:voice')).toEqual({
      module: voice,
      manifest: voice.manifest,
      state: ModuleState.REGISTERED,
    });
    expect(registry.getAll()).toHaveLength(1);
  });

  it('unregisters modules', () => {
    const registry = new ModuleRegistry();
    registry.register(module());

    expect(registry.unregister('hoak:voice')).toBe(true);
    expect(registry.get('hoak:voice')).toBeUndefined();
  });

  it('rejects duplicate module ids', () => {
    const registry = new ModuleRegistry();
    registry.register(module());

    expect(() => registry.register(module())).toThrow('Duplicate module id "hoak:voice".');
  });

  it('requires v3 manifests for registry participation', () => {
    const registry = new ModuleRegistry();

    expect(() => registry.register(module({ manifest: undefined }))).toThrow(
      'Module "voice" cannot be registered without a v3 manifest.',
    );
  });

  it('reports enabled state from the module', () => {
    const registry = new ModuleRegistry();
    registry.register(module({ enabled: false }));

    expect(registry.isEnabled('hoak:voice')).toBe(false);
    expect(registry.isEnabled('hoak:missing')).toBe(false);
  });

  it('tracks valid lifecycle state transitions', () => {
    const registry = new ModuleRegistry();
    registry.register(module());

    registry.transition('hoak:voice', ModuleState.INITIALIZED);
    registry.transition('hoak:voice', ModuleState.STARTED);
    registry.transition('hoak:voice', ModuleState.STOPPED);
    registry.transition('hoak:voice', ModuleState.SHUTDOWN);

    expect(registry.get('hoak:voice')?.state).toBe(ModuleState.SHUTDOWN);
  });

  it('rejects invalid lifecycle state transitions', () => {
    const registry = new ModuleRegistry();
    registry.register(module());

    expect(() => registry.transition('hoak:voice', ModuleState.STARTED)).toThrow(
      'Invalid module state transition for "hoak:voice": REGISTERED -> STARTED.',
    );
  });
});
