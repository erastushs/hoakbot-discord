import { AlertTriangle, Bot, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button, Card, EmptyState, Input, Section, SectionHeader, Select, StatusBadge, Switch, Textarea } from '../components/index.js';
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
  const restartCount = settings.filter((setting) => setting.restartRequired).length;
  const moduleSummary = moduleSummaryLabel(manifest);

  return (
    <div className="grid gap-10">
      <PageHeader
        actions={
          <Button disabled={!onSave || dirtyKeys.size === 0 || saveStatus === 'saving'} onClick={() => void save()} variant="primary">
            {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
          </Button>
        }
        description={manifest.description}
        status={<StatusBadge status={manifest.supportsHotReload ? 'enabled' : 'pending'}>{manifest.supportsHotReload ? 'Live updates' : 'Restart required'}</StatusBadge>}
        title={manifest.name}
      >
        <div className="flex flex-wrap items-center gap-3 text-small text-dashboard-text-secondary">
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface/68 px-3 py-1 shadow-elevation-1 backdrop-blur-xl">
            {configuredCount} settings
          </span>
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface/68 px-3 py-1 shadow-elevation-1 backdrop-blur-xl">
            {restartCount} restart-sensitive
          </span>
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface/68 px-3 py-1 shadow-elevation-1 backdrop-blur-xl">
            v{manifest.version}
          </span>
        </div>
      </PageHeader>

      <Section>
        <SectionHeader description={`${manifest.name} controls are rendered from existing module metadata and current settings values.`} title="Overview" />
        <div className="grid gap-5 tablet:grid-cols-3">
          <Card className="grid gap-3 p-6">
            <Bot className="h-5 w-5 text-dashboard-text-secondary" />
            <div>
              <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Module</p>
              <p className="mt-1 text-heading-m text-dashboard-text-primary">{moduleSummary}</p>
            </div>
          </Card>
          <Card className="grid gap-3 p-6">
            <ShieldCheck className="h-5 w-5 text-dashboard-success" />
            <div>
              <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Configuration</p>
              <p className="mt-1 text-heading-m text-dashboard-text-primary">{configuredCount} settings</p>
            </div>
          </Card>
          <Card className="grid gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-dashboard-warning" />
            <div>
              <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Runtime</p>
              <p className="mt-1 text-heading-m text-dashboard-text-primary">{manifest.supportsHotReload ? 'Live updates' : 'Restart aware'}</p>
            </div>
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
                <Card className="grid gap-6 p-6" key={group.key}>
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
            <div className="sticky bottom-4 z-sticky rounded-2xl border border-dashboard-border-subtle bg-dashboard-bg-surface/82 p-3 shadow-elevation-2 backdrop-blur-2xl">
              <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
                <div className="min-w-0">
                  <p className="text-small font-medium text-dashboard-text-primary">Configuration changes</p>
                  <p className="text-caption text-dashboard-text-secondary">
                    {dirtyKeys.size > 0 ? `${dirtyKeys.size} unsaved setting${dirtyKeys.size === 1 ? '' : 's'}` : 'No unsaved changes'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {saveStatus === 'saved' ? <StatusBadge status="enabled">Saved</StatusBadge> : null}
                  {saveStatus === 'error' ? <StatusBadge status="error">Save failed</StatusBadge> : null}
                  {error ? <span className="text-small text-dashboard-danger" role="alert">{error}</span> : null}
                  <Button disabled={!onSave || dirtyKeys.size === 0 || saveStatus === 'saving'} isLoading={saveStatus === 'saving'} onClick={() => void save()} variant="primary">
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

      <div className="grid gap-5 desktop:grid-cols-[1fr_360px]">
        <Section>
          <SectionHeader description="Current frontend-visible module state." title="Status" />
          <Card className="grid gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Module metadata</span>
              <StatusBadge status="enabled">Loaded</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Hot reload</span>
              <StatusBadge status={manifest.supportsHotReload ? 'enabled' : 'pending'}>{manifest.supportsHotReload ? 'Supported' : 'Restart'}</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Configured settings</span>
              <span className="text-small font-medium text-dashboard-text-primary">{configuredCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Restart-sensitive</span>
              <span className="text-small font-medium text-dashboard-text-primary">{restartCount}</span>
            </div>
          </Card>
        </Section>

        <Section>
          <SectionHeader description="Existing authorization protects reads and writes for this module." title="Access" />
          <Card className="grid gap-4 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-dashboard-success" />
              <div>
                <h3 className="text-small font-semibold text-dashboard-text-primary">Protected configuration</h3>
                <p className="mt-1 text-small text-dashboard-text-secondary">Changes are submitted through the existing authorized settings API.</p>
              </div>
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
