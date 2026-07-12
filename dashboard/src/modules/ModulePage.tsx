import type { ModuleManifest, SettingMetadata } from '../contracts.js';
import { SharedModulePage } from './SharedModulePage.js';

export interface ModulePageProps {
  manifest: ModuleManifest;
  onSave?(values: Record<string, unknown>): Promise<void>;
  onSetEnabled?(enabled: boolean): Promise<void>;
  settings: SettingMetadata[];
  values?: Record<string, unknown>;
}

export function ModulePage({ manifest, onSave, onSetEnabled, settings, values }: ModulePageProps) {
  return <SharedModulePage manifest={manifest} onSave={onSave} onSetEnabled={onSetEnabled} settings={settings} values={values} />;
}
