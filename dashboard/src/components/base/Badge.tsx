import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-dashboard-border-subtle bg-dashboard-bg-muted text-dashboard-text-secondary',
  accent: 'border-dashboard-accent-primary/40 bg-dashboard-accent-muted text-dashboard-accent-hover',
  success: 'border-dashboard-success/40 bg-dashboard-success/10 text-dashboard-success',
  warning: 'border-dashboard-warning/40 bg-dashboard-warning/10 text-dashboard-warning',
  danger: 'border-dashboard-danger/40 bg-dashboard-danger/10 text-dashboard-danger',
  info: 'border-dashboard-info/40 bg-dashboard-info/10 text-dashboard-info',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-medium shadow-elevation-0',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
