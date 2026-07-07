import type { HTMLAttributes, ReactNode } from 'react';

import { Button } from '../base/Button.js';
import { cx } from '../utils.js';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  action?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function EmptyState({ action, className, description, title, ...props }: EmptyStateProps) {
  return (
    <div className={cx('grid justify-items-center gap-3 rounded-lg border border-dashed border-dashboard-border-subtle bg-dashboard-bg-surface p-8 text-center', className)} {...props}>
      <p className="text-heading-m text-dashboard-text-primary">{title}</p>
      {description ? <p className="max-w-md text-small text-dashboard-text-secondary">{description}</p> : null}
      {typeof action === 'string' ? <Button variant="secondary">{action}</Button> : action}
    </div>
  );
}
