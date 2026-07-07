import type { ReactNode } from 'react';

import type { ModuleManifest } from '../contracts.js';
import { Sidebar } from './Sidebar.js';
import { TopNavigation } from './TopNavigation.js';
import type { BreadcrumbItem } from './Breadcrumb.js';

export function DashboardLayout({
  children,
  manifests,
  breadcrumb,
}: {
  children: ReactNode;
  manifests: ModuleManifest[];
  breadcrumb: BreadcrumbItem[];
}) {
  return (
    <div className="min-h-screen bg-dashboard-bg-app text-dashboard-text-primary">
      <div className="min-h-screen lg:flex">
        <Sidebar manifests={manifests} />
        <div className="min-w-0 flex-1 lg:pl-sidebar">
          <TopNavigation breadcrumb={breadcrumb} />
          <main className="min-h-[calc(100vh-var(--header-height))] overflow-y-auto px-4 py-6 tablet:px-6 desktop:px-8">
            <div className="mx-auto w-full max-w-page motion-safe:animate-[dashboard-page-in_var(--duration-page)_var(--ease-dashboard)]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
