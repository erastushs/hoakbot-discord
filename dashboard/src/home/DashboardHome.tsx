import { Boxes } from 'lucide-react';

import type { ModuleManifest } from '../contracts.js';

function sortedManifests(manifests: ModuleManifest[]): ModuleManifest[] {
  return [...manifests].sort(
    (a, b) =>
      (a.dashboard?.homePage.priority ?? Number.MAX_SAFE_INTEGER) -
      (b.dashboard?.homePage.priority ?? Number.MAX_SAFE_INTEGER),
  );
}

export function DashboardHome({ manifests }: { manifests: ModuleManifest[] }) {
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard Home</h1>
        <p className="mt-1 text-sm text-slate-600">Available modules are rendered from platform metadata.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sortedManifests(manifests).map((manifest) => (
          <a
            className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400"
            href={`/modules/${encodeURIComponent(manifest.id)}${window.location.search}`}
            key={manifest.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md text-white" style={{ background: manifest.color }}>
                <Boxes className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                {manifest.category}
              </span>
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-950">{manifest.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{manifest.description}</p>
            <p className="mt-3 text-xs text-slate-500">v{manifest.version}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
