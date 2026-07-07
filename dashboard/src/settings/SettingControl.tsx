import type { SettingMetadata, SettingOption } from '../contracts.js';
import { Card, Input, Select, Switch, Textarea } from '../components/index.js';

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
      <Switch
        checked={Boolean(value)}
        description={setting.description}
        label={setting.label}
        onCheckedChange={onChange}
      />
    );
  }

  return (
    <Card className="grid gap-4">
      {renderInput(setting, id, value, onChange)}
    </Card>
  );
}

function renderInput(setting: SettingMetadata, id: string, value: unknown, onChange: (value: unknown) => void) {
  if (setting.type === 'number') {
    return (
      <Input
        description={setting.description}
        id={id}
        label={setting.label}
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
      <Select
        description={setting.description}
        id={id}
        label={setting.label}
        onChange={(event) => onChange(event.target.value)}
        options={options(setting)}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  if (setting.type === 'text' || setting.type === 'template') {
    return (
      <Textarea
        description={setting.description}
        id={id}
        label={setting.label}
        onChange={(event) => onChange(event.target.value)}
        placeholder={setting.placeholder}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  return (
    <Input
      description={setting.description}
      id={id}
      label={setting.label}
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
