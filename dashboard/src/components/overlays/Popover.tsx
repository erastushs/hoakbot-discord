import type { DetailsHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface PopoverProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'content'> {
  content: ReactNode;
  trigger: ReactNode;
}

export function Popover({ className, content, trigger, ...props }: PopoverProps) {
  return (
    <details className={cx('relative inline-block', className)} {...props}>
      <summary className="list-none cursor-pointer rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-dashboard-focus-ring">
        {trigger}
      </summary>
      <div className="absolute right-0 z-dropdown mt-2 min-w-56 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface-elevated p-3 shadow-elevation-2">
        {content}
      </div>
    </details>
  );
}
