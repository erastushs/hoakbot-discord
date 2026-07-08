import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type CardVariant = 'standard' | 'interactive' | 'elevated' | 'muted' | 'danger';

const variantClasses: Record<CardVariant, string> = {
  standard: 'border-white/5 bg-dashboard-bg-card/88 shadow-elevation-1 backdrop-blur-xl hover:shadow-elevation-2 motion-safe:hover:-translate-y-px',
  interactive:
    'cursor-pointer border-white/5 bg-dashboard-bg-card/88 shadow-elevation-1 backdrop-blur-xl hover:border-dashboard-accent-primary/40 hover:bg-dashboard-bg-surface-elevated/82 hover:shadow-elevation-2 motion-safe:hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring',
  elevated: 'border-white/6 bg-dashboard-bg-surface-elevated/88 shadow-elevation-2 backdrop-blur-xl',
  muted: 'border-white/4 bg-dashboard-bg-section/70 shadow-elevation-0 backdrop-blur-xl',
  danger: 'border-dashboard-danger/38 bg-dashboard-danger/10 shadow-elevation-1 backdrop-blur-xl',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'standard', ...props }: CardProps) {
  return <div className={cx('rounded-xl border p-5 transition duration-hover ease-dashboard', variantClasses[variant], className)} {...props} />;
}
