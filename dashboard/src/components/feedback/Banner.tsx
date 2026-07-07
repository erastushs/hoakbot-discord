import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function Banner({ actions, className, description, title, ...props }: BannerProps) {
  return (
    <div
      className={cx('flex flex-col gap-3 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-muted p-4 tablet:flex-row tablet:items-center tablet:justify-between', className)}
      role="status"
      {...props}
    >
      <div>
        <p className="text-small font-semibold text-dashboard-text-primary">{title}</p>
        {description ? <p className="mt-1 text-small text-dashboard-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
