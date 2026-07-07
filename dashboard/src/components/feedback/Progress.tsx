import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  value: number;
}

export function Progress({ className, label, value, ...props }: ProgressProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cx('grid gap-2', className)} {...props}>
      {label ? <div className="flex justify-between text-caption text-dashboard-text-secondary"><span>{label}</span><span>{normalizedValue}%</span></div> : null}
      <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={normalizedValue} className="h-2 overflow-hidden rounded-full bg-dashboard-bg-muted" role="progressbar">
        <div className="h-full rounded-full bg-dashboard-accent-primary transition-all duration-page" style={{ width: `${normalizedValue}%` }} />
      </div>
    </div>
  );
}
