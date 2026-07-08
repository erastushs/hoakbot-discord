import { useEffect, useMemo, useState } from 'react';

import { Button, Card, EmptyState, Input, Section, SectionHeader, Select, Switch, Textarea } from '../components/index.js';
import type { ModuleManifest, SettingMetadata } from '../contracts.js';
import { PageHeader } from '../layout/PageHeader.js';

export interface SharedModulePageProps {
  manifest: ModuleManifest;
  onSave?(values: Record<string, unknown>): Promise<void>;
  settings: SettingMetadata[];
  values?: Record<string, unknown>;
}

export function SharedModulePage({ manifest, onSave, settings, values: initialValues }: SharedModulePageProps) {
  const groups = useMemo(
    () => [...(manifest.dashboard?.settings.groups ?? [])].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)),
    [manifest.dashboard?.settings.groups],
  );
  const settingsFingerprint = useMemo(() => settings.map((setting) => setting.key).join('\0'), [settings]);
  const defaultValues = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.key, initialValues?.[setting.key] ?? setting.defaultValue])),
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

  function updateValue(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirtyKeys((current) => new Set(current).add(key));
    setSaveStatus('idle');
    setError(undefined);
  }

  const configuredCount = settings.length;
  const moduleSummary = moduleSummaryLabel(manifest);

  return (
    <div className="grid gap-6 tablet:gap-8 wide:gap-10">
      <PageHeader
        actions={
          <Button disabled={!onSave || dirtyKeys.size === 0 || saveStatus === 'saving'} onClick={() => void save()} variant="primary">
            {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
          </Button>
        }
        description={`${manifest.description} Version ${manifest.version}.`}
        title={manifest.name}
      />

      <Section>
        <SectionHeader description={`${manifest.name} controls are rendered from existing module metadata and current settings values.`} title="Overview" />
        <div className="grid gap-4 tablet:grid-cols-2 wide:grid-cols-3 wide:gap-5">
          <Card className="grid gap-3 p-5">
            <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Module</p>
            <p className="text-heading-m text-dashboard-text-primary">{moduleSummary}</p>
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
            {groups.map((group) => {
              const groupSettings = settings
                .filter((setting) => setting.group === group.key)
                .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

              if (groupSettings.length === 0) {
                return null;
              }

              return (
                <Card className="grid gap-5 p-5" key={group.key}>
                  <SectionHeader description={group.description} title={group.label} />
                  <div className="grid gap-5">
                    {groupSettings.map((setting) => (
                      <ModuleSettingControl
                        key={setting.key}
                        onChange={(value) => updateValue(setting.key, value)}
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
  onChange,
  setting,
  value,
}: {
  onChange(value: unknown): void;
  setting: SettingMetadata;
  value: unknown;
}) {
  if (setting.type === 'boolean') {
    return <Switch checked={Boolean(value)} description={setting.description} label={setting.label} onCheckedChange={onChange} />;
  }

  if (setting.type === 'select' && setting.options) {
    return (
      <Select
        description={setting.description}
        label={setting.label}
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
        label={setting.label}
        maxLength={setting.maxLength}
        minLength={setting.minLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={setting.placeholder}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  return (
    <Input
      description={setting.description}
      label={setting.label}
      max={setting.max}
      min={setting.min}
      onChange={(event) => onChange(setting.type === 'number' ? Number(event.target.value) : event.target.value)}
      placeholder={setting.placeholder ?? defaultPlaceholder(setting.type)}
      step={setting.step}
      type={setting.type === 'number' ? 'number' : 'text'}
      value={typeof value === 'number' || typeof value === 'string' ? value : ''}
    />
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
