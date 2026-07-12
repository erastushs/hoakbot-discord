import { describe, expect, it } from 'vitest';

import { serializeDashboardModules } from '../../src/core/api/dashboard-metadata.serializer.js';
import { generalManifest } from '../../src/modules/general/index.js';
import { voiceManifest } from '../../src/modules/voice/index.js';
import { moderationManifest } from '../../src/modules/moderation/index.js';
import { loggingManifest } from '../../src/modules/logging/index.js';
import { welcomeManifest } from '../../src/modules/welcome/index.js';
import { goodbyeManifest } from '../../src/modules/goodbye/index.js';
import { shrineManifest } from '../../src/modules/shrine/index.js';

const builtIns = [generalManifest, voiceManifest, moderationManifest, loggingManifest, welcomeManifest, goodbyeManifest, shrineManifest];

describe('built-in dashboard metadata contract', () => {
  it('safely projects all seven built-ins with identity, dashboard, dependency, and state metadata', () => {
    const modules = serializeDashboardModules(builtIns, new Map(), new Set(builtIns.map((manifest) => manifest.id)));
    expect(modules).toHaveLength(7);
    expect(modules.map((module) => module.id)).toEqual(['general', 'voice', 'moderation', 'logging', 'welcome', 'goodbye', 'shrine']);
    for (const module of modules) {
      expect(module).toMatchObject({ enabled: true, available: true, health: 'available' });
      expect(module.name).toBeTruthy();
      expect(module.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(module.description).toBeTruthy();
      expect(module.category).toBeTruthy();
      expect(module.dashboard?.navigation.sidebarPriority).toEqual(expect.any(Number));
      expect(module).not.toHaveProperty('routes');
      expect(module).not.toHaveProperty('documentation');
    }
  });

  it('derives unavailable state from runtime availability rather than fabricating it', () => {
    const modules = serializeDashboardModules([generalManifest], new Map(), new Set());
    expect(modules[0]).toMatchObject({ enabled: false, available: false, health: 'unavailable' });
  });
});
