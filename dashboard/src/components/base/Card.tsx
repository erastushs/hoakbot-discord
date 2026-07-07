import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type CardVariant = 'standard' | 'interactive' | 'elevated' | 'muted' | 'danger';

const variantClasses: Record<CardVariant, string> = {
  standard: 'border-dashboard-border-subtle bg-dashboard-bg-surface shadow-elevation-1',
  interactive:
    'border-dashboard-border-subtle bg-dashboard-bg-surface shadow-elevation-1 transition duration-hover hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated hover:shadow-elevation-2',
  elevated: 'border-dashboard-border-subtle bg-dashboard-bg-surface-elevated shadow-elevation-2',
  muted: 'border-dashboard-border-subtle bg-dashboard-bg-muted shadow-elevation-0',
  danger: 'border-dashboard-danger/50 bg-dashboard-danger/10 shadow-elevation-1',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'standard', ...props }: CardProps) {
  return <div className={cx('rounded-lg border p-5', variantClasses[variant], className)} {...props} />;
}
