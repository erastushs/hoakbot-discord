import { AlertTriangle, Bot, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Alert, Button, Card, EmptyState, Input, Section, SectionHeader, Select, Skeleton, StatusBadge, Switch } from '../components/index.js';
import type { ModuleManifest, SettingMetadata } from '../contracts.js';
import { PageHeader } from '../layout/PageHeader.js';

interface GeneralModulePageProps {
  manifest: ModuleManifest;
  onSave?(values: Record<string, unknown>): Promise<void>;
  settings: SettingMetadata[];
  values?: Record<string, unknown>;
}

export function GeneralModulePage({ manifest, onSave, settings, values: initialValues }: GeneralModulePageProps) {
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
  }, [defaultValues, settingsFingerprint]);

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

  return (
    <div className="grid gap-8">
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
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface px-3 py-1">
            {configuredCount} settings
          </span>
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface px-3 py-1">
            {restartCount} restart-sensitive
          </span>
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface px-3 py-1">
            v{manifest.version}
          </span>
        </div>
      </PageHeader>

      <Section>
        <SectionHeader description="General controls define command behavior and bot presentation across this guild." title="Overview" />
        <div className="grid gap-4 tablet:grid-cols-3">
          <Card className="grid gap-3">
            <Bot className="h-5 w-5 text-dashboard-accent-primary" />
            <div>
              <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Module</p>
              <p className="mt-1 text-heading-m text-dashboard-text-primary">Core utility</p>
            </div>
          </Card>
          <Card className="grid gap-3">
            <ShieldCheck className="h-5 w-5 text-dashboard-success" />
            <div>
              <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Configuration</p>
              <p className="mt-1 text-heading-m text-dashboard-text-primary">{configuredCount} settings</p>
            </div>
          </Card>
          <Card className="grid gap-3">
            <AlertTriangle className="h-5 w-5 text-dashboard-warning" />
            <div>
              <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">Runtime</p>
              <p className="mt-1 text-heading-m text-dashboard-text-primary">Restart aware</p>
            </div>
          </Card>
        </div>
      </Section>

      <Section>
        <SectionHeader
          actions={
            <Button disabled={!onSave || dirtyKeys.size === 0 || saveStatus === 'saving'} onClick={() => void save()} variant="primary">
              {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
            </Button>
          }
          description="Changes use the existing settings API and preserve current dashboard behavior."
          title="Configuration"
        />
        {settings.length > 0 ? (
          <div className="grid gap-4">
            {groups.map((group) => {
              const groupSettings = settings
                .filter((setting) => setting.group === group.key)
                .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

              if (groupSettings.length === 0) {
                return null;
              }

              return (
                <Card className="grid gap-5" key={group.key}>
                  <SectionHeader description={group.description} title={group.label} />
                  <div className="grid gap-4">
                    {groupSettings.map((setting) => (
                      <GeneralSettingControl
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
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!onSave || dirtyKeys.size === 0 || saveStatus === 'saving'} onClick={() => void save()} variant="primary">
                {saveStatus === 'saving' ? 'Saving' : 'Save changes'}
              </Button>
              {saveStatus === 'saved' ? <StatusBadge status="enabled">Saved</StatusBadge> : null}
              {saveStatus === 'error' ? <StatusBadge status="error">Save failed</StatusBadge> : null}
              {error ? <span className="text-small text-dashboard-danger">{error}</span> : null}
            </div>
          </div>
        ) : (
          <EmptyState description="No General settings are available from the current backend metadata." title="No settings available" />
        )}
      </Section>

      <div className="grid gap-4 desktop:grid-cols-[1fr_360px]">
        <Section>
          <SectionHeader description="Permission controls are not exposed by the current backend contract." title="Permissions" />
          <Alert
            description="This placeholder preserves the module template without inventing new authorization behavior."
            title="Permission management is unavailable for this module."
            variant="info"
          />
        </Section>

        <Section>
          <SectionHeader description="Current frontend-visible module state." title="Status" />
          <Card className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Module metadata</span>
              <StatusBadge status="enabled">Loaded</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Hot reload</span>
              <StatusBadge status={manifest.supportsHotReload ? 'enabled' : 'pending'}>{manifest.supportsHotReload ? 'Supported' : 'Restart'}</StatusBadge>
            </div>
            <div aria-hidden className="grid gap-2 pt-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          </Card>
        </Section>
      </div>

      <Section>
        <SectionHeader description="Reserved for destructive General module operations if the backend exposes them later." title="Danger Zone" />
        <Card variant="danger">
          <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
            <div className="flex items-start gap-3">
              <Lock className="mt-1 h-5 w-5 text-dashboard-danger" />
              <div>
                <h3 className="text-small font-semibold text-dashboard-text-primary">No destructive actions available</h3>
                <p className="mt-1 text-small text-dashboard-text-secondary">General settings currently expose configuration only. No backend destructive action exists.</p>
              </div>
            </div>
            <Button disabled variant="danger">Unavailable</Button>
          </div>
        </Card>
      </Section>
    </div>
  );
}

function GeneralSettingControl({
  onChange,
  setting,
  value,
}: {
  onChange(value: unknown): void;
  setting: SettingMetadata;
  value: unknown;
}) {
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

  return (
    <Input
      description={setting.description}
      label={setting.label}
      max={setting.max}
      min={setting.min}
      onChange={(event) => onChange(setting.type === 'number' ? Number(event.target.value) : event.target.value)}
      placeholder={setting.placeholder}
      step={setting.step}
      type={setting.type === 'number' ? 'number' : 'text'}
      value={typeof value === 'number' || typeof value === 'string' ? value : ''}
    />
  );
}
