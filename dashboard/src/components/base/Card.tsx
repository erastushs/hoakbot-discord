import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type CardVariant = 'standard' | 'interactive' | 'elevated' | 'muted' | 'danger';

const variantClasses: Record<CardVariant, string> = {
  standard: 'border-dashboard-border-subtle bg-dashboard-bg-surface/82 shadow-elevation-1 backdrop-blur-xl',
  interactive:
    'border-dashboard-border-subtle bg-dashboard-bg-surface/82 shadow-elevation-1 backdrop-blur-xl hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated/90 hover:shadow-elevation-2 motion-safe:hover:-translate-y-px',
  elevated: 'border-dashboard-border-subtle bg-dashboard-bg-surface-elevated/90 shadow-elevation-2 backdrop-blur-xl',
  muted: 'border-dashboard-border-subtle bg-dashboard-bg-muted/55 shadow-elevation-0 backdrop-blur-xl',
  danger: 'border-dashboard-danger/38 bg-dashboard-danger/10 shadow-elevation-1 backdrop-blur-xl',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'standard', ...props }: CardProps) {
  return <div className={cx('rounded-2xl border p-5 transition duration-hover ease-dashboard', variantClasses[variant], className)} {...props} />;
}
