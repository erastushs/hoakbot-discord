import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cx('relative overflow-hidden rounded-md bg-dashboard-bg-muted shadow-elevation-0 motion-safe:animate-pulse', className)}
      {...props}
    />
  );
}
