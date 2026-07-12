import { ConfigService } from '../src/core/config/config.service.js';
import { CommandRegistry } from '../src/shared/command-registry.js';
import { createGeneralCommandDescriptors, createModerationCommandDescriptors } from '../src/shared/command/builtin-commands.js';
import type { IMetrics } from '../src/core/metrics/types.js';
import type { WarningService } from '../src/modules/moderation/services/warning.service.js';
import type { HelpService } from '../src/modules/general/help/help-service.js';

export function createScriptRegistry(): CommandRegistry {
  const config = new ConfigService().load();
  const registry = new CommandRegistry();
  const metrics = { counter: () => ({ increment: () => undefined }), gauge: () => ({ set: () => undefined }), histogram: () => ({ observe: () => undefined }), getSnapshot: () => ({ counters: {}, gauges: {}, histograms: {} }) } as unknown as IMetrics;
  const warningService = {
    warn: async () => ({ id: '', guild_id: '', user_id: '', moderator_id: '', reason: '', created_at: new Date() }), count: async () => 0,
    history: async () => [] as never[], remove: async () => false, clear: async () => 0,
  } satisfies WarningService;
  const helpService = { show: async () => undefined } as unknown as HelpService;
  registry.registerMany(createGeneralCommandDescriptors({ config, helpService }));
  registry.registerMany(createModerationCommandDescriptors({ metrics, warningService }));
  return registry;
}
