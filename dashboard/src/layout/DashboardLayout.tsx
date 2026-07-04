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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex">
        <Sidebar manifests={manifests} />
        <div className="min-w-0 flex-1">
          <TopNavigation breadcrumb={breadcrumb} />
          <main className="mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
