import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('animate-pulse rounded-md bg-dashboard-bg-muted', className)} {...props} />;
}
