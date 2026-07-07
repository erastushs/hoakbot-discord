import type { HTMLAttributes, ReactNode } from 'react';

import { Button } from '../base/Button.js';
import { cx } from '../utils.js';

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  action?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function ErrorState({ action, className, description, title, ...props }: ErrorStateProps) {
  return (
    <div className={cx('grid justify-items-center gap-3 rounded-lg border border-dashboard-danger/40 bg-dashboard-danger/10 p-8 text-center', className)} role="alert" {...props}>
      <p className="text-heading-m text-dashboard-danger">{title}</p>
      {description ? <p className="max-w-md text-small text-dashboard-text-secondary">{description}</p> : null}
      {typeof action === 'string' ? <Button variant="danger">{action}</Button> : action}
    </div>
  );
}
