import { pluginManifestSchema } from './schema.js';
import { type ExclusiveCapabilityKind, type PluginCatalogEntry, type PluginManifest, type ValidatedPluginEntry } from './contracts.js';
import { diagnostic, PluginCoreError } from './errors.js';

function exclusiveCapabilities(manifest: PluginManifest): ReadonlyMap<ExclusiveCapabilityKind, readonly string[]> {
  const ownership = manifest.capabilities.ownership;
  const hasRouteOwnership = ownership.routes.owners.length > 0 || ownership.routes.contributors.length > 0;
  const hasEventOwnership = ownership.events.publishers.length > 0 || ownership.events.subscribers.length > 0;
  return new Map<ExclusiveCapabilityKind, readonly string[]>([
    ['settings', manifest.capabilities.settings],
    ['commands', ownership.commands.length ? ownership.commands : manifest.capabilities.commands],
    ['permissions', manifest.capabilities.permissions],
    ['routes', hasRouteOwnership ? ownership.routes.owners : manifest.capabilities.routes],
    ['events', hasEventOwnership ? ownership.events.publishers : manifest.capabilities.events],
    ['schedulers', ownership.schedulers],
    ['assets', ownership.assets],
  ]);
}

export function validateCatalog(catalog: readonly PluginCatalogEntry[]): readonly ValidatedPluginEntry[] {
  const diagnostics = [];
  const valid: ValidatedPluginEntry[] = [];
  for (const entry of catalog) {
    const result = pluginManifestSchema.safeParse(entry.manifest);
    if (!result.success) {
      diagnostics.push(
        diagnostic('INVALID_MANIFEST', result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')),
      );
    } else {
      valid.push(Object.freeze({ manifest: result.data, factory: entry.factory }));
    }
  }
  const ids = new Map<string, string>();
  const capabilities = new Map<string, string>();
  for (const entry of valid) {
    const id = entry.manifest.id;
    const owner = ids.get(id);
    if (owner) diagnostics.push(diagnostic('DUPLICATE_PLUGIN_ID', `Duplicate plugin id "${id}".`, { pluginId: id }));
    else ids.set(id, id);
    for (const [kind, values] of exclusiveCapabilities(entry.manifest)) {
      for (const value of values) {
        const key = `${kind}:${value}`;
        const existing = capabilities.get(key);
        if (existing) diagnostics.push(diagnostic('CAPABILITY_COLLISION', `${kind} "${value}" is declared by "${existing}" and "${id}".`, { pluginId: id, capability: kind, value }));
        else capabilities.set(key, id);
      }
    }
  }
  if (diagnostics.length) throw new PluginCoreError(diagnostics);
  return Object.freeze(valid);
}
