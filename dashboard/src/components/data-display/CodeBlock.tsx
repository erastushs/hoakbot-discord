import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function CodeBlock({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <pre className={cx('overflow-x-auto rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-app p-4 text-code text-dashboard-text-secondary', className)}>
      <code {...props} />
    </pre>
  );
}
