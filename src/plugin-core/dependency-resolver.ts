import type { PluginManifest, ValidatedPluginEntry } from './contracts.js';
import { diagnostic, PluginCoreError } from './errors.js';

const parse = (version: string) => version.split(/[.+-]/, 3).map(Number) as [number, number, number];
const satisfies = (version: string, range: string): boolean => {
  const [major, minor, patch] = parse(version);
  if (range === '*' || range === version) return true;
  if (range.startsWith('^')) {
    const [wantedMajor, wantedMinor, wantedPatch] = parse(range.slice(1));
    return major === wantedMajor && (minor > wantedMinor || (minor === wantedMinor && patch >= wantedPatch));
  }
  if (range.startsWith('~')) {
    const [wantedMajor, wantedMinor, wantedPatch] = parse(range.slice(1));
    return major === wantedMajor && minor === wantedMinor && patch >= wantedPatch;
  }
  const match = /^(>=|>|<=|<)(\d+\.\d+\.\d+)$/.exec(range);
  if (!match) return false;
  const actual = major * 1e12 + minor * 1e6 + patch;
  const [a, b, c] = parse(match[2]!);
  const wanted = a * 1e12 + b * 1e6 + c;
  return match[1] === '>=' ? actual >= wanted : match[1] === '>' ? actual > wanted : match[1] === '<=' ? actual <= wanted : actual < wanted;
};

export function resolveDependencies(entries: readonly ValidatedPluginEntry[]): readonly ValidatedPluginEntry[] {
  const byId = new Map(entries.map((entry) => [entry.manifest.id, entry]));
  const diagnostics = [];
  for (const entry of entries) for (const dependency of entry.manifest.dependencies) {
    const target = byId.get(dependency.id);
    if (!target) diagnostics.push(diagnostic('MISSING_DEPENDENCY', `"${entry.manifest.id}" requires missing "${dependency.id}".`, { pluginId: entry.manifest.id, path: [entry.manifest.id, dependency.id] }));
    else if (!satisfies(target.manifest.version, dependency.range)) diagnostics.push(diagnostic('DEPENDENCY_RANGE_MISMATCH', `"${entry.manifest.id}" requires "${dependency.id}" ${dependency.range}, found ${target.manifest.version}.`, { pluginId: entry.manifest.id, path: [entry.manifest.id, dependency.id] }));
  }
  if (diagnostics.length) throw new PluginCoreError(diagnostics);
  const result: ValidatedPluginEntry[] = [];
  const visited = new Set<string>();
  const active: string[] = [];
  const visit = (manifest: PluginManifest): void => {
    const cycleAt = active.indexOf(manifest.id);
    if (cycleAt >= 0) throw new PluginCoreError([diagnostic('DEPENDENCY_CYCLE', `Dependency cycle: ${[...active.slice(cycleAt), manifest.id].join(' -> ')}.`, { pluginId: manifest.id, path: [...active.slice(cycleAt), manifest.id] })]);
    if (visited.has(manifest.id)) return;
    active.push(manifest.id);
    for (const dependency of [...manifest.dependencies].sort((a, b) => a.id.localeCompare(b.id))) visit(byId.get(dependency.id)!.manifest);
    active.pop();
    visited.add(manifest.id);
    result.push(byId.get(manifest.id)!);
  };
  for (const entry of [...entries].sort((a, b) => a.manifest.id.localeCompare(b.manifest.id))) visit(entry.manifest);
  return Object.freeze(result);
}
