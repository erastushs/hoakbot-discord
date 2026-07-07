import { Boxes, Circle, Home, LogOut } from 'lucide-react';
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
    <aside className="fixed inset-y-0 left-0 z-sticky hidden w-sidebar flex-col border-r border-white/6 bg-dashboard-bg-sidebar/62 px-2.5 py-3.5 backdrop-blur-2xl desktop:flex">
      <a
        className="flex h-9 items-center gap-2 rounded-lg px-2 text-small font-semibold text-dashboard-text-primary transition duration-hover ease-dashboard hover:bg-dashboard-bg-muted/48 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
        href="/"
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface-elevated/62 text-dashboard-text-primary">
          <Boxes className="h-4 w-4" />
        </span>
        <span className="tracking-tight">Hoak Dashboard</span>
      </a>

      <nav aria-label="Primary" className="mt-6 space-y-5 overflow-y-auto pr-1">
        <SidebarGroup title="Dashboard">
          <SidebarLink active={currentPath === '/'} href="/" icon={<Home className="h-4 w-4" />} label="Dashboard" />
        </SidebarGroup>

        <SidebarGroup title="Modules">
          <nav aria-label="Modules" className="space-y-1">
            {groupManifests(manifests).flatMap(([, entries]) =>
              entries.map((manifest) => (
                <SidebarLink
                  href={`/modules/${encodeURIComponent(manifest.id)}`}
                  icon={<Circle className="h-3 w-3 fill-current" />}
                  active={currentPath === `/modules/${encodeURIComponent(manifest.id)}`}
                  key={manifest.id}
                  label={manifest.name}
                />
              )),
            )}
          </nav>
        </SidebarGroup>
      </nav>

      <div className="mt-auto space-y-2.5 pt-3">
        <GuildSwitcher />
        <div className="flex w-full items-center gap-2.5 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface/48 p-2 text-left backdrop-blur-xl">
          {auth.user?.avatarUrl ? <img alt="" className="h-8 w-8 rounded-full ring-1 ring-white/10" src={auth.user.avatarUrl} /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-dashboard-bg-muted/80 text-caption font-semibold text-dashboard-text-secondary ring-1 ring-white/10">{userInitial}</span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-medium text-dashboard-text-primary">{userName}</span>
            <span className="block truncate text-caption text-dashboard-text-tertiary">Signed in</span>
          </span>
          <button
            aria-label="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-dashboard-text-tertiary transition duration-hover ease-dashboard hover:bg-dashboard-bg-muted/58 hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
            onClick={() => void auth.signOut()}
            type="button"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2 className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.17em] text-dashboard-text-tertiary">{title}</h2>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  );
}

function SidebarLink({ active = false, href, icon, label }: { active?: boolean; href: string; icon: ReactNode; label: string }) {
  return (
    <a
      aria-current={active ? 'page' : undefined}
        className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.8125rem] font-medium transition duration-hover ease-dashboard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring ${
        active
          ? 'border border-white/6 bg-dashboard-bg-surface-elevated/56 text-dashboard-text-primary'
          : 'border border-transparent text-dashboard-text-secondary hover:bg-dashboard-bg-muted/48 hover:text-dashboard-text-primary focus-visible:bg-dashboard-bg-muted'
      }`}
      href={href}
    >
      <span className={`grid h-4.5 w-4.5 place-items-center transition duration-hover ${active ? 'text-dashboard-accent-hover' : 'text-dashboard-text-tertiary group-hover:text-dashboard-text-primary'}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  );
}
