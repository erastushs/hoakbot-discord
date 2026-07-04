import { useEffect, useMemo, useState } from 'react';

import type { SettingMetadata } from '../contracts.js';
import { SettingControl } from './SettingControl.js';

export function SettingsRenderer({
  initialValues,
  onSave,
  settings,
}: {
  initialValues?: Record<string, unknown>;
  onSave?(values: Record<string, unknown>): Promise<void>;
  settings: SettingMetadata[];
}) {
  const settingsFingerprint = useMemo(() => settings.map((setting) => setting.key).join('\0'), [settings]);
  const defaultValues = useMemo(
    () =>
      Object.fromEntries(
        settings.map((setting) => [setting.key, initialValues?.[setting.key] ?? setting.defaultValue]),
      ),
    [initialValues, settings],
  );
  const [values, setValues] = useState<Record<string, unknown>>(defaultValues);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string>();

  useEffect(() => {
    setValues(defaultValues);
    setDirtyKeys(new Set());
    setSaveStatus('idle');
    setError(undefined);
  }, [settingsFingerprint]);

  async function save() {
    if (!onSave || dirtyKeys.size === 0) {
      return;
    }

    setSaveStatus('saving');
    setError(undefined);

    try {
      await onSave(Object.fromEntries([...dirtyKeys].map((key) => [key, values[key]])));
      setDirtyKeys(new Set());
      setSaveStatus('saved');
    } catch (saveError) {
      setSaveStatus('error');
      setError(saveError instanceof Error ? saveError.message : 'Settings could not be saved.');
    }
  }

  return (
    <div className="grid gap-4">
      {settings.map((setting) => (
        <SettingControl
          key={setting.key}
          onChange={(value) => {
            setValues((current) => ({ ...current, [setting.key]: value }));
            setDirtyKeys((current) => new Set(current).add(setting.key));
            setSaveStatus('idle');
            setError(undefined);
          }}
          setting={setting}
          value={values[setting.key]}
        />
      ))}
      {onSave ? (
        <div className="flex items-center gap-3">
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={dirtyKeys.size === 0 || saveStatus === 'saving'}
            onClick={() => void save()}
            type="button"
          >
            {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
          </button>
          {saveStatus === 'saved' ? <span className="text-sm text-emerald-700">Saved</span> : null}
          {saveStatus === 'error' ? <span className="text-sm text-red-700">{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
