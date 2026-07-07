import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type SurfaceVariant = 'default' | 'muted' | 'elevated';

const variantClasses: Record<SurfaceVariant, string> = {
  default: 'border-dashboard-border-subtle bg-dashboard-bg-surface shadow-elevation-1',
  muted: 'border-dashboard-border-subtle bg-dashboard-bg-muted shadow-elevation-0',
  elevated: 'border-dashboard-border-subtle bg-dashboard-bg-surface-elevated shadow-elevation-2',
};

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
}

export function Surface({ className, variant = 'default', ...props }: SurfaceProps) {
  return <div className={cx('rounded-lg border', variantClasses[variant], className)} {...props} />;
}
