import { Boxes, Circle, Home } from 'lucide-react';

import { GuildSwitcher } from '../guilds/GuildSwitcher.js';
import type { ModuleManifest } from '../contracts.js';

function groupManifests(manifests: ModuleManifest[]): Array<[string, ModuleManifest[]]> {
  const visible = manifests.filter((manifest) => !manifest.dashboard?.navigation.hidden);
  const groups = new Map<string, ModuleManifest[]>();

  for (const manifest of visible) {
    const section = manifest.dashboard?.navigation.sidebarSection ?? manifest.category;
    groups.set(section, [...(groups.get(section) ?? []), manifest]);
  }

  return [...groups.entries()].map(([section, entries]) => [
    section,
    entries.sort(
      (a, b) =>
        (a.dashboard?.navigation.sidebarPriority ?? Number.MAX_SAFE_INTEGER) -
        (b.dashboard?.navigation.sidebarPriority ?? Number.MAX_SAFE_INTEGER),
    ),
  ]);
}

export function Sidebar({ manifests }: { manifests: ModuleManifest[] }) {
  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-200 bg-white px-4 py-5">
      <a className="flex h-10 items-center gap-2 text-base font-semibold text-slate-950" href="/">
        <Boxes className="h-5 w-5" />
        <span>Hoak Dashboard</span>
      </a>
      <div className="mt-6">
        <GuildSwitcher />
      </div>
      <nav aria-label="Modules" className="mt-6 flex-1 space-y-6">
        <a className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100" href="/">
          <Home className="h-4 w-4" />
          <span>Home</span>
        </a>
        {groupManifests(manifests).map(([section, entries]) => (
          <section key={section}>
            <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{section}</h2>
            <div className="mt-2 space-y-1">
              {entries.map((manifest) => (
                <a
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  href={`/modules/${encodeURIComponent(manifest.id)}`}
                  key={manifest.id}
                >
                  <Circle className="h-3 w-3" fill={manifest.color} style={{ color: manifest.color }} />
                  <span>{manifest.name}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
