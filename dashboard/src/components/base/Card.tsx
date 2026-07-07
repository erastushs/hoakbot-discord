import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type CardVariant = 'standard' | 'interactive' | 'elevated' | 'muted' | 'danger';

const variantClasses: Record<CardVariant, string> = {
  standard: 'border-dashboard-border-subtle bg-dashboard-bg-surface shadow-elevation-0',
  interactive:
    'border-dashboard-border-subtle bg-dashboard-bg-surface shadow-elevation-0 hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated hover:shadow-elevation-1 motion-safe:hover:-translate-y-px',
  elevated: 'border-dashboard-border-subtle bg-dashboard-bg-surface-elevated shadow-elevation-1',
  muted: 'border-dashboard-border-subtle bg-dashboard-bg-muted/70 shadow-elevation-0',
  danger: 'border-dashboard-danger/40 bg-dashboard-danger/8 shadow-elevation-0',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'standard', ...props }: CardProps) {
  return <div className={cx('rounded-xl border p-5 transition duration-hover ease-dashboard', variantClasses[variant], className)} {...props} />;
}
