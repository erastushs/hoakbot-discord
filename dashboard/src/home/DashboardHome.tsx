import { Boxes, Building2 } from 'lucide-react';

import { Button, Card, EmptyState, Section, SectionHeader, StatCard, StatusBadge } from '../components/index.js';
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

export function DashboardHome({ manifests }: { manifests: ModuleManifest[] }) {
  const auth = useOptionalAuth();
  const guildName = auth?.selectedGuild?.name ?? 'Current guild';
  const orderedManifests = sortedManifests(manifests);
  const featuredCount = manifests.filter((manifest) => manifest.dashboard?.homePage.featured).length;
  const hotReloadCount = manifests.filter((manifest) => manifest.supportsHotReload).length;

  return (
    <div className="grid gap-10">
      <PageHeader
        description="Monitor guild configuration, review module status, and jump into the most important bot controls from one developer-focused workspace."
        status={<StatusBadge status="online">Operational</StatusBadge>}
        title="Dashboard Home"
      >
        <div className="flex flex-wrap items-center gap-3 text-small text-dashboard-text-secondary">
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface/68 px-3 py-1 shadow-elevation-1 backdrop-blur-xl">
            Guild: <span className="font-medium text-dashboard-text-primary">{guildName}</span>
          </span>
          <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface/68 px-3 py-1 shadow-elevation-1 backdrop-blur-xl">
            {manifests.length} modules available
          </span>
        </div>
      </PageHeader>

      <Section>
        <SectionHeader
          description="High-level operational signals for this guild workspace."
          title="Overview"
        />
        <div className="grid auto-rows-fr gap-5 tablet:grid-cols-2 desktop:grid-cols-4">
          <StatCard description="Loaded from module manifests." label="Modules Enabled" value={manifests.length} />
          <StatCard description="Featured for dashboard access." label="Configured Modules" value={featuredCount} />
          <StatCard description="Dashboard API reachable." label="System Status" value="Healthy" />
          <StatCard description={`${hotReloadCount} support hot reload.`} label="Bot Status" value="Online" />
        </div>
      </Section>

      <Section>
        <SectionHeader
          description="Every module card is generated from existing metadata and links to the current module route."
          title="Modules"
        />
        {orderedManifests.length > 0 ? (
          <div className="grid auto-rows-fr gap-5 tablet:grid-cols-2 desktop:grid-cols-3">
            {orderedManifests.map((manifest) => (
              <Card className="grid h-full gap-5 p-5" key={manifest.id} variant="interactive">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-dashboard-border-subtle bg-dashboard-bg-muted/62 text-dashboard-text-secondary shadow-elevation-0">
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
                  <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-muted/62 px-2.5 py-1 text-caption font-medium text-dashboard-text-secondary">{manifest.category}</span>
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

      <div className="grid gap-5 desktop:grid-cols-[1fr_360px]">
        <Section className="h-full">
          <SectionHeader
            description="Current selected workspace from the authenticated session."
            title="Guild"
          />
          <Card className="grid h-full content-start gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-dashboard-border-subtle bg-dashboard-bg-muted/62 text-dashboard-text-secondary shadow-elevation-0">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-body font-semibold text-dashboard-text-primary">{guildName}</h3>
                <p className="text-small text-dashboard-text-secondary">Selected guild workspace</p>
              </div>
            </div>
            <div className="grid gap-3 pt-2 tablet:grid-cols-2">
              <div>
                <p className="text-caption uppercase tracking-[0.16em] text-dashboard-text-tertiary">Available modules</p>
                <p className="mt-1 text-body font-semibold text-dashboard-text-primary">{manifests.length}</p>
              </div>
              <div>
                <p className="text-caption uppercase tracking-[0.16em] text-dashboard-text-tertiary">Live updates</p>
                <p className="mt-1 text-body font-semibold text-dashboard-text-primary">{hotReloadCount}</p>
              </div>
            </div>
          </Card>
        </Section>

        <Section className="h-full">
          <SectionHeader description="Current frontend-visible health indicators." title="System Health" />
          <Card className="grid h-full content-start gap-3 p-5">
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
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-dashboard-text-secondary">Configuration mode</span>
              <StatusBadge status="enabled">Metadata driven</StatusBadge>
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
