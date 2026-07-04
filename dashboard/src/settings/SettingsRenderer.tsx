import { useState } from 'react';

import type { SettingMetadata } from '../contracts.js';
import { SettingControl } from './SettingControl.js';

export function SettingsRenderer({ settings }: { settings: SettingMetadata[] }) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(settings.map((setting) => [setting.key, setting.defaultValue])),
  );

  return (
    <div className="grid gap-4">
      {settings.map((setting) => (
        <SettingControl
          key={setting.key}
          onChange={(value) => setValues((current) => ({ ...current, [setting.key]: value }))}
          setting={setting}
          value={values[setting.key]}
        />
      ))}
    </div>
  );
}
