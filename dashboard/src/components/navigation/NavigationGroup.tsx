import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface NavigationGroupProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
}

export function NavigationGroup({ children, className, title, ...props }: NavigationGroupProps) {
  return (
    <section className={cx('grid gap-2', className)} {...props}>
      <h2 className="px-3 text-caption font-semibold uppercase tracking-[0.18em] text-dashboard-text-tertiary">{title}</h2>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}
