import { Boxes, Circle, Home, ScrollText, Settings, Shield, SlidersHorizontal, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

import { GuildSwitcher } from '../guilds/GuildSwitcher.js';
import type { ModuleManifest } from '../contracts.js';
import { useAuth } from '../auth/AuthContext.js';

function groupManifests(manifests: ModuleManifest[]): Array<[string, ModuleManifest[]]> {
  const visible = manifests.filter((manifest) => !manifest.dashboard?.navigation.hidden);
  const groups = new Map<string, ModuleManifest[]>();

  for (const manifest of visible) {
    const section = manifest.dashboard?.navigation.sidebarSection ?? manifest.category;
    groups.set(section, [...(groups.get(section) ?? []), manifest]);
  }

  return [...groups.entries()].map(([section, entries]) => [
    section,
    entries.sort(
      (a, b) =>
        (a.dashboard?.navigation.sidebarPriority ?? Number.MAX_SAFE_INTEGER) -
        (b.dashboard?.navigation.sidebarPriority ?? Number.MAX_SAFE_INTEGER),
    ),
  ]);
}

export function Sidebar({ manifests }: { manifests: ModuleManifest[] }) {
  const auth = useAuth();
  const currentPath = window.location.pathname;
  const userName = auth.user?.displayName ?? auth.user?.username ?? 'Authenticated user';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'H';

  return (
    <aside className="fixed inset-y-0 left-0 z-sticky hidden w-sidebar flex-col border-r border-dashboard-border-subtle bg-dashboard-bg-sidebar/95 px-3 py-4 shadow-elevation-2 backdrop-blur desktop:flex">
      <a
        className="flex h-11 items-center gap-3 rounded-lg px-3 text-small font-semibold text-dashboard-text-primary transition duration-hover ease-dashboard hover:bg-dashboard-bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
        href="/"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-dashboard-accent-muted text-dashboard-accent-primary shadow-elevation-1">
          <Boxes className="h-4 w-4" />
        </span>
        <span className="tracking-tight">Hoak Dashboard</span>
      </a>

      <nav aria-label="Primary" className="mt-6 space-y-6 overflow-y-auto pr-1">
        <SidebarGroup title="Dashboard">
          <SidebarLink active={currentPath === '/'} href="/" icon={<Home className="h-4 w-4" />} label="Dashboard" />
        </SidebarGroup>

        <SidebarGroup title="Modules">
          <nav aria-label="Modules" className="space-y-1">
            {groupManifests(manifests).flatMap(([, entries]) =>
              entries.map((manifest) => (
                <SidebarLink
                  href={`/modules/${encodeURIComponent(manifest.id)}`}
                  icon={<Circle className="h-3 w-3" fill={manifest.color} style={{ color: manifest.color }} />}
                  active={currentPath === `/modules/${encodeURIComponent(manifest.id)}`}
                  key={manifest.id}
                  label={manifest.name}
                />
              )),
            )}
          </nav>
        </SidebarGroup>

        <SidebarGroup title="Administration">
          <SidebarPlaceholder icon={<ScrollText className="h-4 w-4" />} label="Audit Logs" />
          <SidebarPlaceholder icon={<Shield className="h-4 w-4" />} label="System" />
        </SidebarGroup>

        <SidebarGroup title="Settings">
          <SidebarPlaceholder icon={<UserRound className="h-4 w-4" />} label="Profile" />
          <SidebarPlaceholder icon={<Settings className="h-4 w-4" />} label="Settings" />
        </SidebarGroup>
      </nav>

      <div className="mt-auto space-y-3 border-t border-dashboard-border-subtle pt-4">
        <GuildSwitcher />
        <button
          className="flex w-full items-center gap-3 rounded-xl border border-dashboard-border-subtle bg-dashboard-bg-surface p-2 text-left transition duration-hover ease-dashboard hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated hover:shadow-elevation-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
          type="button"
        >
          {auth.user?.avatarUrl ? (
            <img alt="" className="h-9 w-9 rounded-full" src={auth.user.avatarUrl} />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-dashboard-accent-muted text-small font-semibold text-dashboard-accent-primary">
              {userInitial}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-medium text-dashboard-text-primary">{userName}</span>
            <span className="block truncate text-caption text-dashboard-text-tertiary">User menu</span>
          </span>
          <SlidersHorizontal className="h-4 w-4 text-dashboard-text-tertiary" />
        </button>
      </div>
    </aside>
  );
}

function SidebarGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2 className="px-3 text-caption font-semibold uppercase tracking-[0.18em] text-dashboard-text-tertiary">{title}</h2>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  );
}

function SidebarLink({ active = false, href, icon, label }: { active?: boolean; href: string; icon: ReactNode; label: string }) {
  return (
    <a
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-small font-medium transition duration-hover ease-dashboard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring ${
        active
          ? 'bg-dashboard-accent-muted text-dashboard-text-primary shadow-elevation-1'
          : 'text-dashboard-text-secondary hover:bg-dashboard-bg-muted hover:text-dashboard-text-primary focus-visible:bg-dashboard-bg-muted'
      }`}
      href={href}
    >
      <span className={`grid h-5 w-5 place-items-center transition duration-hover ${active ? 'text-dashboard-accent-hover' : 'text-dashboard-text-tertiary group-hover:text-dashboard-text-primary'}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  );
}

function SidebarPlaceholder({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      aria-disabled="true"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-small font-medium text-dashboard-text-disabled"
    >
      <span className="grid h-5 w-5 place-items-center">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
