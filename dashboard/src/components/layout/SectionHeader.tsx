import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function SectionHeader({ actions, className, description, title, ...props }: SectionHeaderProps) {
  return (
    <div className={cx('flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between', className)} {...props}>
      <div className="min-w-0">
        <h2 className="text-heading-m text-dashboard-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-small text-dashboard-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
