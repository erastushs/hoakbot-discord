import { pluginManifestSchema } from './schema.js';
import { capabilityKinds, type PluginCatalogEntry, type ValidatedPluginEntry } from './contracts.js';
import { diagnostic, PluginCoreError } from './errors.js';

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
    for (const kind of capabilityKinds) {
      for (const value of entry.manifest.capabilities[kind]) {
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
