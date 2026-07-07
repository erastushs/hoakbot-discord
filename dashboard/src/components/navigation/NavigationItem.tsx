import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface NavigationItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: ReactNode;
  isActive?: boolean;
}

export function NavigationItem({ children, className, icon, isActive = false, ...props }: NavigationItemProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      className={cx(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-small font-medium transition duration-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-dashboard-focus-ring',
        isActive
          ? 'bg-dashboard-bg-muted text-dashboard-text-primary'
          : 'text-dashboard-text-secondary hover:bg-dashboard-bg-muted hover:text-dashboard-text-primary',
        className,
      )}
      {...props}
    >
      {icon ? <span className="grid h-5 w-5 place-items-center text-dashboard-text-tertiary">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </a>
  );
}
