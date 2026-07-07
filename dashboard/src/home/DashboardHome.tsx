import { Boxes, History, Settings, ShieldCheck, Volume2 } from 'lucide-react';

import { Button, Card, EmptyState, Section, SectionHeader, Skeleton, StatCard, StatusBadge } from '../components/index.js';
import type { ModuleManifest } from '../contracts.js';
import { useOptionalAuth } from '../auth/AuthContext.js';
import { PageHeader } from '../layout/PageHeader.js';

function sortedManifests(manifests: ModuleManifest[]): ModuleManifest[] {
  return [...manifests].sort(
    (a, b) =>
      (a.dashboard?.homePage.priority ?? Number.MAX_SAFE_INTEGER) -
      (b.dashboard?.homePage.priority ?? Number.MAX_SAFE_INTEGER),
  );
}

const quickActions = [
  { label: 'Configure Voice', description: 'Tune voice module settings.', icon: Volume2, moduleHint: 'voice' },
  { label: 'Configure Welcome', description: 'Review member greeting flows.', icon: Boxes, moduleHint: 'welcome' },
  { label: 'Configure Moderation', description: 'Manage safety controls.', icon: ShieldCheck, moduleHint: 'moderation' },
  { label: 'View Logs', description: 'Inspect recent bot activity.', icon: History, moduleHint: 'logging' },
  { label: 'Manage Settings', description: 'Open available configuration.', icon: Settings, moduleHint: undefined },
];

const recentActivity = [
  { title: 'Dashboard shell updated', description: 'Application navigation is ready for the v3.2 redesign.', time: 'Now' },
  { title: 'Security baseline active', description: 'v3.1 authentication and authorization remain unchanged.', time: 'Today' },
  { title: 'Module metadata loaded', description: 'Dashboard modules are rendered from existing platform contracts.', time: 'Today' },
];

export function DashboardHome({ manifests }: { manifests: ModuleManifest[] }) {
  const auth = useOptionalAuth();
  const guildName = auth?.selectedGuild?.name ?? 'Current guild';
  const orderedManifests = sortedManifests(manifests);
  const featuredCount = manifests.filter((manifest) => manifest.dashboard?.homePage.featured).length;
  const hotReloadCount = manifests.filter((manifest) => manifest.supportsHotReload).length;

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={<Button variant="primary">Manage Settings</Button>}
        description="Monitor guild configuration, review module status, and jump into the most important bot controls from one developer-focused workspace."
        status={<StatusBadge status="online">Operational</StatusBadge>}
        title="Dashboard Home"
      >
        <div className="flex flex-wrap items-center gap-3 text-small text-dashboard-text-secondary">
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface px-3 py-1">
            Guild: <span className="font-medium text-dashboard-text-primary">{guildName}</span>
          </span>
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface px-3 py-1">
            {manifests.length} modules available
          </span>
        </div>
      </PageHeader>

      <Section>
        <SectionHeader
          description="High-level operational signals for this guild workspace."
          title="Overview"
        />
        <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-5">
          <StatCard description="Loaded from module manifests." label="Modules Enabled" value={manifests.length} />
          <StatCard description="Featured for dashboard access." label="Configured Modules" value={featuredCount} />
          <StatCard description="Audit UI arrives in a later milestone." label="Audit Events" value="0" />
          <StatCard description="Dashboard API reachable." label="System Status" value="Healthy" />
          <StatCard description={`${hotReloadCount} support hot reload.`} label="Bot Status" value="Online" />
        </div>
      </Section>

      <Section>
        <SectionHeader
          description="Common workflows stay close to the top of the workspace."
          title="Quick Actions"
        />
        <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-5">
          {quickActions.map((action) => {
            const target = action.moduleHint
              ? orderedManifests.find((manifest) => manifest.name.toLowerCase().includes(action.moduleHint))
              : orderedManifests[0];
            const Icon = action.icon;

            return (
              <Card className="grid content-between gap-4" key={action.label} variant="interactive">
                <div className="grid gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-dashboard-accent-muted text-dashboard-accent-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-small font-semibold text-dashboard-text-primary">{action.label}</h3>
                    <p className="mt-1 text-caption text-dashboard-text-secondary">{action.description}</p>
                  </div>
                </div>
                <Button
                  disabled={!target}
                  onClick={() => {
                    if (target) {
                      window.location.href = `/modules/${encodeURIComponent(target.id)}${window.location.search}`;
                    }
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Open
                </Button>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section>
        <SectionHeader
          description="Each module card uses existing metadata and links to the current module route."
          title="Module Overview"
        />
        {orderedManifests.length > 0 ? (
          <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
            {orderedManifests.map((manifest) => (
              <Card className="grid gap-5" key={manifest.id} variant="interactive">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-dashboard-text-primary shadow-elevation-1" style={{ background: manifest.color }}>
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-heading-m text-dashboard-text-primary">{manifest.name}</h3>
                      <p className="text-caption text-dashboard-text-tertiary">v{manifest.version}</p>
                    </div>
                  </div>
                  <StatusBadge status={manifest.supportsHotReload ? 'enabled' : 'pending'}>
                    {manifest.supportsHotReload ? 'Hot reload' : 'Restart'}
                  </StatusBadge>
                </div>
                <p className="text-small text-dashboard-text-secondary">{manifest.description}</p>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status="enabled">{manifest.category}</StatusBadge>
                  <Button
                    onClick={() => {
                      window.location.href = `/modules/${encodeURIComponent(manifest.id)}${window.location.search}`;
                    }}
                    size="sm"
                    variant="primary"
                  >
                    Configure
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            action="Refresh modules"
            description="No module metadata is available for this guild yet."
            title="No modules available"
          />
        )}
      </Section>

      <div className="grid gap-4 desktop:grid-cols-[1fr_360px]">
        <Section>
          <SectionHeader
            description="Placeholder activity keeps the future audit timeline shape visible without adding backend scope."
            title="Recent Activity"
          />
          <Card className="grid gap-0">
            {recentActivity.map((item, index) => (
              <div className="grid grid-cols-[auto_1fr] gap-3 border-b border-dashboard-border-subtle py-4 first:pt-0 last:border-b-0 last:pb-0" key={item.title}>
                <div className="flex flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-dashboard-accent-primary" />
                  {index < recentActivity.length - 1 ? <span className="mt-2 h-full w-px bg-dashboard-border-subtle" /> : null}
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-small font-semibold text-dashboard-text-primary">{item.title}</h3>
                    <span className="text-caption text-dashboard-text-tertiary">{item.time}</span>
                  </div>
                  <p className="mt-1 text-small text-dashboard-text-secondary">{item.description}</p>
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <Section>
          <SectionHeader description="Current frontend-visible health indicators." title="System Health" />
          <Card className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Dashboard API</span>
              <StatusBadge status="online">Online</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Authentication</span>
              <StatusBadge status="enabled">Protected</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Module metadata</span>
              <StatusBadge status={manifests.length > 0 ? 'enabled' : 'unknown'}>
                {manifests.length > 0 ? 'Loaded' : 'Empty'}
              </StatusBadge>
            </div>
            <div aria-hidden className="grid gap-2 pt-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
