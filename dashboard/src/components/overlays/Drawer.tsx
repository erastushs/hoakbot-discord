import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface DrawerProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  isOpen?: boolean;
  side?: 'left' | 'right';
  title?: ReactNode;
}

export function Drawer({ children, className, isOpen = false, side = 'right', title, ...props }: DrawerProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={cx(
        'fixed inset-y-0 z-drawer w-80 border-dashboard-border-subtle bg-dashboard-bg-surface-elevated p-5 shadow-elevation-3 transition duration-sidebar',
        side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
        isOpen ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full',
        className,
      )}
      {...props}
    >
      {title ? <h2 className="text-heading-m text-dashboard-text-primary">{title}</h2> : null}
      <div className={title ? 'mt-4' : undefined}>{children}</div>
    </aside>
  );
}
