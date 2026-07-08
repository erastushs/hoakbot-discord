import { ChevronDown, Home, LogOut } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { GuildSwitcher } from '../guilds/GuildSwitcher.js';
import type { ModuleManifest } from '../contracts.js';
import { useAuth } from '../auth/AuthContext.js';
import { Avatar, Skeleton } from '../components/index.js';
import { BotAvatar } from './BotAvatar.js';

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

export function Sidebar({ isLoading = false, manifests }: { isLoading?: boolean; manifests: ModuleManifest[] }) {
  const auth = useAuth();
  const currentPath = window.location.pathname;
  const displayName = auth.user?.displayName ?? auth.user?.username;
  const username = auth.user?.username ?? auth.user?.id;
  const userInitial = displayName?.trim().charAt(0).toUpperCase() || 'H';
  const moduleGroups = groupManifests(manifests);
  const showModuleSkeletons = isLoading && moduleGroups.length === 0;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    administration: false,
    dashboard: true,
    modules: true,
    settings: false,
  });

  function toggleGroup(key: string) {
    setExpandedGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-sticky hidden w-sidebar flex-col border-r border-white/8 bg-dashboard-bg-sidebar/90 px-2.5 py-3.5 shadow-elevation-2 backdrop-blur-2xl desktop:flex">
      <a
        className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-small font-semibold text-dashboard-text-primary transition duration-hover ease-dashboard hover:bg-dashboard-accent-muted/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
        href="/"
      >
        <BotAvatar className="rounded-lg ring-1 ring-white/10" />
        <span className="tracking-tight">Hoak Dashboard</span>
      </a>

      <nav aria-label="Primary" className="mt-6 space-y-5 overflow-y-auto pr-1">
        <SidebarGroup expanded={expandedGroups.dashboard} groupKey="dashboard" onToggle={toggleGroup} title="Dashboard">
          <SidebarLink active={currentPath === '/'} href="/" icon={<Home className="h-4 w-4" />} label="Dashboard" />
        </SidebarGroup>

        {showModuleSkeletons || moduleGroups.length > 0 ? (
          <SidebarGroup expanded={expandedGroups.modules} groupKey="modules" onToggle={toggleGroup} title="Modules">
            {showModuleSkeletons ? (
              <div aria-hidden className="space-y-1 px-2 py-1">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-10/12" />
                <Skeleton className="h-7 w-11/12" />
              </div>
            ) : (
              <nav aria-label="Modules" className="space-y-1">
                {moduleGroups.flatMap(([, entries]) =>
                  entries.map((manifest) => (
                    <SidebarLink
                      href={`/modules/${encodeURIComponent(manifest.id)}`}
                      active={currentPath === `/modules/${encodeURIComponent(manifest.id)}`}
                      key={manifest.id}
                      label={manifest.name}
                    />
                  )),
                )}
              </nav>
            )}
          </SidebarGroup>
        ) : null}

        <SidebarGroup expanded={expandedGroups.administration} groupKey="administration" onToggle={toggleGroup} title="Administration" />

        <SidebarGroup expanded={expandedGroups.settings} groupKey="settings" onToggle={toggleGroup} title="Settings" />
      </nav>

      <div className="mt-auto space-y-2.5 pt-3">
        <GuildSwitcher />
        <div className="flex w-full items-center gap-2.5 rounded-lg border border-white/6 bg-dashboard-bg-page/56 p-2 text-left shadow-elevation-1 backdrop-blur-xl">
          {auth.status === 'loading' ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <span className="grid min-w-0 flex-1 gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </span>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </>
          ) : displayName ? (
            <>
              <Avatar alt={displayName} className="ring-1 ring-white/10" fallback={userInitial} src={auth.user?.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-medium text-dashboard-text-primary">{displayName}</span>
                {username ? <span className="block truncate text-caption text-dashboard-text-tertiary">{username}</span> : null}
              </span>
              <button
                aria-label="Sign out"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-dashboard-text-tertiary transition duration-hover ease-dashboard hover:bg-dashboard-accent-muted/48 hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
                onClick={() => void auth.signOut()}
                type="button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SidebarGroup({ children, expanded, groupKey, onToggle, title }: { children?: ReactNode; expanded: boolean; groupKey: string; onToggle(groupKey: string): void; title: string }) {
  const contentId = `sidebar-${groupKey}-content`;

  if (!children) {
    return null;
  }

  return (
    <section>
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-left text-[0.65rem] font-semibold uppercase tracking-[0.17em] text-dashboard-text-tertiary transition duration-hover ease-dashboard hover:bg-dashboard-accent-muted/32 hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
        onClick={() => onToggle(groupKey)}
        type="button"
      >
        <span>{title}</span>
        <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition duration-hover ease-dashboard ${expanded ? 'rotate-0' : '-rotate-90'}`} />
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-hover ease-dashboard ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        id={contentId}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-2 space-y-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

function SidebarLink({ active = false, href, icon, label }: { active?: boolean; href: string; icon?: ReactNode; label: string }) {
  return (
    <a
      aria-current={active ? 'page' : undefined}
      className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-[0.8125rem] font-medium transition duration-hover ease-dashboard motion-safe:hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring ${
        active
          ? 'border-dashboard-accent-primary/42 bg-dashboard-accent-muted/58 text-dashboard-text-primary shadow-elevation-1'
          : 'border-transparent bg-dashboard-bg-page/28 text-dashboard-text-secondary hover:border-dashboard-accent-primary/28 hover:bg-dashboard-accent-muted/32 hover:text-dashboard-text-primary focus-visible:bg-dashboard-accent-muted/36'
      }`}
      href={href}
    >
      {icon ? <span className={`grid h-4.5 w-4.5 place-items-center transition duration-hover ${active ? 'text-dashboard-accent-hover' : 'text-dashboard-text-tertiary group-hover:text-dashboard-accent-hover'}`}>{icon}</span> : null}
      <span className="truncate">{label}</span>
    </a>
  );
}
