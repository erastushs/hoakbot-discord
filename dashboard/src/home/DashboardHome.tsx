import { Avatar, Button, Card, EmptyState, Section, SectionHeader } from '../components/index.js';
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
  const guild = auth?.selectedGuild;
  const guildName = guild?.name ?? 'Current guild';
  const orderedManifests = sortedManifests(manifests);

  return (
    <div className="grid gap-6 tablet:gap-8 wide:gap-10">
      <PageHeader
        description={`Configure modules for ${guildName} from the current authenticated Discord workspace.`}
        title="Dashboard Home"
      />

      <Section>
        <SectionHeader
          description="Every module card is generated from existing metadata and links to the current module route."
          title="Modules"
        />
        {orderedManifests.length > 0 ? (
          <div className="grid auto-rows-fr gap-4 tablet:grid-cols-2 wide:grid-cols-3 wide:gap-5">
            {orderedManifests.map((manifest) => (
              <Card className="grid h-full gap-5 p-5" key={manifest.id}>
                <div className="min-w-0">
                  <h3 className="truncate text-heading-m text-dashboard-text-primary">{manifest.name}</h3>
                  <p className="text-caption text-dashboard-text-tertiary">v{manifest.version}</p>
                </div>
                <p className="text-small text-dashboard-text-secondary">{manifest.description}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-caption font-medium text-dashboard-text-tertiary">{manifest.category}</span>
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
            description="No module metadata is available for this guild yet."
            title="No modules available"
          />
        )}
      </Section>

      <div className="grid gap-4 tablet:grid-cols-2 wide:grid-cols-[1fr_360px] wide:gap-5">
        <Section className="h-full">
          <SectionHeader
            description="Current selected workspace from the authenticated session."
            title="Guild"
          />
          <Card className="grid h-full content-start gap-4 p-5">
            <div className="flex items-center gap-3">
              <Avatar alt={guildName} className="rounded-lg ring-1 ring-white/10" fallback={guildInitial(guildName)} src={guild?.iconUrl} />
              <div className="min-w-0">
                <h3 className="truncate text-body font-semibold text-dashboard-text-primary">{guildName}</h3>
                <p className="text-small text-dashboard-text-secondary">Selected guild workspace</p>
              </div>
            </div>
            <div className="grid gap-3 pt-2">
              <div>
                <p className="text-caption uppercase tracking-[0.16em] text-dashboard-text-tertiary">Available modules</p>
                <p className="mt-1 text-body font-semibold text-dashboard-text-primary">{manifests.length}</p>
              </div>
            </div>
          </Card>
        </Section>

        <Section className="h-full">
          <SectionHeader description="Frontend-visible platform state from current dashboard data." title="System" />
          <Card className="grid h-full content-start gap-3 p-5">
            <SystemRow label="Dashboard API" status="success" value="Online" />
            <SystemRow label="Authentication" status="info" value="Protected" />
            <SystemRow label="Module metadata" status={manifests.length > 0 ? 'success' : 'warning'} value={manifests.length > 0 ? 'Loaded' : 'Empty'} />
            <SystemRow label="Configuration" status="info" value="Metadata driven" />
          </Card>
        </Section>
      </div>
    </div>
  );
}

function guildInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'G';
}

function SystemRow({ label, status, value }: { label: string; status: 'info' | 'success' | 'warning'; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-small text-dashboard-text-secondary">{label}</span>
      <span className="inline-flex items-center gap-2 text-small font-medium text-dashboard-text-primary">
        <span aria-hidden className={`h-2 w-2 rounded-full ${statusClassName(status)}`} />
        {value}
      </span>
    </div>
  );
}

function statusClassName(status: 'info' | 'success' | 'warning'): string {
  if (status === 'success') {
    return 'bg-dashboard-success shadow-[0_0_12px_oklch(0.7_0.085_155_/_0.42)]';
  }

  if (status === 'warning') {
    return 'bg-dashboard-warning shadow-[0_0_12px_oklch(0.77_0.085_82_/_0.42)]';
  }

  return 'bg-dashboard-info shadow-[0_0_12px_oklch(0.7_0.06_235_/_0.42)]';
}
