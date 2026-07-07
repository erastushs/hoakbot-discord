import { Bell, Command, LogOut, Moon, Search } from 'lucide-react';

import { useAuth } from '../auth/AuthContext.js';
import { useTheme } from './ThemeProvider.js';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb.js';

export function TopNavigation({ breadcrumb }: { breadcrumb: BreadcrumbItem[] }) {
  const auth = useAuth();
  const theme = useTheme();
  const pageTitle = breadcrumb.at(-1)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-sticky flex min-h-header items-center justify-between border-b border-dashboard-border-subtle bg-dashboard-bg-app/90 px-4 backdrop-blur tablet:px-6 desktop:px-8">
      <div className="min-w-0">
        <Breadcrumb items={breadcrumb} />
        <div className="mt-1 flex min-w-0 items-center gap-3">
          <h1 className="truncate text-heading-m text-dashboard-text-primary">{pageTitle}</h1>
          <span className="hidden rounded-full border border-dashboard-border-subtle px-2 py-0.5 text-caption font-medium text-dashboard-text-tertiary tablet:inline-flex">
            Workspace
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Search modules and settings"
          className="hidden h-9 items-center gap-2 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface px-3 text-small text-dashboard-text-tertiary transition duration-hover hover:border-dashboard-border-strong hover:text-dashboard-text-primary tablet:inline-flex"
          type="button"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
        <button
          aria-label="Open command palette"
          className="grid h-9 w-9 place-items-center rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-tertiary transition duration-hover hover:border-dashboard-border-strong hover:text-dashboard-text-primary"
          type="button"
        >
          <Command className="h-4 w-4" />
        </button>
        <button
          aria-label="Notifications"
          className="grid h-9 w-9 place-items-center rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-tertiary transition duration-hover hover:border-dashboard-border-strong hover:text-dashboard-text-primary"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-tertiary transition duration-hover hover:border-dashboard-border-strong hover:text-dashboard-text-primary"
          onClick={theme.toggleTheme}
          type="button"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          aria-label="Sign out"
          className="grid h-9 w-9 place-items-center rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-tertiary transition duration-hover hover:border-dashboard-border-strong hover:text-dashboard-text-primary"
          onClick={() => void auth.signOut()}
          type="button"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
