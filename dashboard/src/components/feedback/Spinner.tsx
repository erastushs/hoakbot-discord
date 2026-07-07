import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export function Spinner({ className, label = 'Loading', ...props }: SpinnerProps) {
  return (
    <span className={cx('inline-flex items-center gap-2 text-small text-dashboard-text-secondary', className)} role="status" {...props}>
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-dashboard-border-strong border-t-dashboard-accent-primary" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
