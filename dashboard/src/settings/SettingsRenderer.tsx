import { useEffect, useMemo, useState } from 'react';

import { Button } from '../components/index.js';
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
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={dirtyKeys.size === 0 || saveStatus === 'saving'}
            isLoading={saveStatus === 'saving'}
            onClick={() => void save()}
            variant="primary"
          >
            {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
          </Button>
          {saveStatus === 'saved' ? <span className="text-small font-medium text-dashboard-success">Saved</span> : null}
          {saveStatus === 'error' ? <span className="text-small text-dashboard-danger" role="alert">{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
