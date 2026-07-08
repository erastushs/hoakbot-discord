import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx('grid gap-4 rounded-2xl bg-dashboard-bg-section/54 p-4 shadow-elevation-1 backdrop-blur-xl tablet:p-5', className)} {...props} />;
}
