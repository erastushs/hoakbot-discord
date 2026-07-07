import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb.js';

export function TopNavigation({ breadcrumb }: { breadcrumb: BreadcrumbItem[] }) {
  const pageTitle = breadcrumb.at(-1)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-sticky flex h-header items-center border-b border-white/8 bg-dashboard-bg-app/62 px-4 backdrop-blur-2xl tablet:px-6 desktop:px-10">
      <div className="min-w-0">
        <Breadcrumb items={breadcrumb} />
        <h1 className="mt-1 truncate text-body font-semibold text-dashboard-text-primary">{pageTitle}</h1>
      </div>
    </header>
  );
}
