import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
  content: ReactNode;
}

export function Tooltip({ children, className, content, ...props }: TooltipProps) {
  return (
    <span className={cx('group relative inline-flex', className)} {...props}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-dropdown mb-2 hidden -translate-x-1/2 rounded-md border border-dashboard-border-subtle bg-dashboard-bg-surface-elevated px-2 py-1 text-caption text-dashboard-text-primary shadow-elevation-2 group-hover:block group-focus-within:block">
        {content}
      </span>
    </span>
  );
}
