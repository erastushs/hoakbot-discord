import { Moon } from 'lucide-react';

import { useTheme } from './ThemeProvider.js';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb.js';

export function TopNavigation({ breadcrumb }: { breadcrumb: BreadcrumbItem[] }) {
  const theme = useTheme();
  const pageTitle = breadcrumb.at(-1)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-sticky flex h-header items-center justify-between border-b border-dashboard-border-subtle bg-dashboard-bg-app/90 px-4 backdrop-blur tablet:px-6 desktop:px-8">
      <div className="min-w-0">
        <Breadcrumb items={breadcrumb} />
        <div className="mt-1 flex min-w-0 items-center gap-3">
          <h1 className="truncate text-body font-semibold text-dashboard-text-primary">{pageTitle}</h1>
          <span className="hidden rounded-full border border-dashboard-border-subtle bg-dashboard-bg-surface px-2 py-0.5 text-caption font-medium text-dashboard-text-tertiary tablet:inline-flex">Workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-tertiary transition duration-hover ease-dashboard hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
          onClick={theme.toggleTheme}
          type="button"
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
