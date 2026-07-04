import { Boxes } from 'lucide-react';

import type { ModuleManifest, SettingMetadata } from '../contracts.js';
import { SettingsRenderer } from '../settings/SettingsRenderer.js';

export interface ModulePageProps {
  manifest: ModuleManifest;
  settings: SettingMetadata[];
  values?: Record<string, unknown>;
}

export function ModulePage({ manifest, settings, values }: ModulePageProps) {
  const groups = [...(manifest.dashboard?.settings.groups ?? [])].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );

  return (
    <section className="grid gap-6">
      <header className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-md text-white" style={{ background: manifest.color }}>
          <Boxes className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{manifest.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{manifest.description}</p>
        </div>
      </header>

      {groups.map((group) => {
        const groupSettings = settings
          .filter((setting) => setting.group === group.key)
          .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

        if (groupSettings.length === 0) {
          return null;
        }

        return (
          <section className="grid gap-3" key={group.key}>
            <div>
              <h2 className="text-base font-semibold text-slate-950">{group.label}</h2>
              {group.description ? <p className="mt-1 text-sm text-slate-600">{group.description}</p> : null}
            </div>
            <SettingsRenderer initialValues={values} settings={groupSettings} />
          </section>
        );
      })}
    </section>
  );
}
