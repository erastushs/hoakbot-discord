import { describe, expect, it } from 'vitest';

import { DependencyGraph } from '../../src/modules/dependency-graph.js';
import type { IModuleManifest } from '../../src/modules/manifest.types.js';

function manifest(id: string, dependencies: string[] = []): IModuleManifest {
  return {
    id,
    name: id,
    description: id,
    icon: 'box',
    color: '#5865F2',
    category: 'utility',
    version: '1.0.0',
    author: 'Erastus HS',
    supportsHotReload: false,
    dependencies,
  };
}

describe('DependencyGraph', () => {
  it('resolves modules in dependency-first topological order', () => {
    const graph = new DependencyGraph();
    graph.add(manifest('hoak:welcome', ['hoak:general']));
    graph.add(manifest('hoak:voice', ['hoak:general']));
    graph.add(manifest('hoak:general'));

    expect(graph.resolve()).toEqual(['hoak:general', 'hoak:welcome', 'hoak:voice']);
  });

  it('validates missing dependencies', () => {
    const graph = new DependencyGraph();
    graph.add(manifest('hoak:voice', ['hoak:missing']));

    expect(graph.validate()).toEqual({
      valid: false,
      errors: [
        {
          type: 'missing',
          from: 'hoak:voice',
          to: 'hoak:missing',
          message: 'Module "hoak:voice" depends on missing module "hoak:missing".',
        },
      ],
    });
  });

  it('detects circular dependencies with path reporting', () => {
    const graph = new DependencyGraph();
    graph.add(manifest('hoak:a', ['hoak:b']));
    graph.add(manifest('hoak:b', ['hoak:c']));
    graph.add(manifest('hoak:c', ['hoak:a']));

    const validation = graph.validate();

    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toMatchObject({
      type: 'circular',
      from: 'hoak:c',
      to: 'hoak:a',
      path: ['hoak:a', 'hoak:b', 'hoak:c', 'hoak:a'],
    });
  });

  it('throws when resolving an invalid graph', () => {
    const graph = new DependencyGraph();
    graph.add(manifest('hoak:voice', ['hoak:missing']));

    expect(() => graph.resolve()).toThrow(
      'Dependency graph is invalid: Module "hoak:voice" depends on missing module "hoak:missing".',
    );
  });

  it('looks up dependents', () => {
    const graph = new DependencyGraph();
    graph.add(manifest('hoak:general'));
    graph.add(manifest('hoak:voice', ['hoak:general']));
    graph.add(manifest('hoak:welcome', ['hoak:general']));

    expect(graph.getDependents('hoak:general')).toEqual(['hoak:voice', 'hoak:welcome']);
  });
});
