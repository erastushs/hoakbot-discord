import { describe, expect, it } from 'vitest';

import { loadManifestRegistry, ManifestRegistry } from '../../src/modules/manifest-registry.js';
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
    dashboard: {
      navigation: {
        sidebarPriority: 10,
        sidebarSection: 'Voice',
      },
      homePage: {
        featured: true,
        priority: 10,
      },
      settings: {
        groups: [],
      },
    },
    ...overrides,
  };
}

describe('ManifestRegistry', () => {
  it('registers and retrieves manifests', () => {
    const registry = new ManifestRegistry();
    const voice = manifest();

    registry.register(voice);

    expect(registry.get('hoak:voice')).toBe(voice);
    expect(registry.getAll()).toEqual([voice]);
  });

  it('rejects duplicate module ids', () => {
    const registry = new ManifestRegistry();
    registry.register(manifest());

    expect(() => registry.register(manifest({ name: 'Voice 2' }))).toThrow(
      'Duplicate module manifest id "hoak:voice".',
    );
  });

  it('rejects duplicate visible navigation order', () => {
    const registry = new ManifestRegistry();
    registry.register(manifest());

    expect(() =>
      registry.register(
        manifest({
          id: 'hoak:general',
          name: 'General',
          category: 'utility',
        }),
      ),
    ).toThrow('Duplicate navigation order 10 for modules "hoak:voice" and "hoak:general".');
  });

  it('allows duplicate navigation order for hidden modules', () => {
    const registry = new ManifestRegistry();
    registry.register(manifest());
    registry.register(
      manifest({
        id: 'hoak:metrics',
        name: 'Metrics',
        category: 'core',
        dashboard: {
          navigation: {
            sidebarPriority: 10,
            sidebarSection: 'Core',
            hidden: true,
          },
          homePage: {
            featured: false,
            priority: 10,
          },
          settings: {
            groups: [],
          },
        },
      }),
    );

    expect(registry.getAll()).toHaveLength(2);
  });

  it('validates dependencies after all manifests are registered', () => {
    const registry = loadManifestRegistry([
      manifest({ dependencies: ['hoak:general'] }),
      manifest({
        id: 'hoak:general',
        name: 'General',
        category: 'utility',
        dashboard: {
          navigation: {
            sidebarPriority: 20,
            sidebarSection: 'Utility',
          },
          homePage: {
            featured: true,
            priority: 20,
          },
          settings: {
            groups: [],
          },
        },
      }),
    ]);

    expect(registry.getAll()).toHaveLength(2);
  });

  it('rejects invalid dependencies', () => {
    const registry = new ManifestRegistry();
    registry.register(manifest({ dependencies: ['hoak:missing'] }));

    expect(() => registry.validate()).toThrow(
      'Module manifest dependency validation failed: Module "hoak:voice" depends on missing module "hoak:missing".',
    );
  });

  it('rejects circular dependencies', () => {
    const registry = loadManifestRegistry;

    expect(() =>
      registry([
        manifest({ dependencies: ['hoak:general'] }),
        manifest({
          id: 'hoak:general',
          name: 'General',
          category: 'utility',
          dependencies: ['hoak:voice'],
          dashboard: {
            navigation: {
              sidebarPriority: 20,
              sidebarSection: 'Utility',
            },
            homePage: {
              featured: true,
              priority: 20,
            },
            settings: {
              groups: [],
            },
          },
        }),
      ]),
    ).toThrow('Circular dependency detected: hoak:voice -> hoak:general -> hoak:voice.');
  });

  it('rejects invalid versions and categories', () => {
    const registry = new ManifestRegistry();

    expect(() => registry.register(manifest({ version: 'next' }))).toThrow(
      'version: Manifest version must be SemVer-like.',
    );

    expect(() =>
      registry.register({ ...manifest(), id: 'hoak:bad', category: 'invalid' } as IModuleManifest),
    ).toThrow('category: Invalid enum value.');
  });

  it('rejects invalid manifest shapes', () => {
    const registry = new ManifestRegistry();

    expect(() => registry.register(manifest({ color: 'blue' }))).toThrow(
      'Invalid module manifest "hoak:voice": color: Manifest color must be a hex color.',
    );
  });
});
