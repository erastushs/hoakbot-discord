import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-dashboard-info/40 bg-dashboard-info/10 text-dashboard-info',
  success: 'border-dashboard-success/40 bg-dashboard-success/10 text-dashboard-success',
  warning: 'border-dashboard-warning/40 bg-dashboard-warning/10 text-dashboard-warning',
  danger: 'border-dashboard-danger/40 bg-dashboard-danger/10 text-dashboard-danger',
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  description?: ReactNode;
  title?: ReactNode;
  variant?: AlertVariant;
}

export function Alert({ className, description, title, variant = 'info', ...props }: AlertProps) {
  return (
    <div className={cx('rounded-lg border p-4', variantClasses[variant], className)} role="status" {...props}>
      {title ? <p className="text-small font-semibold">{title}</p> : null}
      {description ? <p className="mt-1 text-small opacity-90">{description}</p> : null}
    </div>
  );
}
