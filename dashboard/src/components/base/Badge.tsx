import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-dashboard-border-subtle bg-dashboard-bg-muted/58 text-dashboard-text-secondary',
  accent: 'border-dashboard-accent-primary/32 bg-dashboard-accent-muted text-dashboard-accent-hover',
  success: 'border-dashboard-success/32 bg-dashboard-success/8 text-dashboard-success',
  warning: 'border-dashboard-warning/32 bg-dashboard-warning/8 text-dashboard-warning',
  danger: 'border-dashboard-danger/32 bg-dashboard-danger/8 text-dashboard-danger',
  info: 'border-dashboard-info/32 bg-dashboard-info/8 text-dashboard-info',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-medium shadow-elevation-0 backdrop-blur-xl',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
