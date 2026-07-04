import type { SettingMetadata, SettingOption } from '../contracts.js';

export interface SettingControlProps {
  setting: SettingMetadata;
  value: unknown;
  onChange(value: unknown): void;
}

function options(setting: SettingMetadata): SettingOption[] {
  return setting.options ?? [];
}

export function SettingControl({ setting, value, onChange }: SettingControlProps) {
  const id = `setting-${setting.key}`;

  if (setting.type === 'boolean') {
    return (
      <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white p-4">
        <span>
          <span className="block text-sm font-medium text-slate-900">{setting.label}</span>
          <span className="block text-sm text-slate-500">{setting.description}</span>
        </span>
        <input
          aria-label={setting.label}
          checked={Boolean(value)}
          className="h-5 w-5"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
      </label>
    );
  }

  return (
    <label className="grid gap-2 rounded-md border border-slate-200 bg-white p-4" htmlFor={id}>
      <span>
        <span className="block text-sm font-medium text-slate-900">{setting.label}</span>
        <span className="block text-sm text-slate-500">{setting.description}</span>
      </span>
      {renderInput(setting, id, value, onChange)}
    </label>
  );
}

function renderInput(setting: SettingMetadata, id: string, value: unknown, onChange: (value: unknown) => void) {
  if (setting.type === 'number') {
    return (
      <input
        className="h-10 rounded-md border border-slate-200 px-3 text-sm"
        id={id}
        max={setting.max}
        min={setting.min}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        step={setting.step}
        type="number"
        value={typeof value === 'number' ? value : ''}
      />
    );
  }

  if (setting.type === 'select') {
    return (
      <select
        className="h-10 rounded-md border border-slate-200 px-3 text-sm"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={typeof value === 'string' ? value : ''}
      >
        {options(setting).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (setting.type === 'text' || setting.type === 'template') {
    return (
      <textarea
        className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-sm"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={setting.placeholder}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  return (
    <input
      className="h-10 rounded-md border border-slate-200 px-3 text-sm"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      placeholder={setting.placeholder ?? defaultPlaceholder(setting.type)}
      type="text"
      value={typeof value === 'string' ? value : ''}
    />
  );
}

function defaultPlaceholder(type: SettingMetadata['type']): string | undefined {
  if (type === 'channel') {
    return 'Discord channel ID';
  }

  if (type === 'role') {
    return 'Discord role ID';
  }

  return undefined;
}
