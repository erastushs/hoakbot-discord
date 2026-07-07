import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
        className={cx('relative overflow-hidden rounded-xl bg-dashboard-bg-muted/58 shadow-elevation-0 motion-safe:animate-pulse', className)}
      {...props}
    />
  );
}
