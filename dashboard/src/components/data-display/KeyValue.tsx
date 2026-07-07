import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface KeyValueProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
}

export function KeyValue({ className, label, value, ...props }: KeyValueProps) {
  return (
    <div className={cx('grid gap-1 border-b border-dashboard-border-subtle py-3 last:border-b-0', className)} {...props}>
      <dt className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">{label}</dt>
      <dd className="text-small text-dashboard-text-primary">{value}</dd>
    </div>
  );
}
