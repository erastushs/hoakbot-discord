import type { ReactNode } from 'react';

export function PageHeader({
  actions,
  children,
  description,
  status,
  title,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className="mb-6 border-b border-dashboard-border-subtle pb-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-heading-l text-dashboard-text-primary">{title}</h1>
            {status ? <div>{status}</div> : null}
          </div>
          {description ? <p className="mt-2 max-w-3xl text-small text-dashboard-text-secondary">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}
