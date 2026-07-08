import { Menu } from 'lucide-react';
import type { RefObject } from 'react';

import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb.js';

export function TopNavigation({
  breadcrumb,
  isSidebarOpen,
  menuButtonRef,
  onToggleSidebar,
  sidebarId,
}: {
  breadcrumb: BreadcrumbItem[];
  isSidebarOpen: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onToggleSidebar(): void;
  sidebarId: string;
}) {
  const pageTitle = breadcrumb.at(-1)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center gap-3 border-b border-white/8 bg-dashboard-bg-page/78 px-3 backdrop-blur-2xl tablet:h-header tablet:px-6 wide:px-10">
      <button
        aria-controls={sidebarId}
        aria-expanded={isSidebarOpen}
        aria-label="Open navigation menu"
        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/55 text-dashboard-text-primary shadow-elevation-0 transition duration-hover ease-dashboard hover:border-dashboard-accent-primary/45 hover:bg-dashboard-bg-control/78 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring wide:hidden"
        onClick={onToggleSidebar}
        ref={menuButtonRef}
        type="button"
      >
        <Menu aria-hidden className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <Breadcrumb items={breadcrumb} />
        <h1 className="mt-1 truncate text-body font-semibold text-dashboard-text-primary">{pageTitle}</h1>
      </div>
    </header>
  );
}
