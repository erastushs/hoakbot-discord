import { useEffect, useMemo, useRef, useState } from 'react';

import { Button, Card, EmptyState, Input, Section, SectionHeader, Select, Switch, Textarea } from '../components/index.js';
import type { DashboardSettingGroup, ModuleManifest, SettingMetadata } from '../contracts.js';
import { PageHeader } from '../layout/PageHeader.js';

export interface SharedModulePageProps {
  manifest: ModuleManifest;
  onSave?(values: Record<string, unknown>): Promise<void>;
  onSetEnabled?(enabled: boolean): Promise<void>;
  settings: SettingMetadata[];
  values?: Record<string, unknown>;
}

export function SharedModulePage({ manifest, onSave, onSetEnabled, settings, values: initialValues }: SharedModulePageProps) {
  const groups = useMemo(
    () => [...(manifest.dashboard?.settings.groups ?? [])].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)),
    [manifest.dashboard?.settings.groups],
  );
  const settingsGroups = useMemo(() => groupedSettings(settings, groups), [groups, settings]);
  const settingsFingerprint = useMemo(() => settings.map((setting) => setting.key).join('\0'), [settings]);
  const defaultValues = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.key, initialValues?.[setting.key] ?? setting.defaultValue])),
    [initialValues, settings],
  );
  const [values, setValues] = useState<Record<string, unknown>>(defaultValues);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string>();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toggleStatus, setToggleStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [toggleError, setToggleError] = useState<string>();
  const formRevision = useMemo(() => JSON.stringify([manifest.id, settingsFingerprint, defaultValues]), [defaultValues, manifest.id, settingsFingerprint]);
  const previousFormRevision = useRef(formRevision);

  useEffect(() => {
    if (previousFormRevision.current === formRevision) return;
    previousFormRevision.current = formRevision;
    setValues(defaultValues);
    setDirtyKeys(new Set());
    setSaveStatus('idle');
    setError(undefined);
    setValidationErrors({});
  }, [defaultValues, formRevision]);

  async function save() {
    if (!onSave || dirtyKeys.size === 0) {
      return;
    }

    const nextValidationErrors = validateDirtySettings(settings, values, dirtyKeys);
    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setSaveStatus('error');
      setError('Fix validation errors before saving.');
      return;
    }

    setSaveStatus('saving');
    setError(undefined);

    try {
      await onSave(normalizedDirtySettings(settings, values, dirtyKeys));
      setDirtyKeys(new Set());
      setSaveStatus('saved');
    } catch (saveError) {
      setSaveStatus('error');
      setError(saveError instanceof Error ? saveError.message : 'Settings could not be saved.');
    }
  }

  function updateValue(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirtyKeys((current) => new Set(current).add(key));
    setValidationErrors((current) => {
      const remaining = { ...current };
      delete remaining[key];
      return remaining;
    });
    setSaveStatus('idle');
    setError(undefined);
  }

  async function toggleEnabled() {
    if (!onSetEnabled) return;
    setToggleStatus('saving');
    setToggleError(undefined);
    try {
      await onSetEnabled(!(manifest.enabled ?? true));
      setToggleStatus('idle');
    } catch (toggleFailure) {
      setToggleStatus('error');
      setToggleError(toggleFailure instanceof Error ? toggleFailure.message : 'Module state could not be changed.');
    }
  }

  const configuredCount = settings.length;
  const moduleSummary = moduleSummaryLabel(manifest);

  return (
    <div className="grid gap-6 tablet:gap-8 wide:gap-10">
      <PageHeader
        actions={
          <div className="flex gap-2">
            {onSetEnabled ? <Button disabled={toggleStatus === 'saving'} isLoading={toggleStatus === 'saving'} onClick={() => void toggleEnabled()}>{toggleStatus === 'saving' ? 'Updating' : manifest.enabled ?? true ? 'Disable' : 'Enable'}</Button> : null}
            <Button disabled={manifest.enabled === false || !onSave || dirtyKeys.size === 0 || saveStatus === 'saving'} onClick={() => void save()} variant="primary">
              {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
            </Button>
          </div>
        }
        description={`${manifest.description} Version ${manifest.version}.`}
        title={manifest.name}
      />

      {toggleError ? <p className="text-small text-dashboard-danger" role="alert">{toggleError}</p> : null}

      <Section>
        <SectionHeader description={`${manifest.name} controls are rendered from existing module metadata and current settings values.`} title="Overview" />
        <div className="grid gap-4 tablet:grid-cols-2 wide:grid-cols-3 wide:gap-5">
          <Card className="grid gap-3 p-5">
            <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Module</p>
            <p className="text-heading-m text-dashboard-text-primary">{moduleSummary}</p>
          </Card>
          <Card className="grid gap-3 p-5">
            <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Health</p>
            <p className="text-heading-m text-dashboard-text-primary">{titleCase(manifest.health ?? 'available')}</p>
          </Card>
          <Card className="grid gap-3 p-5">
            <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Dependencies</p>
            <p className="text-heading-m text-dashboard-text-primary">{manifest.dependencies?.join(', ') || 'None'}</p>
          </Card>
          <Card className="grid gap-3 p-5">
            <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Configuration</p>
            <p className="text-heading-m text-dashboard-text-primary">{configuredCount} settings</p>
          </Card>
        </div>
      </Section>

      <Section>
        <SectionHeader
          description="Changes use the existing settings API and preserve current dashboard behavior."
          title="Configuration"
        />
        {settings.length > 0 ? (
          <div className="grid gap-5">
            {settingsGroups.map(({ group, settings: groupSettings }) => {
              return (
                <Card className="grid gap-5 p-5" key={group.key}>
                  <SectionHeader description={group.description} title={group.label} />
                  <div className="grid gap-5">
                    {groupSettings.map((setting) => (
                      <ModuleSettingControl
                        key={setting.key}
                         onChange={(value) => updateValue(setting.key, value)}
                         disabled={manifest.enabled === false}
                        error={validationErrors[setting.key]}
                        setting={setting}
                        value={values[setting.key]}
                      />
                    ))}
                  </div>
                </Card>
              );
            })}
            <div className="sticky bottom-3 z-sticky rounded-2xl border border-dashboard-border-subtle bg-dashboard-bg-surface/82 p-3 shadow-elevation-2 backdrop-blur-2xl tablet:bottom-4">
              <div className="flex flex-col gap-3 wide:flex-row wide:items-center wide:justify-between">
                <div className="min-w-0">
                  <p className="text-small font-medium text-dashboard-text-primary">Configuration changes</p>
                  <p className="text-caption text-dashboard-text-secondary">
                    {dirtyKeys.size > 0 ? `${dirtyKeys.size} unsaved setting${dirtyKeys.size === 1 ? '' : 's'}` : 'No unsaved changes'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {saveStatus === 'saved' ? <span className="text-small font-medium text-dashboard-success">Saved</span> : null}
                  {saveStatus === 'error' ? <span className="text-small font-medium text-dashboard-danger">Save failed</span> : null}
                  {error ? <span className="text-small text-dashboard-danger" role="alert">{error}</span> : null}
                  <Button className="w-full tablet:w-auto" disabled={!onSave || dirtyKeys.size === 0 || saveStatus === 'saving'} isLoading={saveStatus === 'saving'} onClick={() => void save()} variant="primary">
                    {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState description={`No ${manifest.name} settings are available from the current backend metadata.`} title="No settings available" />
        )}
      </Section>

      <div className="grid gap-4 wide:grid-cols-[1fr_360px] wide:gap-5">
        <Section>
          <SectionHeader description="Existing authorization protects reads and writes for this module." title="Access" />
          <Card className="grid gap-4 p-5">
            <div>
              <h3 className="text-small font-semibold text-dashboard-text-primary">Protected configuration</h3>
              <p className="mt-1 text-small text-dashboard-text-secondary">Changes are submitted through the existing authorized settings API.</p>
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function ModuleSettingControl({
  disabled,
  error,
  onChange,
  setting,
  value,
}: {
  disabled?: boolean;
  error?: string;
  onChange(value: unknown): void;
  setting: SettingMetadata;
  value: unknown;
}) {
  const controlId = `setting-${setting.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  if (setting.type === 'boolean') {
    return <Switch checked={Boolean(value)} description={setting.description} disabled={disabled} label={setting.label} onCheckedChange={onChange} />;
  }

  if (setting.type === 'select' && setting.options) {
    return (
      <Select
        description={setting.description}
        disabled={disabled}
        error={error}
        id={controlId}
        label={setting.label}
        name={setting.key}
        onChange={(event) => onChange(event.target.value)}
        options={setting.options}
        value={String(value ?? '')}
      />
    );
  }

  if (setting.type === 'text' || setting.type === 'template' || setting.type === 'json') {
    return (
      <Textarea
        description={setting.description}
        disabled={disabled}
        error={error}
        id={controlId}
        label={setting.label}
        maxLength={setting.maxLength}
        minLength={setting.minLength}
        name={setting.key}
        onChange={(event) => onChange(event.target.value)}
        placeholder={setting.placeholder}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  return (
    <Input
      description={setting.description}
      disabled={disabled}
      error={error}
      id={controlId}
      label={setting.label}
      max={setting.max}
      min={setting.min}
      name={setting.key}
      onChange={(event) => onChange(setting.type === 'number' ? event.target.value : event.target.value)}
      pattern={setting.pattern}
      placeholder={setting.placeholder ?? defaultPlaceholder(setting.type)}
      step={setting.step}
      type={setting.type === 'number' ? 'number' : 'text'}
      value={typeof value === 'number' || typeof value === 'string' ? value : ''}
    />
  );
}

function groupedSettings(settings: SettingMetadata[], groups: DashboardSettingGroup[]) {
  const groupKeys = new Set(groups.map((group) => group.key));
  const configuredGroups = groups
    .map((group) => ({
      group,
      settings: sortSettings(settings.filter((setting) => setting.group === group.key)),
    }))
    .filter(({ settings: groupSettings }) => groupSettings.length > 0);
  const ungrouped = sortSettings(settings.filter((setting) => !groupKeys.has(setting.group)));

  if (ungrouped.length === 0) {
    return configuredGroups;
  }

  return [
    ...configuredGroups,
    {
      group: {
        key: 'ungrouped',
        label: 'Ungrouped',
        description: 'Settings without dashboard group metadata.',
      },
      settings: ungrouped,
    },
  ];
}

function sortSettings(settings: SettingMetadata[]): SettingMetadata[] {
  return [...settings].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

function validateDirtySettings(settings: SettingMetadata[], values: Record<string, unknown>, dirtyKeys: Set<string>): Record<string, string> {
  const errors: Record<string, string> = {};
  const settingsByKey = new Map(settings.map((setting) => [setting.key, setting]));

  for (const key of dirtyKeys) {
    const setting = settingsByKey.get(key);
    if (!setting) {
      continue;
    }

    const message = validateSetting(setting, values[key]);
    if (message) {
      errors[key] = message;
    }
  }

  return errors;
}

function normalizedDirtySettings(settings: SettingMetadata[], values: Record<string, unknown>, dirtyKeys: Set<string>): Record<string, unknown> {
  const settingsByKey = new Map(settings.map((setting) => [setting.key, setting]));

  return Object.fromEntries(
    [...dirtyKeys].map((key) => {
      const setting = settingsByKey.get(key);
      const value = values[key];

      if ((setting?.type === 'number' || setting?.type === 'duration') && value !== '' && value !== null && value !== undefined) {
        return [key, Number(value)];
      }

      return [key, value];
    }),
  );
}

function validateSetting(setting: SettingMetadata, value: unknown): string | undefined {
  if (setting.type === 'boolean') {
    return typeof value === 'boolean' ? undefined : `${setting.label} must be true or false.`;
  }

  if (setting.type === 'number' || setting.type === 'duration') {
    return validateNumberSetting(setting, value);
  }

  if (setting.type === 'json') {
    const textError = validateTextSetting(setting, value);
    if (textError) {
      return textError;
    }

    if (String(value ?? '').trim() === '') {
      return undefined;
    }

    try {
      JSON.parse(String(value));
      return undefined;
    } catch {
      return `${setting.label} must be valid JSON.`;
    }
  }

  return validateTextSetting(setting, value);
}

function validateNumberSetting(setting: SettingMetadata, value: unknown): string | undefined {
  if (value === '' || value === null || value === undefined) {
    return requiresValue(setting) ? `${setting.label} is required.` : undefined;
  }

  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return `${setting.label} must be a valid number.`;
  }

  if (setting.step !== undefined && Number.isInteger(setting.step) && setting.step === 1 && !Number.isInteger(numberValue)) {
    return `${setting.label} must be a whole number.`;
  }

  if (setting.min !== undefined && numberValue < setting.min) {
    return `${setting.label} must be at least ${setting.min}.`;
  }

  if (setting.max !== undefined && numberValue > setting.max) {
    return `${setting.label} must be at most ${setting.max}.`;
  }

  return undefined;
}

function validateTextSetting(setting: SettingMetadata, value: unknown): string | undefined {
  const stringValue = value === null || value === undefined ? '' : String(value);

  if (stringValue.trim() === '' && requiresValue(setting)) {
    return `${setting.label} is required.`;
  }

  if (setting.minLength !== undefined && stringValue.length < setting.minLength) {
    return `${setting.label} must be at least ${setting.minLength} characters.`;
  }

  if (setting.maxLength !== undefined && stringValue.length > setting.maxLength) {
    return `${setting.label} must be at most ${setting.maxLength} characters.`;
  }

  if (setting.pattern && stringValue !== '') {
    try {
      if (!new RegExp(setting.pattern).test(stringValue)) {
        return `${setting.label} has an invalid format.`;
      }
    } catch {
      return undefined;
    }
  }

  if (setting.type === 'select' && setting.options && stringValue !== '' && !setting.options.some((option) => option.value === stringValue)) {
    return `${setting.label} must use an available option.`;
  }

  return undefined;
}

function requiresValue(setting: SettingMetadata): boolean {
  return Boolean(
    (typeof setting.defaultValue === 'string' && setting.defaultValue.trim() !== '') ||
      (typeof setting.defaultValue === 'number' && Number.isFinite(setting.defaultValue)) ||
      setting.minLength !== undefined ||
      setting.pattern !== undefined,
  );
}

function moduleSummaryLabel(manifest: ModuleManifest): string {
  return `${titleCase(manifest.category)} module`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function defaultPlaceholder(type: SettingMetadata['type']): string | undefined {
  if (type === 'channel') {
    return 'Discord channel ID';
  }

  if (type === 'role') {
    return 'Discord role ID';
  }

  if (type === 'user') {
    return 'Discord user ID';
  }

  return undefined;
}
