import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

const variantClasses: Record<ToastVariant, string> = {
  info: 'border-dashboard-info/40',
  success: 'border-dashboard-success/40',
  warning: 'border-dashboard-warning/40',
  danger: 'border-dashboard-danger/40',
};

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  description?: ReactNode;
  title: ReactNode;
  variant?: ToastVariant;
}

export function Toast({ className, description, title, variant = 'info', ...props }: ToastProps) {
  return (
    <div className={cx('rounded-lg border bg-dashboard-bg-surface-elevated p-4 text-dashboard-text-primary shadow-elevation-3', variantClasses[variant], className)} role="status" {...props}>
      <p className="text-small font-semibold">{title}</p>
      {description ? <p className="mt-1 text-small text-dashboard-text-secondary">{description}</p> : null}
    </div>
  );
}
